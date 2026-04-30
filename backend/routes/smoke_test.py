"""
Smoke Test Routes + Synthetic Monitoring

- POST /api/system/smoke-test/run         — trigger smoke run (owner-only)
- GET  /api/system/smoke-test/last        — last cached run
- GET  /api/system/smoke-test/history     — recent runs (max 30)
- GET  /api/system/smoke-test/deploy-status  — quick deploy gate (deploy_safe boolean)

Background loop runs every 30 minutes and emails app_owner accounts on failure.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from auth_deps import get_current_user
from database import get_db
from services.smoke_test_runner import run_smoke_tests

router = APIRouter(prefix="/api/system/smoke-test", tags=["smoke-test"])


def _require_owner(current_user: dict):
    role = (current_user or {}).get("role")
    if role not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="هذه الميزة متاحة للمالك فقط")
    return current_user


async def _persist(db, summary: dict, source: str = "manual"):
    doc = {**summary, "source": source}
    try:
        await db.smoke_test_runs.insert_one(dict(doc))
    except Exception as e:
        logging.warning(f"smoke persist failed: {e}")
    return doc


@router.post("/run")
async def run_now(current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    db = get_db()
    summary = await run_smoke_tests()
    summary.pop("_id", None)
    await _persist(db, summary, source=f"manual:{current_user.get('username')}")
    summary.pop("_id", None)
    # Also feed Performance Budget Tracker so manual runs contribute to baselines
    try:
        from services.perf_budget import record_samples, recompute_baselines, detect_regressions
        samples = [{"endpoint": r["name"], "ms": r.get("ms"), "status_code": r.get("status_code"), "passed": r.get("passed")} for r in summary.get("results", [])]
        await record_samples(samples, source="manual_run")
        await recompute_baselines()
        await detect_regressions()
    except Exception as e:
        import logging as _lg
        _lg.warning(f"perf budget update on manual run failed: {e}")
    return summary


@router.get("/last")
async def last(current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    db = get_db()
    doc = await db.smoke_test_runs.find_one({}, {"_id": 0}, sort=[("started_at", -1)])
    return doc or {"deploy_safe": None, "results": [], "message": "لم يتم تشغيل أي smoke test بعد."}


@router.get("/history")
async def history(limit: int = 30, current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    db = get_db()
    cursor = db.smoke_test_runs.find({}, {"_id": 0, "results": 0}).sort("started_at", -1).limit(min(limit, 100))
    items = []
    async for doc in cursor:
        items.append(doc)
    return {"runs": items, "count": len(items)}


@router.get("/deploy-status")
async def deploy_status(current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    db = get_db()
    doc = await db.smoke_test_runs.find_one({}, {"_id": 0, "deploy_safe": 1, "passed": 1, "failed": 1, "started_at": 1, "results": 1}, sort=[("started_at", -1)])
    if not doc:
        return {"deploy_safe": None, "stale": True, "message": "لم يتم تشغيل smoke test بعد."}
    failed_names = [r["name"] for r in (doc.get("results") or []) if not r.get("passed")]
    started = doc.get("started_at")
    stale = False
    try:
        last_dt = datetime.fromisoformat(started.replace("Z", "+00:00")) if isinstance(started, str) else started
        age_s = (datetime.now(timezone.utc) - last_dt).total_seconds()
        stale = age_s > 60 * 60 * 6  # 6 hours
    except Exception:
        stale = True
    return {
        "deploy_safe": bool(doc.get("deploy_safe")),
        "passed": doc.get("passed", 0),
        "failed": doc.get("failed", 0),
        "failed_tests": failed_names,
        "started_at": started,
        "stale": stale,
    }


# ---------------- Synthetic monitoring loop ----------------

async def _email_failures_to_owners(db, summary: dict):
    """Send email to all app_owner users when any test fails."""
    try:
        from email_service import EmailService  # lazy import
        owners = []
        async for u in db.users.find({"role": {"$in": ["app_owner", "super_admin"]}, "is_active": True}, {"_id": 0, "email": 1, "full_name": 1}):
            if u.get("email"):
                owners.append(u)
        if not owners:
            return 0
        failed = [r for r in summary.get("results", []) if not r.get("passed")]
        rows = "".join(
            f"<tr><td style='padding:6px 10px;border:1px solid #eee'>{r.get('name')}</td>"
            f"<td style='padding:6px 10px;border:1px solid #eee'>{r.get('category')}</td>"
            f"<td style='padding:6px 10px;border:1px solid #eee;color:#c00;font-weight:bold'>{r.get('status_code') or r.get('error') or 'fail'}</td>"
            f"<td style='padding:6px 10px;border:1px solid #eee'>{r.get('ms')}ms</td></tr>"
            for r in failed
        )
        html = f"""
