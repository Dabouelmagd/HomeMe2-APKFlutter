"""
System Route Health — periodic + on-demand verification of every API route.

Provides:
  - GET  /api/system/route-health/list   → inventory (no calls; just route metadata)
  - POST /api/system/route-health/scan   → live scan of safe GET endpoints
  - GET  /api/system/route-health/last   → cached results from the last scan

Design choices:
  - Safety first: ONLY scan GET requests. POST/PUT/DELETE/PATCH are never invoked
    by the scanner because they could mutate data.
  - Path-param endpoints (e.g., `/api/users/{user_id}`) are smart-substituted
    using the caller's own context (their `id`, `compound_id`, `company_id`).
    If a param can't be resolved, the route is skipped (status: 'skipped').
  - Each call carries the caller's bearer token so RBAC behaves naturally.
  - Restricted to app_owner / super_admin.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
from typing import Optional
import re
import time
import asyncio
import logging

import httpx
from fastapi.routing import APIRoute

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api/system/route-health")
logger = logging.getLogger(__name__)

# Endpoints we never want to hit even with GET (heavy, noisy, or would email)
SKIP_PATTERNS = [
    r"^/api/system/route-health",        # never recursively scan ourselves
    r"^/api/health$",                    # already lightweight, separate path
    r"^/api/files/",                     # static files
    r"^/api/uploads/",
    r"^/api/ws",                         # websocket upgrade
    r"^/api/invite-drip/run",            # POST anyway, but defense-in-depth
    r"^/api/.*\.css$|^/api/.*\.js$",     # static
]

PATH_PARAM_RE = re.compile(r"\{([^}]+)\}")


def _classify(status_code: Optional[int], error: Optional[str]) -> str:
    if error:
        return "fail"
    if status_code is None:
        return "fail"
    if 200 <= status_code < 300:
        return "pass"
    if status_code in (401, 403):
        # Auth-related — usually means RBAC is correctly blocking; treat as warn
        return "warn"
    if status_code == 404:
        return "warn"
    if 400 <= status_code < 500:
        return "warn"
    return "fail"


def _is_skipped(path: str) -> bool:
    return any(re.search(p, path) for p in SKIP_PATTERNS)


def _resolve_params(path: str, ctx: dict) -> Optional[str]:
    """Substitute {param} placeholders using caller context. Returns None if any
    placeholder can't be safely resolved."""
    def repl(m):
        name = m.group(1).lower()
        # Map common placeholder names to context keys
        candidates = {
            "user_id": ctx.get("id"),
            "id": ctx.get("id"),
            "compound_id": ctx.get("compound_id"),
            "company_id": ctx.get("company_id"),
            "family_id": ctx.get("family_id"),
            "current_user_id": ctx.get("id"),
        }
        val = candidates.get(name)
        if val:
            return str(val)
        return "__UNRESOLVED__"

    resolved = PATH_PARAM_RE.sub(repl, path)
    if "__UNRESOLVED__" in resolved:
        return None
    return resolved


def _enumerate_routes(request: Request):
    """Yield (path, methods, tags, name) for every API route registered."""
    for r in request.app.routes:
        if not isinstance(r, APIRoute):
            continue
        if not r.path.startswith("/api/"):
            continue
        methods = {m.upper() for m in (r.methods or set())}
        if not methods:
            continue
        yield {
            "path": r.path,
            "methods": sorted(methods),
            "tags": list(r.tags or []),
            "name": r.name,
        }


@router.get("/list")
async def list_routes(request: Request, current_user: dict = Depends(get_current_user)):
    """Inventory of all API routes (no calls performed)."""
    if current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    routes = list(_enumerate_routes(request))
    routes.sort(key=lambda r: r["path"])
    by_method = {}
    for r in routes:
        for m in r["methods"]:
            by_method[m] = by_method.get(m, 0) + 1
    return {
        "total": len(routes),
        "by_method": by_method,
        "routes": routes,
    }


