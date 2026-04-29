"""
Pre-Deploy Smoke Test Runner

Runs ~15 critical endpoint checks against the local backend (127.0.0.1:8001)
and reports per-test pass/fail + overall verdict.

Usage:
- HTTP: POST /api/system/smoke-test/run (owner-only)
- CLI:  cd /app/backend && python -m services.smoke_test_runner

Each test is named, has a category, and a callable that returns:
    (passed: bool, info: dict)
Where info may contain status_code, message, ms.
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Callable, Awaitable

import httpx

BASE_URL = os.environ.get("SMOKE_TEST_BASE_URL", "http://127.0.0.1:8001")
DEFAULT_TIMEOUT = 12.0


async def _login(client: httpx.AsyncClient, username: str, password: str) -> str | None:
    try:
        r = await client.post("/api/auth/login", json={"username": username, "password": password})
        if r.status_code == 200:
            return r.json().get("access_token")
    except Exception as e:
        logging.warning(f"smoke login failed for {username}: {e}")
    return None


async def _check(coro: Awaitable, t0: float) -> tuple[bool, dict]:
    try:
        passed, info = await coro
    except Exception as e:
        passed, info = False, {"error": str(e)[:200]}
    info["ms"] = round((time.perf_counter() - t0) * 1000, 1)
    return passed, info


# --------------- Individual tests ---------------

async def test_health_root(client: httpx.AsyncClient, _ctx: dict) -> tuple[bool, dict]:
    r = await client.get("/api/")
    return r.status_code == 200, {"status_code": r.status_code}


async def test_login_owner(client: httpx.AsyncClient, ctx: dict) -> tuple[bool, dict]:
    tok = await _login(client, "Owner_homeme", "Dalia1234@")
    ctx["owner_token"] = tok
    return bool(tok), {"status_code": 200 if tok else 401}


async def test_login_super_admin(client: httpx.AsyncClient, ctx: dict) -> tuple[bool, dict]:
    tok = await _login(client, "superadmin", "SuperAdmin2024!")
    ctx["super_admin_token"] = tok
    return bool(tok), {"status_code": 200 if tok else 401}


async def test_login_company_admin(client: httpx.AsyncClient, ctx: dict) -> tuple[bool, dict]:
    tok = await _login(client, "testcompany2", "Company123!")
    ctx["company_admin_token"] = tok
    return bool(tok), {"status_code": 200 if tok else 401}


async def test_login_invalid(client: httpx.AsyncClient, _ctx: dict) -> tuple[bool, dict]:
    r = await client.post("/api/auth/login", json={"username": "Owner_homeme", "password": "wrong"})
    return r.status_code == 401, {"status_code": r.status_code}


async def test_register_company_admin(client: httpx.AsyncClient, ctx: dict) -> tuple[bool, dict]:
    """Critical: ensures the uuid-import bug doesn't regress."""
    suffix = uuid.uuid4().hex[:8]
    payload = {
        "username": f"smoke_co_{suffix}",
        "email": f"smoke_co_{suffix}@homeme.qa",
        "password": "Test1234!",
        "full_name": "Smoke Test Company",
        "phone": "01000000000",
        "role": "company_admin",
        "unit_number": "",
        "subscription_code": "",
        "compound_id": "",
    }
    r = await client.post("/api/auth/register", json=payload)
    ctx["smoke_user_email"] = payload["email"]
    return r.status_code == 200, {"status_code": r.status_code, "username": payload["username"]}


async def test_app_branding_public(client: httpx.AsyncClient, _ctx: dict) -> tuple[bool, dict]:
    r = await client.get("/api/app-branding")
    return r.status_code == 200 and "app_name_ar" in r.json(), {"status_code": r.status_code}


async def test_owner_kpis(client: httpx.AsyncClient, ctx: dict) -> tuple[bool, dict]:
    tok = ctx.get("owner_token")
    if not tok:
        return False, {"reason": "no owner token"}
    r = await client.get("/api/owner-kpis", headers={"Authorization": f"Bearer {tok}"})
    return r.status_code == 200, {"status_code": r.status_code}


async def test_alerts_dashboard(client: httpx.AsyncClient, ctx: dict) -> tuple[bool, dict]:
    tok = ctx.get("owner_token")
    if not tok:
        return False, {"reason": "no owner token"}
    r = await client.get("/api/alerts/dashboard", headers={"Authorization": f"Bearer {tok}"})
    return r.status_code == 200, {"status_code": r.status_code}


async def test_audit_logs(client: httpx.AsyncClient, ctx: dict) -> tuple[bool, dict]:
    tok = ctx.get("owner_token")
    if not tok:
        return False, {"reason": "no owner token"}
    r = await client.get("/api/audit-logs?days=7&limit=5", headers={"Authorization": f"Bearer {tok}"})
    return r.status_code == 200, {"status_code": r.status_code}