<div dir='rtl' style='font-family:Arial,sans-serif;max-width:680px;margin:auto'>
  <div style='background:linear-gradient(135deg,#dc2626,#7f1d1d);color:#fff;padding:18px;border-radius:12px 12px 0 0'>
    <h2 style='margin:0'>🚨 Smoke Test Failed — لا تنشر التطبيق!</h2>
    <p style='margin:6px 0 0;opacity:.9;font-size:13px'>{summary.get('failed')} اختبار من أصل {summary.get('total')} فشل</p>
  </div>
  <div style='background:#fff;padding:16px;border:1px solid #eee;border-top:0;border-radius:0 0 12px 12px'>
    <p>تم تشغيل smoke test تلقائياً وفشل بعض الاختبارات الحرجة. يجب تأجيل أي deployment حتى يتم إصلاحها.</p>
    <table style='border-collapse:collapse;width:100%;margin-top:12px;font-size:14px'>
      <thead><tr style='background:#fef2f2'>
        <th style='padding:6px 10px;border:1px solid #eee;text-align:right'>الاختبار</th>
        <th style='padding:6px 10px;border:1px solid #eee;text-align:right'>الفئة</th>
        <th style='padding:6px 10px;border:1px solid #eee;text-align:right'>الكود</th>
        <th style='padding:6px 10px;border:1px solid #eee;text-align:right'>الزمن</th>
      </tr></thead>
      <tbody>{rows}</tbody>
    </table>
    <p style='margin-top:14px;font-size:12px;color:#666'>المصدر: Synthetic Monitor (يعمل كل 30 دقيقة)</p>
  </div>