@router.post("/scan")
async def scan_routes(request: Request, current_user: dict = Depends(get_current_user)):
    """Run a live health scan over every safe GET endpoint."""
    if current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")

    db = get_db()

    # Resolve internal base URL — backend listens on 8001 inside the container
    base = "http://127.0.0.1:8001"
    auth_header = request.headers.get("authorization") or ""
    headers = {"Authorization": auth_header} if auth_header else {}

    routes = list(_enumerate_routes(request))
    results = []
    summary = {"total": 0, "pass": 0, "warn": 0, "fail": 0, "skipped": 0}

    async with httpx.AsyncClient(base_url=base, timeout=10.0) as client:
        # Bound concurrency to keep server load reasonable
        sem = asyncio.Semaphore(8)

        async def _check(route: dict):
            entry = {
                "path": route["path"],
                "methods": route["methods"],
                "tags": route["tags"],
                "name": route["name"],
                "tested_method": None,
                "tested_path": None,
                "status_code": None,
                "ms": None,
                "result": "skipped",
                "reason": None,
                "error": None,
            }

            # Skip non-GET — we only safely scan GETs
            if "GET" not in route["methods"]:
                entry["result"] = "skipped"
                entry["reason"] = "non-GET (mutation risk)"
                return entry
            if _is_skipped(route["path"]):
                entry["result"] = "skipped"
                entry["reason"] = "blacklisted"
                return entry

            # Resolve any path params using caller context
            target_path = route["path"]
            if PATH_PARAM_RE.search(target_path):
                resolved = _resolve_params(target_path, current_user)
                if not resolved:
                    entry["result"] = "skipped"
                    entry["reason"] = "unresolved path param"
                    return entry
                target_path = resolved

            entry["tested_method"] = "GET"
            entry["tested_path"] = target_path
            t0 = time.perf_counter()
            async with sem:
                try:
                    resp = await client.get(target_path, headers=headers)
                    entry["status_code"] = resp.status_code
                except httpx.ReadTimeout:
                    entry["error"] = "timeout (>10s)"
                except Exception as e:
                    entry["error"] = str(e)[:160]
            entry["ms"] = round((time.perf_counter() - t0) * 1000, 1)
            entry["result"] = _classify(entry["status_code"], entry["error"])
            return entry

        tasks = [_check(r) for r in routes]
        results = await asyncio.gather(*tasks)

    for r in results:
        summary["total"] += 1
        summary[r["result"]] = summary.get(r["result"], 0) + 1

    # Group by tag for the UI
    by_tag = {}
    for r in results:
        tag = (r["tags"][0] if r["tags"] else "untagged")
        by_tag.setdefault(tag, []).append(r)

    snapshot = {
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "ran_by": current_user.get("username") or current_user.get("id"),
        "summary": summary,
        "results": results,
    }

    # Persist (cap history at 50 entries)
    try:
        await db.route_health_history.insert_one({**snapshot})
        # Trim history beyond 50
        old = await db.route_health_history.find(
            {}, {"_id": 1, "ran_at": 1}
        ).sort("ran_at", -1).to_list(length=200)
        if len(old) > 50:
            ids_to_delete = [o["_id"] for o in old[50:]]
            await db.route_health_history.delete_many({"_id": {"$in": ids_to_delete}})
    except Exception as e:
        logger.error(f"route-health: persist failed: {e}")

    return {
        **summary,
        **snapshot,
        "by_tag_counts": {k: len(v) for k, v in by_tag.items()},
    }


@router.get("/last")
async def last_scan(current_user: dict = Depends(get_current_user)):
    """Return the most recent scan snapshot from history."""
    if current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    snap = await db.route_health_history.find_one(
        {}, {"_id": 0}, sort=[("ran_at", -1)]
    )
    if not snap:
        return {"ran_at": None, "summary": {"total": 0, "pass": 0, "warn": 0, "fail": 0, "skipped": 0}, "results": []}
    return snap


@router.get("/history")
async def scan_history(limit: int = 20, current_user: dict = Depends(get_current_user)):
    """Light list of past scans (without per-route detail) for trend tracking."""
    if current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    items = await db.route_health_history.find(
        {}, {"_id": 0, "ran_at": 1, "ran_by": 1, "summary": 1}
    ).sort("ran_at", -1).to_list(length=max(1, min(limit, 50)))
    return {"items": items, "total": len(items)}


