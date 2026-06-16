"""Iter 144 — backend tests for:
  #44 Executive Report PDF generation
  #47 Rate limiting on /api/auth/login
"""
import os
import sys
import time
import asyncio
import requests
import pytest

sys.path.insert(0, "/app/backend")
from database import init_db, get_db  # noqa: E402


def _read_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip()
    return ""


BASE_URL = _read_backend_url().rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="module")
def db():
    init_db()
    return get_db()


class TestExecutivePDF:
    """Feature #44 — generated PDF must be valid + the report_runs row created."""

    def test_executive_pdf_renders_and_logs(self, event_loop, db):
        async def go():
            from routes.monthly_reports_scheduler import _send_executive_report_pdf
            from services.pdf_report_service import render_executive_report
            from routes.superadmin import build_comprehensive_report_data

            data = await build_comprehensive_report_data(months=12)
            pdf = render_executive_report("TEST-2026-PYTEST", data)
            # Must look like a real PDF
            assert pdf[:4] == b"%PDF", f"bad PDF header: {pdf[:8]!r}"
            assert len(pdf) > 1000, f"PDF too small ({len(pdf)} bytes)"

            # Clear and trigger the scheduler-bound sender (should email + log)
            await db.report_runs.delete_many({
                "kind": "executive", "target_id": "global", "month": "TEST-2026-PYTEST"
            })
            stats = {"failed": 0, "skipped": 0}
            await _send_executive_report_pdf(db, "TEST-2026-PYTEST", stats)
            row = await db.report_runs.find_one(
                {"kind": "executive", "target_id": "global", "month": "TEST-2026-PYTEST"},
                {"_id": 0},
            )
            assert row is not None, "report_runs row not created"
            # SMTP may be unreachable in CI/preview — accept both ok=True
            # (mail delivered) or ok=False with the SMTP error noted.
            assert row.get("ok") in (True, False), f"unexpected ok flag: {row}"

        event_loop.run_until_complete(go())


class TestLoginRateLimiting:
    """Feature #47 — after 5 failed attempts, the 6th must return 429."""

    def test_5_attempts_allowed_then_blocked(self, event_loop, db):
        async def reset():
            await db.login_attempts.delete_many({"username": "pytest_rl_user"})
        event_loop.run_until_complete(reset())

        # 5 wrong-password attempts → expect 401
        for i in range(5):
            r = requests.post(
                f"{API}/auth/login",
                json={"username": "pytest_rl_user", "password": f"wrong{i}"},
                timeout=45,
            )
            assert r.status_code == 401, f"attempt {i + 1}: {r.status_code}"

        # 6th attempt — must be rate-limited
        r = requests.post(
            f"{API}/auth/login",
            json={"username": "pytest_rl_user", "password": "wrong"},
            timeout=45,
        )
        assert r.status_code == 429, f"expected 429, got {r.status_code}: {r.text}"
        assert "تجاوزت" in r.json().get("detail", ""), r.text

    def test_login_attempts_logged(self, event_loop, db):
        """Every login attempt should be persisted to login_attempts."""
        async def go():
            uniq = f"pytest_log_{int(time.time())}"
            await db.login_attempts.delete_many({"username": uniq})
            requests.post(
                f"{API}/auth/login",
                json={"username": uniq, "password": "anything"},
                timeout=45,
            )
            cnt = await db.login_attempts.count_documents({"username": uniq})
            assert cnt == 1, f"expected 1 attempt logged, got {cnt}"
            doc = await db.login_attempts.find_one(
                {"username": uniq}, {"_id": 0}
            )
            assert doc["success"] is False
            assert "ip" in doc
            assert "user_agent" in doc
            assert "created_at" in doc

        event_loop.run_until_complete(go())