async def test_compounds_list(client: httpx.AsyncClient, ctx: dict) -> tuple[bool, dict]:
    tok = ctx.get("owner_token")
    if not tok:
        return False, {"reason": "no owner token"}
    r = await client.get("/api/compounds", headers={"Authorization": f"Bearer {tok}"})
    if r.status_code != 200:
        return False, {"status_code": r.status_code}
    body = r.json()
    arr = body.get("compounds") or []
    has_id_leak = any("_id" in (c or {}) for c in arr[:3])
    return not has_id_leak, {"status_code": 200, "count": len(arr), "id_leak": has_id_leak}


async def test_ads_public(client: httpx.AsyncClient, _ctx: dict) -> tuple[bool, dict]:
    r = await client.get("/api/ads/public?position=homepage_hero")
    return r.status_code == 200, {"status_code": r.status_code, "count": len((r.json() or {}).get("ads", []))}


async def test_media_health_overview(client: httpx.AsyncClient, ctx: dict) -> tuple[bool, dict]:
    tok = ctx.get("owner_token")
    if not tok:
        return False, {"reason": "no owner token"}
    r = await client.get("/api/media-health/overview", headers={"Authorization": f"Bearer {tok}"})
    if r.status_code != 200:
        return False, {"status_code": r.status_code}
    body = r.json()
    return "total_files" in body and "snapshot_count" in body, {"status_code": 200, "total": body.get("total_files")}


async def test_smtp_health(client: httpx.AsyncClient, ctx: dict) -> tuple[bool, dict]:
    tok = ctx.get("owner_token")
    if not tok:
        return False, {"reason": "no owner token"}
    r = await client.get("/api/system/smtp-health/stats?hours=24", headers={"Authorization": f"Bearer {tok}"})
    return r.status_code == 200, {"status_code": r.status_code}


async def test_files_route_404_safety(client: httpx.AsyncClient, _ctx: dict) -> tuple[bool, dict]:
    """Whitelist: invalid subdir must 404 (not 500)."""
    r = await client.get("/api/files/etc/passwd")
    return r.status_code == 404, {"status_code": r.status_code}


# --------------- Test registry ---------------

TESTS: list[tuple[str, str, Callable]] = [
    ("health_root",            "core",     test_health_root),
    ("login_owner",            "auth",     test_login_owner),
    ("login_super_admin",      "auth",     test_login_super_admin),
    ("login_company_admin",    "auth",     test_login_company_admin),
    ("login_invalid_password", "auth",     test_login_invalid),
    ("register_company_admin", "auth",     test_register_company_admin),
    ("app_branding_public",    "core",     test_app_branding_public),
    ("owner_kpis",             "owner",    test_owner_kpis),
    ("alerts_dashboard",       "owner",    test_alerts_dashboard),
    ("audit_logs",             "owner",    test_audit_logs),
    ("compounds_list",         "data",     test_compounds_list),
    ("ads_public",             "ads",      test_ads_public),
    ("media_health_overview",  "media",    test_media_health_overview),
    ("smtp_health_stats",      "ops",      test_smtp_health),
    ("files_404_safety",       "security", test_files_route_404_safety),
]


async def _cleanup(client: httpx.AsyncClient, ctx: dict):
    """Best-effort cleanup of test users created by the smoke run."""
    try:
        from database import init_db, get_db
        init_db()
        db = get_db()
        await db.users.delete_many({"email": {"$regex": "^smoke_co_"}})
    except Exception as e:
        logging.warning(f"smoke cleanup failed: {e}")


async def run_smoke_tests() -> dict:
    """Run all smoke tests and return a summary dict."""
    started = datetime.now(timezone.utc)
    ctx: dict = {}
    results = []

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=DEFAULT_TIMEOUT) as client:
        for name, category, fn in TESTS:
            t0 = time.perf_counter()
            passed, info = await _check(fn(client, ctx), t0)
            results.append({
                "name": name,
                "category": category,
                "passed": passed,
                **info,
            })
        await _cleanup(client, ctx)

    finished = datetime.now(timezone.utc)
    summary = {
        "started_at": started.isoformat(),
        "finished_at": finished.isoformat(),
        "duration_ms": round((finished - started).total_seconds() * 1000, 1),
        "total": len(results),
        "passed": sum(1 for r in results if r["passed"]),
        "failed": sum(1 for r in results if not r["passed"]),
        "results": results,
        "deploy_safe": all(r["passed"] for r in results),
    }
    return summary


# CLI entry
if __name__ == "__main__":
    import json
    res = asyncio.run(run_smoke_tests())
    print(json.dumps({k: v for k, v in res.items() if k != "results"}, indent=2, ensure_ascii=False))
    print("---")
    for r in res["results"]:
        flag = "✅" if r["passed"] else "❌"
        print(f"  {flag} [{r['category']:>8}] {r['name']:30s}  {r.get('ms', 0)}ms  {r}")
    exit(0 if res["deploy_safe"] else 1)