@router.post("/trigger-daily-now")
async def trigger_daily_now(request: Request, current_user: dict = Depends(get_current_user)):
    """Manually trigger a 'daily-style' scan: compares against prev snapshot and
    emails owners if NEW failures are detected. Useful for testing the alert flow.

    Uses the caller's own bearer token so results are consistent with the
    interactive `POST /scan` endpoint (the daily auto-scheduler uses the
    internal helper with a synthesized owner token instead)."""
    if current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    prev = await db.route_health_history.find_one({}, sort=[("ran_at", -1)])
    prev_failed_paths = set(r["path"] for r in (prev.get("results") or []) if r.get("result") == "fail") if prev else set()

    # Re-use the same logic as POST /scan — pass caller token as auth
    base = "http://127.0.0.1:8001"
    auth_header = request.headers.get("authorization") or ""
    headers = {"Authorization": auth_header} if auth_header else {}

    routes = list(_enumerate_routes(request))
    results = []
    summary = {"total": 0, "pass": 0, "warn": 0, "fail": 0, "skipped": 0}

    async with httpx.AsyncClient(base_url=base, timeout=10.0) as client:
        sem = asyncio.Semaphore(8)

        async def _check(route: dict):
            entry = {
                "path": route["path"], "methods": route["methods"], "tags": route["tags"],
                "name": route["name"], "tested_method": None, "tested_path": None,
                "status_code": None, "ms": None, "result": "skipped", "reason": None, "error": None,
            }
            if "GET" not in route["methods"]:
                entry["result"] = "skipped"; entry["reason"] = "non-GET"; return entry
            if _is_skipped(route["path"]):
                entry["result"] = "skipped"; entry["reason"] = "blacklisted"; return entry
            target_path = route["path"]
            if PATH_PARAM_RE.search(target_path):
                resolved = _resolve_params(target_path, current_user)
                if not resolved:
                    entry["result"] = "skipped"; entry["reason"] = "unresolved param"; return entry
                target_path = resolved
            entry["tested_method"] = "GET"; entry["tested_path"] = target_path
            t0 = time.perf_counter()
            async with sem:
                try:
                    resp = await client.get(target_path, headers=headers)
                    entry["status_code"] = resp.status_code
                except httpx.ReadTimeout:
                    entry["error"] = "timeout (>10s)"
                except Exception as e:
                    entry["error"] = str(e)[:160]
            entry["ms"] = round((time.perf_counter() - t0) * 1000, 1)
            entry["result"] = _classify(entry["status_code"], entry["error"])
            return entry

        results = await asyncio.gather(*[_check(r) for r in routes])

    for r in results:
        summary["total"] += 1
        summary[r["result"]] = summary.get(r["result"], 0) + 1

    scan = {
        "summary": summary,
        "results": results,
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "ran_by": f"manual-trigger:{current_user.get('username')}",
    }
    await db.route_health_history.insert_one({**scan})

    all_failed = [r for r in scan["results"] if r["result"] == "fail"]
    new_failed = [r for r in all_failed if r["path"] not in prev_failed_paths]

    owners = []
    if new_failed:
        owners = await db.users.find(
            {"role": "app_owner", "is_active": True, "email": {"$exists": True, "$ne": None, "$ne": ""}},
            {"_id": 0, "email": 1, "full_name": 1},
        ).to_list(length=10)
        if owners:
            try:
                from email_service import EmailService
                es = EmailService()
                html = _build_regression_email(prev_failed_paths, new_failed, all_failed, scan["summary"])

                async def _send_all():
                    for o in owners:
                        try:
                            await es.send_email(
                                to_email=o["email"],
                                subject=f"⚠️ تنبيه: {len(new_failed)} مسار فاشل جديد في فحص اليوم",
                                html_content=html,
                                mailbox="main",
                            )
                        except Exception as ee:
                            logger.error(f"daily-trigger email failed: {ee}")

                # Fire-and-forget — preview blocks port 465; never block the response
                asyncio.create_task(_send_all())
            except Exception as ee:
                logger.error(f"daily-trigger email setup failed: {ee}")

    return {
        "ran_at": scan["ran_at"],
        "summary": scan["summary"],
        "new_failures": len(new_failed),
        "all_failures": len(all_failed),
        "new_failed_paths": [r["path"] for r in new_failed],
        "alert_owners_notified": len(owners) if new_failed else 0,
    }


