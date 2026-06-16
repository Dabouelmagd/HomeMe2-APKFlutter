"""Iter 145 — backend tests for Feature #49 Security Insights endpoint."""
import os
import sys
import time
import asyncio
from datetime import datetime, timezone, timedelta

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

CRED_OWNER = {"username": "Owner_homeme", "password": "Dalia1234@"}
CRED_RESIDENT = {"username": "test", "password": "test123"}

# Static secret used only inside the test fixture
_OWNER_TEST_TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"  # 32-char base32 valid


def _login(creds):
    """Test helper that auto-handles a 2FA challenge when present."""
    import pyotp
    last = None
    for _ in range(3):
        try:
            r = requests.post(f"{API}/auth/login", json=creds, timeout=45)
            if r.status_code != 200:
                last = r
                continue
            d = r.json()
            if d.get("access_token"):
                return d["access_token"]
            if d.get("two_factor_required"):
                code = pyotp.TOTP(_OWNER_TEST_TOTP_SECRET).now()
                r2 = requests.post(
                    f"{API}/2fa/verify-login",
                    json={"temp_token": d["temp_token"], "code": code},
                    timeout=30,
                )
                if r2.status_code == 200 and r2.json().get("access_token"):
                    return r2.json()["access_token"]
                last = r2
                continue
            last = d
        except Exception as e:
            last = e
            time.sleep(2)
    raise AssertionError(f"Login failed for {creds['username']}: {last}")


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="module")
def db():
    init_db()
    return get_db()


@pytest.fixture(scope="module")
def owner_token():
    return _login(CRED_OWNER)


@pytest.fixture(scope="module", autouse=True)
def disable_owner_2fa_for_tests():
    """Set Owner_homeme to a *known* 2FA secret so the test helper can pass the
    2FA challenge automatically — works around the mandatory-2FA enforcement
    added in Iter147 without disabling the protection itself."""
    import asyncio as _asyncio
    from database import init_db as _init, get_db as _get
    async def _go():
        _init()
        await _get().users.update_one(
            {"username": "Owner_homeme"},
            {"$set": {
                "two_factor_enabled": True,
                "two_factor_secret": _OWNER_TEST_TOTP_SECRET,
            }},
        )
    loop = _asyncio.new_event_loop()
    try:
        loop.run_until_complete(_go())
    finally:
        loop.close()


@pytest.fixture(scope="module")
def seed_attempts(event_loop, db):
    """Seed a known set of login attempts so the endpoint has real data to surface."""
    async def go():
        now = datetime.now(timezone.utc)
        await db.login_attempts.delete_many({"username": {"$regex": "^pytest_sec_"}})
        docs = []
        # Suspicious IP — 5 failures in last 5 min targeting one user
        for i in range(5):
            docs.append({
                "username": "pytest_sec_victim",
                "ip": "203.0.113.99",  # documented as TEST-NET-3
                "user_agent": "evil-bot/1.0",
                "success": False,
                "created_at": (now - timedelta(minutes=2 + i)).isoformat(),
            })
        # Another suspicious IP attacking 3 different usernames
        for i, u in enumerate(["pytest_sec_a", "pytest_sec_b", "pytest_sec_c"]):
            docs.append({
                "username": u,
                "ip": "198.51.100.42",
                "user_agent": "harvester",
                "success": False,
                "created_at": (now - timedelta(minutes=10 + i)).isoformat(),
            })
        # One successful login (to test failure_rate)
        docs.append({
            "username": "pytest_sec_legit",
            "ip": "10.0.0.1",
            "user_agent": "real-user",
            "success": True,
            "created_at": (now - timedelta(minutes=1)).isoformat(),
        })
        await db.login_attempts.insert_many(docs)
    event_loop.run_until_complete(go())
    yield


class TestSecurityInsights:
    def test_owner_can_access(self, owner_token, seed_attempts):
        r = requests.get(
            f"{API}/super-admin/security-insights?hours=1",
            headers=_hdr(owner_token), timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "summary" in d and "top_failed_ips" in d
        assert "top_targeted_users" in d and "hourly_distribution" in d
        assert "recent_failures" in d and "currently_locked" in d
        assert len(d["hourly_distribution"]) == 24

    def test_resident_cannot_access(self):
        tok = _login(CRED_RESIDENT)
        r = requests.get(
            f"{API}/super-admin/security-insights",
            headers=_hdr(tok), timeout=15,
        )
        assert r.status_code in (401, 403), f"resident must NOT access: {r.status_code}"

    def test_suspicious_ip_surfaces(self, owner_token):
        r = requests.get(
            f"{API}/super-admin/security-insights?hours=1",
            headers=_hdr(owner_token), timeout=30,
        )
        d = r.json()
        ips = [x["ip"] for x in d["top_failed_ips"]]
        assert "203.0.113.99" in ips, f"victim's IP missing: {ips}"
        # The 5-failure IP should be the one targeting `pytest_sec_victim`
        victim_row = next(x for x in d["top_failed_ips"] if x["ip"] == "203.0.113.99")
        assert victim_row["failed_attempts"] >= 5
        assert "pytest_sec_victim" in (victim_row.get("usernames_sample") or [])

    def test_currently_locked_detects_seeded_user(self, owner_token):
        """5 failures within 15-min window — user should be 'currently_locked'."""
        r = requests.get(
            f"{API}/super-admin/security-insights?hours=1",
            headers=_hdr(owner_token), timeout=30,
        )
        d = r.json()
        locked_users = [x["username"] for x in d["currently_locked"]]
        assert "pytest_sec_victim" in locked_users, f"victim not locked: {locked_users}"

    def test_targeted_user_with_existence_flag(self, owner_token):
        r = requests.get(
            f"{API}/super-admin/security-insights?hours=1",
            headers=_hdr(owner_token), timeout=30,
        )
        d = r.json()
        names = {x["username"]: x for x in d["top_targeted_users"]}
        assert "pytest_sec_victim" in names
        assert names["pytest_sec_victim"]["user_exists"] is False, \
            "synthetic test user shouldn't exist in users collection"
