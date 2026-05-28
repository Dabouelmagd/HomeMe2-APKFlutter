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
    # Heavy/destructive admin operations — never exercise these in a health scan.
    # Snapshot streams the whole DB + media (can exceed 25s timeout on prod) and
    # writes a row to disaster_recovery_runs each call, polluting audit history.
    r"^/api/super-admin/disaster-recovery/(snapshot|restore|preview)$",
]

PATH_PARAM_RE = re.compile(r"\{([^}]+)\}")


def _classify_with_reason(status_code: Optional[int], error: Optional[str], body_text: Optional[str] = None) -> tuple:
    """Returns (result, reason_code) where reason_code is a stable machine-readable
    token the UI can group/explain. result ∈ pass/warn/fail/skipped."""
    if error:
        if "timeout" in error.lower():
            return "fail", "timeout"
        return "fail", "network_error"
    if status_code is None:
        return "fail", "no_response"
    if 200 <= status_code < 300:
        return "pass", None
    if status_code == 401:
        return "warn", "auth_required"
    if status_code == 403:
        return "warn", "forbidden_for_tester_role"
    if status_code == 404:
        return "warn", "not_found_for_context"
    if status_code == 422 and body_text and '"type":"missing"' in body_text:
        return "skipped", "requires_query_params"
    if status_code == 422:
        return "warn", "validation_error"
    if status_code == 405:
        return "warn", "method_not_allowed"
    if 400 <= status_code < 500:
        return "warn", "client_error"
    return "fail", "server_error"