# ============================================================================
# Daily auto-scan + regression alert
# ============================================================================
async def _run_internal_scan(app, db) -> dict:
    """Internal helper that mimics the public scan endpoint without auth.

    Used by the daily scheduler. Authenticates internally as the first
    app_owner user found, so RBAC-protected endpoints behave realistically.
    """
    # Pick an owner identity to test as (so RBAC behaves like a real run)
    owner = await db.users.find_one(
        {"role": {"$in": ["app_owner", "super_admin"]}, "is_active": True},
        {"_id": 0},
    )
    if not owner:
        return {"summary": {"total": 0, "pass": 0, "warn": 0, "fail": 0, "skipped": 0}, "results": []}

    # Build a JWT for this user using the same auth scheme as login
    try:
        from auth_deps import create_access_token
        token = create_access_token({"sub": owner["id"]})
    except Exception:
        token = None

    base = "http://127.0.0.1:8001"
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    routes = []
    for r in app.routes:
        if not isinstance(r, APIRoute):
            continue
        if not r.path.startswith("/api/"):
            continue
        methods = {m.upper() for m in (r.methods or set())}
        if not methods:
            continue
        routes.append({"path": r.path, "methods": sorted(methods), "tags": list(r.tags or []), "name": r.name})

    results = []
    async with httpx.AsyncClient(base_url=base, timeout=10.0) as client:
        sem = asyncio.Semaphore(8)

        async def _check(route: dict):
            entry = {
                "path": route["path"], "methods": route["methods"], "tags": route["tags"],
                "name": route["name"], "tested_method": None, "tested_path": None,
                "status_code": None, "ms": None, "result": "skipped", "reason": None, "error": None,
            }
            if "GET" not in route["methods"]:
                entry["result"] = "skipped"; entry["reason"] = "non-GET"; return entry
            if _is_skipped(route["path"]):
                entry["result"] = "skipped"; entry["reason"] = "blacklisted"; return entry
            target_path = route["path"]
            if PATH_PARAM_RE.search(target_path):
                resolved = _resolve_params(target_path, owner)
                if not resolved:
                    entry["result"] = "skipped"; entry["reason"] = "unresolved param"; return entry
                target_path = resolved
            entry["tested_method"] = "GET"; entry["tested_path"] = target_path
            t0 = time.perf_counter()
            async with sem:
                try:
                    resp = await client.get(target_path, headers=headers)
                    entry["status_code"] = resp.status_code
                except httpx.ReadTimeout:
                    entry["error"] = "timeout (>10s)"
                except Exception as e:
                    entry["error"] = str(e)[:160]
            entry["ms"] = round((time.perf_counter() - t0) * 1000, 1)
            entry["result"] = _classify(entry["status_code"], entry["error"])
            return entry

        results = await asyncio.gather(*[_check(r) for r in routes])

    summary = {"total": 0, "pass": 0, "warn": 0, "fail": 0, "skipped": 0}
    for r in results:
        summary["total"] += 1
        summary[r["result"]] = summary.get(r["result"], 0) + 1
    return {"summary": summary, "results": results}


