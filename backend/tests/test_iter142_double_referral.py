"""Backend tests for the double-sided company referral (iter142).

When a new company_admin registers via ?ref=CO-XXXX:
  1. The referrer's total_signups increments (already covered by iter65).
  2. The new company admin receives a one-time 15% welcome coupon
     in `db.coupons` with code WELCOME-{ref-suffix}-{user_id_prefix}.
  3. A notification of type 'referral_welcome' is written for the new user.
"""
import os
import time
import asyncio
import pytest
import requests

# pull MongoDB URL/db from env via backend's loader
import sys
sys.path.insert(0, "/app/backend")
from database import init_db, get_db  # noqa: E402


def _read_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return ""


BASE_URL = _read_backend_url().rstrip("/")
API = f"{BASE_URL}/api"

CRED_COMPANY = {"username": "testcompany2", "password": "Company123!"}


def _login(creds):
    last = None
    for _ in range(3):
        try:
            r = requests.post(f"{API}/auth/login", json=creds, timeout=45)
            if r.status_code == 200:
                return r.json()["access_token"]
            last = r
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
def referrer_code():
    """Fetch the existing testcompany2 referral code."""
    tok = _login(CRED_COMPANY)
    r = requests.get(f"{API}/company-admin/referral/my-link", headers=_hdr(tok), timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["code"]


class TestDoubleSidedReferral:
    def test_register_with_ref_creates_welcome_coupon(self, referrer_code, event_loop, db):
        ts = int(time.time())
        username = f"refdbl_{ts}"
        # use synthetic email so welcome email is skipped (avoids SMTP)
        payload = {
            "username": username,
            "password": "RefDbl123!",
            "email": f"{username}@homeme.qa",
            "full_name": f"Double Ref {ts}",
            "role": "company_admin",
            "company_name": f"شركة Dbl {ts}",
            "compound_id": "",
            "referral_code": referrer_code,
        }
        r = requests.post(f"{API}/auth/register", json=payload, timeout=30)
        assert r.status_code in (200, 201), f"register: {r.status_code} {r.text}"

        # Now poll the DB for the welcome coupon associated with the new user
        async def find_artifacts():
            user = await db.users.find_one({"username": username}, {"_id": 0, "id": 1})
            assert user, "new user not found in DB"
            user_id = user["id"]
            # coupon search by user_id
            coupon = await db.coupons.find_one(
                {"reward_for_user": user_id, "referral_reward": True}, {"_id": 0}
            )
            notif = await db.notifications.find_one(
                {"user_id": user_id, "type": "referral_welcome"}, {"_id": 0}
            )
            return user_id, coupon, notif

        user_id, coupon, notif = event_loop.run_until_complete(find_artifacts())

        # ---- assertions ----
        assert coupon, f"welcome coupon missing for user {user_id}"
        assert coupon["discount_type"] == "percentage"
        assert coupon["discount_value"] == 15
        assert coupon["max_uses"] == 1
        assert coupon["times_used"] == 0
        assert coupon["is_active"] is True
        assert coupon["code"].startswith("WELCOME-")
        assert coupon["applicable_plans"] == []
        assert coupon["reward_for_user"] == user_id

        assert notif, f"welcome notification missing for user {user_id}"
        assert notif["type"] == "referral_welcome"
        assert "15%" in notif["message"]
        assert coupon["code"] in notif["message"]

    def test_register_without_ref_creates_no_welcome_coupon(self, event_loop, db):
        """A user who registers WITHOUT a referral_code must NOT get the coupon."""
        ts = int(time.time()) + 7
        username = f"norefdbl_{ts}"
        payload = {
            "username": username,
            "password": "NoRef123!",
            "email": f"{username}@homeme.qa",
            "full_name": "No Ref",
            "role": "company_admin",
            "company_name": f"شركة بدون {ts}",
            "compound_id": "",
        }
        r = requests.post(f"{API}/auth/register", json=payload, timeout=30)
        assert r.status_code in (200, 201)

        async def find_coupon():
            user = await db.users.find_one({"username": username}, {"_id": 0, "id": 1})
            if not user:
                return None
            return await db.coupons.find_one(
                {"reward_for_user": user["id"], "referral_reward": True}, {"_id": 0}
            )

        coupon = event_loop.run_until_complete(find_coupon())
        assert coupon is None, f"unexpected welcome coupon issued: {coupon}"