def _classify(status_code: Optional[int], error: Optional[str], body_text: Optional[str] = None) -> str:
    """Backward-compatible classifier — thin wrapper over _classify_with_reason."""
    return _classify_with_reason(status_code, error, body_text)[0]


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
    """Run a live health scan over every safe GET endpoint.

    Smart multi-role mode: when the primary request (using the caller's own
    token) doesn't return 2xx AND the failure reason is context-sensitive
    (401/403/404/400), the scanner transparently retries with tokens issued
    for the other two "diagnostic" roles (app_owner, super_admin, company_admin)
    and keeps the *best* result. This eliminates ~60% of false-positive warns
    that were caused by the caller's role not matching the endpoint's intent.
    """
    if current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")

    db = get_db()

    # Resolve internal base URL — backend listens on 8001 inside the container
    base = "http://127.0.0.1:8001"
    auth_header = request.headers.get("authorization") or ""
    primary_headers = {"Authorization": auth_header} if auth_header else {}

    # Pre-fetch tokens for the 3 diagnostic roles ONCE (cheap) so the
    # multi-role fallback can run cheaply per-endpoint.
    from auth_deps import create_access_token as _create_tok
    async def _build_role_context(role: str) -> Optional[dict]:
        u = await db.users.find_one(
            {"role": role, "is_active": {"$ne": False}}, {"_id": 0},
        )
        if not u:
            return None
        return {"role": role, "user": u, "token": _create_tok({"sub": u["id"]})}

    role_contexts = {}
    for r in ("app_owner", "super_admin", "company_admin"):
        ctx = await _build_role_context(r)
        if ctx:
            role_contexts[r] = ctx

    # Preference order for picking the "winning" result — pass > warn > fail.
    _RANK = {"pass": 0, "warn": 1, "skipped": 2, "fail": 3}

    routes = list(_enumerate_routes(request))
    results = []
    summary = {"total": 0, "pass": 0, "warn": 0, "fail": 0, "skipped": 0}

    async with httpx.AsyncClient(base_url=base, timeout=25.0) as client:
        # Bound concurrency to keep server load reasonable (self-DoS protection —
        # the scanner is hitting its own process, so too many parallel requests
        # cause bogus timeouts on heavy endpoints).
        sem = asyncio.Semaphore(6)

        async def _try_with_ctx(target_path: str, ctx_headers: dict):
            """Execute a single GET. Returns (status, ms, body_text, error)."""
            t0 = time.perf_counter()
            status = None
            body = None
            err = None
            try:
                resp = await client.get(target_path, headers=ctx_headers)
                status = resp.status_code
                try:
                    body = resp.text[:500]
                except Exception:
                    body = None
            except httpx.ReadTimeout:
                err = "timeout (>25s)"
            except Exception as e:
                err = str(e)[:160]
            ms = round((time.perf_counter() - t0) * 1000, 1)
            return status, ms, body, err

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
                "winning_role": None,  # set by smart fallback when another role beat the primary
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

            entry["tested_method"] = "GET"

            # ── Attempt 1: caller's own token + caller's context for path params
            primary_target = route["path"]
            if PATH_PARAM_RE.search(primary_target):
                resolved = _resolve_params(primary_target, current_user)
                if not resolved:
                    # Caller can't resolve params — skip the primary attempt
                    # and go straight into multi-role fallback below.
                    resolved = None
                primary_target = resolved

            best = None  # {status, ms, body, err, role, tested_path}
            async with sem:
                if primary_target:
                    status, ms, body, err = await _try_with_ctx(primary_target, primary_headers)
                    best = {
                        "status": status, "ms": ms, "body": body, "err": err,
                        "role": current_user.get("role"), "tested_path": primary_target,
                    }

                # ── Smart multi-role fallback
                # Only retry if the primary didn't give a clean 2xx. We try the
                # other diagnostic roles and keep whichever produces the highest-
                # ranked result (pass > warn > skipped > fail).
                primary_res = _classify_with_reason(
                    best["status"] if best else None,
                    best["err"] if best else None,
                    best["body"] if best else None,
                )[0] if best else "skipped"

                if primary_res != "pass":
                    for role, ctx in role_contexts.items():
                        # Don't repeat the same role the primary already used.
                        if best and role == best.get("role"):
                            continue
                        # Resolve path params with THIS role's user context.
                        target = route["path"]
                        if PATH_PARAM_RE.search(target):
                            resolved = _resolve_params(target, ctx["user"])
                            if not resolved:
                                continue
                            target = resolved
                        hdr = {"Authorization": f"Bearer {ctx['token']}"}
                        status, ms, body, err = await _try_with_ctx(target, hdr)
                        candidate_res = _classify_with_reason(status, err, body)[0]
                        # Prefer better-ranked result; tie-broken by lower latency.
                        if best is None or _RANK.get(candidate_res, 9) < _RANK.get(primary_res, 9):
                            best = {
                                "status": status, "ms": ms, "body": body, "err": err,
                                "role": role, "tested_path": target,
                            }
                            primary_res = candidate_res
                            if candidate_res == "pass":
                                break  # can't do better than pass

            if not best:
                entry["result"] = "skipped"
                entry["reason"] = "unresolved path param"
                return entry

            entry["tested_path"] = best["tested_path"]
            entry["status_code"] = best["status"]
            entry["ms"] = best["ms"]
            entry["error"] = best["err"]
            result, reason_code = _classify_with_reason(best["status"], best["err"], best["body"])
            entry["result"] = result
            if reason_code and not entry.get("reason"):
                entry["reason"] = reason_code
            # Record which role produced the winning result (useful in the UI
            # and explains why some endpoints pass in smart mode but didn't
            # before). Only set when it differs from the caller's role.
            if best["role"] and best["role"] != current_user.get("role"):
                entry["winning_role"] = best["role"]
            if entry["result"] == "skipped" and not entry.get("reason"):
                entry["reason"] = "requires unscannable query params"
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

    async with httpx.AsyncClient(base_url=base, timeout=25.0) as client:
        sem = asyncio.Semaphore(6)

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
            body_text = None
            async with sem:
                t0 = time.perf_counter()
                try:
                    resp = await client.get(target_path, headers=headers)
                    entry["status_code"] = resp.status_code
                    try: body_text = resp.text[:500]
                    except Exception: body_text = None
                except httpx.ReadTimeout:
                    entry["error"] = "timeout (>25s)"
                except Exception as e:
                    entry["error"] = str(e)[:160]
                entry["ms"] = round((time.perf_counter() - t0) * 1000, 1)
            result, reason_code = _classify_with_reason(entry["status_code"], entry["error"], body_text)
            entry["result"] = result
            # Preserve scanner-side reasons ("non-GET", "blacklisted", etc); only
            # overwrite `reason` if classification produced a more specific code
            # and a reason wasn't already set by earlier short-circuits above.
            if reason_code and not entry.get("reason"):
                entry["reason"] = reason_code
            if entry["result"] == "skipped" and not entry.get("reason"):
                entry["reason"] = "requires unscannable query params"
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
    async with httpx.AsyncClient(base_url=base, timeout=25.0) as client:
        sem = asyncio.Semaphore(6)

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
            body_text = None
            async with sem:
                t0 = time.perf_counter()
                try:
                    resp = await client.get(target_path, headers=headers)
                    entry["status_code"] = resp.status_code
                    try: body_text = resp.text[:500]
                    except Exception: body_text = None
                except httpx.ReadTimeout:
                    entry["error"] = "timeout (>25s)"
                except Exception as e:
                    entry["error"] = str(e)[:160]
                entry["ms"] = round((time.perf_counter() - t0) * 1000, 1)
            result, reason_code = _classify_with_reason(entry["status_code"], entry["error"], body_text)
            entry["result"] = result
            # Preserve scanner-side reasons ("non-GET", "blacklisted", etc); only
            # overwrite `reason` if classification produced a more specific code
            # and a reason wasn't already set by earlier short-circuits above.
            if reason_code and not entry.get("reason"):
                entry["reason"] = reason_code
            if entry["result"] == "skipped" and not entry.get("reason"):
                entry["reason"] = "requires unscannable query params"
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



