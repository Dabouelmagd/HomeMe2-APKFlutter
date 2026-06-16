"""Iter 147 — Feature #54: Mandatory 2FA enrolment for app_owner/super_admin."""
import os
import sys
import time
import asyncio
import pyotp
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


@pytest.fixture(scope="module")
def disable_owner_2fa(event_loop, db):
    """Ensure Owner_homeme has 2FA disabled so the enrolment path triggers."""
    async def go():
        await db.users.update_one(
            {"username": "Owner_homeme"},
            {"$set": {"two_factor_enabled": False, "two_factor_secret": None}},
        )
    event_loop.run_until_complete(go())


@pytest.fixture(scope="module")
def clear_login_rate_limit(event_loop, db):
    """Wipe login_attempts for Owner_homeme so we don't trip rate limiting."""
    async def go():
        await db.login_attempts.delete_many({"username": "Owner_homeme"})
        await db.banned_ips.delete_many({})
    event_loop.run_until_complete(go())
    yield
    event_loop.run_until_complete(go())


class TestMandatory2FAEnrolment:
    def test_owner_login_returns_setup_required(self, disable_owner_2fa, clear_login_rate_limit):
        r = requests.post(
            f"{API}/auth/login",
            json={"username": "Owner_homeme", "password": "Dalia1234@"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        # MUST NOT mint an access token at this point
        assert "access_token" not in d, f"leaked session token: {d}"
        assert d.get("two_factor_setup_required") is True
        assert d.get("setup_token"), "setup_token missing"
        assert d.get("role") == "app_owner"

    def test_resident_login_unaffected(self):
        """Mandatory 2FA must NOT apply to non-privileged roles."""
        r = requests.post(
            f"{API}/auth/login",
            json={"username": "test", "password": "test123"},
            timeout=20,
        )
        assert r.status_code == 200
        d = r.json()
        # Either gets access_token directly OR is asked for 2FA challenge
        assert "two_factor_setup_required" not in d or d.get("two_factor_setup_required") is False

    def test_full_enrolment_flow_e2e(self, disable_owner_2fa, clear_login_rate_limit, event_loop, db):
        """End-to-end: login → setup-enroll → verify-enroll → final access_token."""
        # Step 1: Login (returns setup_token)
        r1 = requests.post(
            f"{API}/auth/login",
            json={"username": "Owner_homeme", "password": "Dalia1234@"},
            timeout=20,
        )
        assert r1.status_code == 200
        setup_token = r1.json()["setup_token"]

        # Step 2: Setup-enroll → returns QR + secret
        r2 = requests.post(
            f"{API}/2fa/setup-enroll",
            json={"setup_token": setup_token},
            timeout=20,
        )
        assert r2.status_code == 200, r2.text
        secret = r2.json()["secret"]
        assert r2.json()["qr_code"].startswith("data:image/png;base64,")

        # Step 3: Generate valid TOTP and call verify-enroll
        code = pyotp.TOTP(secret).now()
        r3 = requests.post(
            f"{API}/2fa/verify-enroll",
            json={"setup_token": setup_token, "token_code": code},
            timeout=20,
        )
        assert r3.status_code == 200, r3.text
        d3 = r3.json()
        assert d3.get("access_token"), "access_token not minted"
        assert d3.get("user", {}).get("role") == "app_owner"
        assert isinstance(d3.get("backup_codes"), list) and len(d3["backup_codes"]) == 8

        # Step 4: Subsequent login must now hit the 2FA *challenge* (not setup)
        r4 = requests.post(
            f"{API}/auth/login",
            json={"username": "Owner_homeme", "password": "Dalia1234@"},
            timeout=20,
        )
        d4 = r4.json()
        assert d4.get("two_factor_required") is True
        assert "two_factor_setup_required" not in d4 or d4["two_factor_setup_required"] is False

        # Cleanup → disable again for the next test runs
        async def reset():
            await db.users.update_one(
                {"username": "Owner_homeme"},
                {"$set": {"two_factor_enabled": False, "two_factor_secret": None}},
            )
        event_loop.run_until_complete(reset())

    def test_setup_token_cannot_open_api(self, disable_owner_2fa, clear_login_rate_limit):
        """Setup-scoped token must NOT work as a normal session."""
        r1 = requests.post(
            f"{API}/auth/login",
            json={"username": "Owner_homeme", "password": "Dalia1234@"},
            timeout=20,
        )
        setup_token = r1.json()["setup_token"]
        # Try using it as a Bearer token on a protected endpoint
        r = requests.get(
            f"{API}/super-admin/security-insights",
            headers={"Authorization": f"Bearer {setup_token}"},
            timeout=20,
        )
        assert r.status_code in (401, 403), f"setup token should NOT open API: {r.status_code}"

    def test_invalid_code_rejected(self, disable_owner_2fa, clear_login_rate_limit):
        r1 = requests.post(
            f"{API}/auth/login",
            json={"username": "Owner_homeme", "password": "Dalia1234@"},
            timeout=20,
        )
        setup_token = r1.json()["setup_token"]

        # call setup-enroll first
        requests.post(f"{API}/2fa/setup-enroll", json={"setup_token": setup_token}, timeout=20)
        # Wrong code
        r = requests.post(
            f"{API}/2fa/verify-enroll",
            json={"setup_token": setup_token, "token_code": "000000"},
            timeout=20,
        )
        assert r.status_code == 400, f"wrong code should reject: {r.text}"