def _build_regression_email(prev_failed_paths: set, new_failed: list, all_failed: list, summary: dict) -> str:
    rows_html = ""
    for r in all_failed:
        is_new = r["path"] in (set(rf["path"] for rf in new_failed))
        badge = '<span style="background:#dc2626;color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;margin-right:6px;">جديد</span>' if is_new else ''
        rows_html += f"""<tr>
          <td style='padding:6px 8px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px;'>{badge}{r['path']}</td>
          <td style='padding:6px 8px;border-bottom:1px solid #eee;text-align:center;'>{r.get('status_code') or '—'}</td>
          <td style='padding:6px 8px;border-bottom:1px solid #eee;text-align:center;'>{r.get('ms') or '—'}ms</td>
        </tr>"""
    return f"""
    <div style='font-family:Tahoma,Arial,sans-serif;direction:rtl;max-width:640px;margin:auto;'>
      <div style='background:linear-gradient(135deg,#dc2626,#f43f5e);color:#fff;padding:20px;border-radius:12px 12px 0 0;'>
        <h2 style='margin:0;'>⚠️ تنبيه فحص يومي — Failures جديدة</h2>
        <p style='margin:6px 0 0;opacity:0.9;font-size:14px;'>تم اكتشاف {len(new_failed)} مسار فاشل جديد في فحص اليوم</p>
      </div>
      <div style='background:#fff;padding:20px;border:1px solid #eee;border-radius:0 0 12px 12px;'>
        <p>الإجمالي: <b>{summary.get('total',0)}</b> &nbsp;|&nbsp;
           ✅ {summary.get('pass',0)} &nbsp;|&nbsp;
           ⚠️ {summary.get('warn',0)} &nbsp;|&nbsp;
           <span style='color:#dc2626;'>❌ {summary.get('fail',0)}</span></p>
        <h3 style='color:#374151;'>المسارات الفاشلة:</h3>
        <table style='width:100%;border-collapse:collapse;'>
          <thead>
            <tr style='background:#f9fafb;'>
              <th style='padding:8px;text-align:right;font-size:12px;'>المسار</th>
              <th style='padding:8px;text-align:center;font-size:12px;'>الكود</th>
              <th style='padding:8px;text-align:center;font-size:12px;'>الزمن</th>
            </tr>
          </thead>
          <tbody>{rows_html}</tbody>
        </table>
        <p style='color:#6b7280;font-size:12px;margin-top:20px;text-align:center;'>
          مرسلة تلقائياً من نظام Health Scanner • للتفاصيل افتح صفحة "فحص صحة المسارات"
        </p>
      </div>
    </div>
    """


async def daily_health_scan_loop(app):
    """Background loop: at ~06:00 UTC every day, run a full scan and email
    the app owner if any NEW failures appeared compared to the last snapshot."""
    await asyncio.sleep(60)  # let app finish booting
    while True:
        try:
            now = datetime.now(timezone.utc)
            # Compute next 06:00 UTC (tomorrow if we've already passed today's)
            target = now.replace(hour=6, minute=0, second=0, microsecond=0)
            if target <= now:
                target = target + timedelta(days=1)
            sleep_secs = max(60, (target - now).total_seconds())
            await asyncio.sleep(sleep_secs)

            db = get_db()
            # Fetch previous snapshot (before we run the new one)
            prev = await db.route_health_history.find_one({}, sort=[("ran_at", -1)])
            prev_failed_paths = set(r["path"] for r in (prev.get("results") or []) if r.get("result") == "fail") if prev else set()

            scan = await _run_internal_scan(app, db)
            scan["ran_at"] = datetime.now(timezone.utc).isoformat()
            scan["ran_by"] = "daily-scheduler"
            await db.route_health_history.insert_one({**scan})

            # Trim history
            old = await db.route_health_history.find({}, {"_id": 1, "ran_at": 1}).sort("ran_at", -1).to_list(length=200)
            if len(old) > 50:
                await db.route_health_history.delete_many({"_id": {"$in": [o["_id"] for o in old[50:]]}})

            all_failed = [r for r in scan["results"] if r["result"] == "fail"]
            new_failed = [r for r in all_failed if r["path"] not in prev_failed_paths]

            if new_failed:
                # Email the app owner(s)
                owners = await db.users.find(
                    {"role": "app_owner", "is_active": True, "email": {"$exists": True, "$ne": None, "$ne": ""}},
                    {"_id": 0, "email": 1, "full_name": 1},
                ).to_list(length=10)
                if owners:
                    try:
                        from email_service import EmailService
                        es = EmailService()
                        html = _build_regression_email(prev_failed_paths, new_failed, all_failed, scan["summary"])
                        for o in owners:
                            try:
                                await es.send_email(
                                    to_email=o["email"],
                                    subject=f"⚠️ تنبيه: {len(new_failed)} مسار فاشل جديد في فحص اليوم",
                                    html_content=html,
                                    mailbox="main",
                                )
                            except Exception as ee:
                                logger.error(f"daily-scan email send failed: {ee}")
                    except Exception as ee:
                        logger.error(f"daily-scan email setup failed: {ee}")
                logger.warning(f"daily-scan: {len(new_failed)} NEW failures detected — emailed {len(owners)} owner(s)")
            else:
                logger.info(f"daily-scan: clean — total={scan['summary']['total']} pass={scan['summary']['pass']} fail={scan['summary']['fail']}")
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"daily-scan loop error: {e}", exc_info=True)
            # Sleep an hour and try again to avoid tight error loops
            await asyncio.sleep(3600)