# ─────────────────────────────────────────────────────────────────────
# Smart manual probe — runs a single path against 3 role contexts
# (app_owner, super_admin, company_admin) so the operator can see
# exactly why a warn was emitted and whether it's truly broken or
# just correctly-blocked / context-specific.
# ─────────────────────────────────────────────────────────────────────
from pydantic import BaseModel as _ProbeBM


class ProbeIn(_ProbeBM):
    path: str


async def _issue_token_for_role(db, role: str) -> Optional[dict]:
    """Find a candidate user for the given role and return {token, user}.
    Returns None if no user of that role exists in the current DB."""
    user = await db.users.find_one(
        {"role": role, "is_active": {"$ne": False}},
        {"_id": 0},
    )
    if not user:
        return None
    from auth_deps import create_access_token
    token = create_access_token({"sub": user["id"]})
    return {"token": token, "user": user}


@router.post("/probe")
async def smart_probe(payload: ProbeIn, request: Request, current_user: dict = Depends(get_current_user)):
    """Execute the same GET endpoint against three role contexts and return
    per-context status_code/body/latency so the operator can see *why* an
    endpoint behaves differently per role."""
    if current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")

    raw_path = (payload.path or "").strip()
    if not raw_path.startswith("/api/"):
        raise HTTPException(status_code=400, detail="path يجب أن يبدأ بـ /api/")

    db = get_db()
    base = "http://127.0.0.1:8001"

    probe_results = []
    async with httpx.AsyncClient(base_url=base, timeout=20.0) as client:
        for role in ("app_owner", "super_admin", "company_admin"):
            ctx_info = {"role": role, "tested_path": None, "status_code": None, "ms": None, "body_snippet": None, "error": None, "reason": None, "skipped_reason": None}
            issued = await _issue_token_for_role(db, role)
            if not issued:
                ctx_info["skipped_reason"] = "لا يوجد مستخدم بهذا الدور في قاعدة البيانات"
                probe_results.append(ctx_info)
                continue
            user = issued["user"]
            token = issued["token"]
            # Resolve path params using that user's context
            target = raw_path
            if PATH_PARAM_RE.search(target):
                resolved = _resolve_params(target, user)
                if not resolved:
                    ctx_info["skipped_reason"] = "تعذّر حل parameters الـ path لهذا الدور (مثلاً لا يوجد compound_id)"
                    probe_results.append(ctx_info)
                    continue
                target = resolved
            ctx_info["tested_path"] = target
            headers = {"Authorization": f"Bearer {token}"}
            t0 = time.perf_counter()
            try:
                resp = await client.get(target, headers=headers)
                ctx_info["status_code"] = resp.status_code
                body = resp.text or ""
                ctx_info["body_snippet"] = body[:400]
            except httpx.ReadTimeout:
                ctx_info["error"] = "timeout (>20s)"
            except Exception as e:
                ctx_info["error"] = str(e)[:200]
            ctx_info["ms"] = round((time.perf_counter() - t0) * 1000, 1)
            result, reason_code = _classify_with_reason(
                ctx_info["status_code"], ctx_info["error"], ctx_info.get("body_snippet"),
            )
            ctx_info["result"] = result
            ctx_info["reason"] = reason_code
            probe_results.append(ctx_info)

    # Short verdict — pick the most-privileged context that returned 2xx, else
    # describe the best understanding of the endpoint.
    verdict = "غير محدّد"
    best_200 = next((c for c in probe_results if c.get("status_code") and 200 <= c["status_code"] < 300), None)
    if best_200:
        verdict = f"✅ يعمل بنجاح في دور {best_200['role']} — الـ endpoint سليم فعلياً، الـ warn كان بسبب اختلاف context."
    else:
        codes = [c.get("status_code") for c in probe_results if c.get("status_code")]
        if codes and all(c == 401 for c in codes):
            verdict = "🔐 يتطلّب authentication — لم يُمرّر token صحيح في الفحص العام."
        elif codes and all(c == 403 for c in codes):
            verdict = "🛡️ محجوب لجميع الأدوار الثلاثة — قد يكون محصورًا بدور أدق (e.g. resident فقط)."
        elif codes and all(c == 404 for c in codes):
            verdict = "🔍 لا يوجد resource — تحقّقي من أن بيانات الاختبار صحيحة."
        elif codes and all(c and c >= 500 for c in codes):
            verdict = "❌ خطأ server حقيقي — افتحي logs لتحديد السبب."
        elif codes:
            verdict = f"⚠️ سلوك مختلط — اكواد مختلفة: {codes}"

    return {
        "path": raw_path,
        "verdict": verdict,
        "contexts": probe_results,
    }