</div>"""
        sent = 0
        es = EmailService()
        for o in owners:
            try:
                await es.send_email(
                    to_email=o["email"],
                    subject=f"🚨 Smoke Test Failed ({summary.get('failed')}/{summary.get('total')}) — HomeMe",
                    html_content=html,
                )
                sent += 1
            except Exception as e:
                logging.warning(f"smoke alert email to {o.get('email')} failed: {e}")
        return sent
    except Exception as e:
        logging.warning(f"_email_failures_to_owners crashed: {e}")
        return 0


async def smoke_test_monitor_loop():
    """Background loop: run smoke tests every 30 minutes; alert on regression."""
    interval_s = 30 * 60
    last_failed_set: set[str] = set()
    while True:
        try:
            summary = await run_smoke_tests()
            db = get_db()
            await _persist(db, summary, source="auto:monitor")
            failed_now = {r["name"] for r in summary.get("results", []) if not r.get("passed")}
            new_failures = failed_now - last_failed_set
            if new_failures:
                sent = await _email_failures_to_owners(db, summary)
                logging.info(f"[smoke_monitor] {len(new_failures)} new failure(s); emailed {sent} owner(s).")
            elif failed_now:
                logging.info(f"[smoke_monitor] {len(failed_now)} ongoing failure(s) — no new alert.")
            else:
                logging.info("[smoke_monitor] All smoke tests pass.")
            last_failed_set = failed_now

            # Performance Budget Tracker — record samples + check regressions
            try:
                from services.perf_budget import record_samples, recompute_baselines, detect_regressions
                samples = [{"endpoint": r["name"], "ms": r.get("ms"), "status_code": r.get("status_code"), "passed": r.get("passed")} for r in summary.get("results", [])]
                await record_samples(samples, source="smoke_monitor")
                await recompute_baselines()
                regs = await detect_regressions()
                if regs["new_regressions"]:
                    await _email_perf_regressions_to_owners(db, regs["new_regressions"])
                    logging.info(f"[perf_budget] {len(regs['new_regressions'])} new regression(s); emailed owners.")
                elif regs["resolved"]:
                    logging.info(f"[perf_budget] {len(regs['resolved'])} regression(s) auto-resolved.")
            except Exception as e:
                logging.warning(f"[perf_budget] cycle failed: {e}")
        except Exception as e:
            logging.error(f"[smoke_monitor] loop iteration crashed: {e}")
        await asyncio.sleep(interval_s)


async def _email_perf_regressions_to_owners(db, regressions: list):
    """Send a single email per cycle listing newly-detected slow endpoints."""
    try:
        from email_service import EmailService
        owners = []
        async for u in db.users.find({"role": {"$in": ["app_owner", "super_admin"]}, "is_active": True}, {"_id": 0, "email": 1}):
            if u.get("email"):
                owners.append(u["email"])
        if not owners:
            return 0
        rows = "".join(
            f"<tr><td style='padding:6px 10px;border:1px solid #eee'>{r['endpoint']}</td>"
            f"<td style='padding:6px 10px;border:1px solid #eee;color:#c00;font-weight:bold'>{r['current_ms']}ms</td>"
            f"<td style='padding:6px 10px;border:1px solid #eee'>{r['p50']}ms</td>"
            f"<td style='padding:6px 10px;border:1px solid #eee'>{r['p95']}ms</td>"
            f"<td style='padding:6px 10px;border:1px solid #eee'>{r['threshold_ms']}ms</td></tr>"
            for r in regressions
        )
        html = f"""
<div dir='rtl' style='font-family:Arial,sans-serif;max-width:720px;margin:auto'>
  <div style='background:linear-gradient(135deg,#f59e0b,#b45309);color:#fff;padding:18px;border-radius:12px 12px 0 0'>
    <h2 style='margin:0'>⏱️ Performance Regression — {len(regressions)} endpoint أبطأ من الميزانية</h2>
    <p style='margin:6px 0 0;opacity:.9;font-size:13px'>Performance Budget Tracker اكتشف أن endpoints أصبحت أبطأ من المعتاد لـ 3 قياسات متتالية.</p>
  </div>
  <div style='background:#fff;padding:16px;border:1px solid #eee;border-top:0;border-radius:0 0 12px 12px'>
    <table style='border-collapse:collapse;width:100%;font-size:14px'>
      <thead><tr style='background:#fef3c7'>
        <th style='padding:6px 10px;border:1px solid #eee;text-align:right'>Endpoint</th>
        <th style='padding:6px 10px;border:1px solid #eee;text-align:right'>الزمن الحالي</th>
        <th style='padding:6px 10px;border:1px solid #eee;text-align:right'>p50 (المتوسط)</th>
        <th style='padding:6px 10px;border:1px solid #eee;text-align:right'>p95</th>
        <th style='padding:6px 10px;border:1px solid #eee;text-align:right'>الميزانية</th>
      </tr></thead>
      <tbody>{rows}</tbody>
    </table>
    <p style='margin-top:14px;font-size:12px;color:#666'>افتحي صفحة فحص صحة المسارات → بطاقة "ميزانية الأداء" لمتابعة التفاصيل.</p>
  </div>
</div>"""
        es = EmailService()
        sent = 0
        for em in owners:
            try:
                await es.send_email(to_email=em, subject=f"⏱️ Performance Regression ({len(regressions)}) — HomeMe", html_content=html)
                sent += 1
            except Exception as e:
                logging.warning(f"perf email to {em} failed: {e}")
        return sent
    except Exception as e:
        logging.warning(f"_email_perf_regressions_to_owners crashed: {e}")
        return 0
