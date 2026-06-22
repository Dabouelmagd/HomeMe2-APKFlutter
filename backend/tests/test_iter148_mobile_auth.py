"""Iter 148 — Feature #55: Mobile Auth (Flutter) registration + OTP + login."""
import os
import sys
import time
import asyncio
import uuid
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
def sample_compound(event_loop, db):
    async def go():
        c = await db.compounds.find_one({}, {"id": 1})
        if c and c.get("id"):
            return c["id"]
        # Create a throwaway compound
        cid = str(uuid.uuid4())
        await db.compounds.insert_one({
            "id": cid, "name": "TestCompound", "address": "x",
            "company_id": None, "created_at": "2026-02-16T00:00:00Z",
        })
        return cid
    return event_loop.run_until_complete(go())


@pytest.fixture(scope="module")
def cleanup_mobile_users(event_loop, db):
    """Wipe any pre-existing test users + post-test cleanup."""
    async def wipe():
        await db.users.delete_many({"username": {"$regex": "^iter148_"}})
        await db.email_otps.delete_many({"email": {"$regex": "^iter148_"}})
        await db.companies.delete_many({"name": {"$regex": "^iter148_"}})
    event_loop.run_until_complete(wipe())
    yield
    event_loop.run_until_complete(wipe())


# ───────────────────────────────────────────────────────────────────────
# 1. company_admin happy path (no compound required)
# ───────────────────────────────────────────────────────────────────────

def test_register_company_admin_succeeds(cleanup_mobile_users):
    r = requests.post(f"{API}/mobile/auth/register", json={
        "username": "iter148_co1",
        "email": "iter148_co1@homeme.qa",
        "password": "Mobile1234A",
        "full_name": "شركة تجريبية",
        "phone": "+201001112222",
        "role": "company_admin",
        "company_name": "iter148 Test Co",
    })
    assert r.status_code == 201, r.text
    j = r.json()
    assert j["access_token"]
    assert j["user"]["role"] == "company_admin"
    assert j["user"]["email_verified"] is False
    assert j["otp_required"] is True
    assert j["company_id"]


# ───────────────────────────────────────────────────────────────────────
# 2. resident happy path (requires compound + unit)
# ───────────────────────────────────────────────────────────────────────

def test_register_resident_requires_compound_and_unit(
        cleanup_mobile_users, sample_compound):
    # Missing compound_id → 400
    r = requests.post(f"{API}/mobile/auth/register", json={
        "username": "iter148_res_bad",
        "email": "iter148_res_bad@homeme.qa",
        "password": "Mobile1234A",
        "full_name": "ساكن",
        "role": "resident",
    })
    assert r.status_code == 400
    assert "compound_id" in r.text

    # Success
    r = requests.post(f"{API}/mobile/auth/register", json={
        "username": "iter148_res1",
        "email": "iter148_res1@homeme.qa",
        "password": "Mobile1234A",
        "full_name": "ساكن تجريبي",
        "role": "resident",
        "compound_id": sample_compound,
        "unit_number": "A-101",
    })
    assert r.status_code == 201, r.text
    j = r.json()
    assert j["user"]["compound_id"] == sample_compound
    assert j["user"]["unit_number"] == "A-101"


# ───────────────────────────────────────────────────────────────────────
# 3. resident with unknown compound → 404
# ───────────────────────────────────────────────────────────────────────

def test_register_resident_unknown_compound(cleanup_mobile_users):
    r = requests.post(f"{API}/mobile/auth/register", json={
        "username": "iter148_res2",
        "email": "iter148_res2@homeme.qa",
        "password": "Mobile1234A",
        "full_name": "ساكن",
        "role": "resident",
        "compound_id": "non-existent-uuid",
        "unit_number": "A-1",
    })
    assert r.status_code == 404


# ───────────────────────────────────────────────────────────────────────
# 4. weak password → 400
# ───────────────────────────────────────────────────────────────────────

def test_register_weak_password_rejected(cleanup_mobile_users):
    r = requests.post(f"{API}/mobile/auth/register", json={
        "username": "iter148_weak",
        "email": "iter148_weak@homeme.qa",
        "password": "weakpass",   # no digit / no upper
        "full_name": "ضعيف الكلمة",
        "role": "company_admin",
        "company_name": "Weak Co",
    })
    assert r.status_code == 400


# ───────────────────────────────────────────────────────────────────────
# 5. duplicate username/email → 409
# ───────────────────────────────────────────────────────────────────────

def test_register_duplicate_rejected(cleanup_mobile_users):
    body = {
        "username": "iter148_dup",
        "email": "iter148_dup@homeme.qa",
        "password": "Mobile1234A",
        "full_name": "مكرر",
        "role": "company_admin",
        "company_name": "Dup Co",
    }
    r = requests.post(f"{API}/mobile/auth/register", json=body)
    assert r.status_code == 201
    r = requests.post(f"{API}/mobile/auth/register", json=body)
    assert r.status_code == 409


# ───────────────────────────────────────────────────────────────────────
# 6. company_admin without company_name → 400
# ───────────────────────────────────────────────────────────────────────

def test_company_admin_requires_company_name(cleanup_mobile_users):
    r = requests.post(f"{API}/mobile/auth/register", json={
        "username": "iter148_co_no_name",
        "email": "iter148_co_no_name@homeme.qa",
        "password": "Mobile1234A",
        "full_name": "بدون اسم شركة",
        "role": "company_admin",
        # company_name missing
    })
    assert r.status_code == 400


# ───────────────────────────────────────────────────────────────────────
# 7. full OTP cycle: verify wrong + verify correct
# ───────────────────────────────────────────────────────────────────────

def test_otp_verify_wrong_then_correct(
        cleanup_mobile_users, event_loop, db, sample_compound):
    email = "iter148_otp@homeme.qa"
    r = requests.post(f"{API}/mobile/auth/register", json={
        "username": "iter148_otp",
        "email": email,
        "password": "Mobile1234A",
        "full_name": "ساكن OTP",
        "role": "resident",
        "compound_id": sample_compound,
        "unit_number": "B-1",
    })
    assert r.status_code == 201

    # Wrong OTP → 400
    r = requests.post(f"{API}/mobile/auth/verify-otp",
                      json={"email": email, "otp": "000000"})
    assert r.status_code == 400

    # Pull real OTP from DB
    async def pull():
        return await db.email_otps.find_one(
            {"email": email, "used_at": None},
            sort=[("created_at", -1)],
        )
    otp_doc = event_loop.run_until_complete(pull())
    assert otp_doc, "OTP doc not found"
    code = otp_doc["code"]

    # Correct OTP → 200 + verified
    r = requests.post(f"{API}/mobile/auth/verify-otp",
                      json={"email": email, "otp": code})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["verified"] is True
    assert j["user"]["email_verified"] is True


# ───────────────────────────────────────────────────────────────────────
# 8. resend cooldown: second call within 60s → 429
# ───────────────────────────────────────────────────────────────────────

def test_resend_cooldown(cleanup_mobile_users):
    email = "iter148_resend@homeme.qa"
    requests.post(f"{API}/mobile/auth/register", json={
        "username": "iter148_resend",
        "email": email,
        "password": "Mobile1234A",
        "full_name": "اختبار Cooldown",
        "role": "company_admin",
        "company_name": "Resend Co",
    })
    # Registration already sent OTP. Immediately request resend → must be cooldown.
    r1 = requests.post(f"{API}/mobile/auth/resend-otp", json={"email": email})
    assert r1.status_code == 429, \
        f"Expected 429 cooldown on first resend (OTP just sent at register), got {r1.status_code}: {r1.text}"


# ───────────────────────────────────────────────────────────────────────
# 9. login + /me happy path
# ───────────────────────────────────────────────────────────────────────

def test_login_and_me(cleanup_mobile_users):
    # Register
    r = requests.post(f"{API}/mobile/auth/register", json={
        "username": "iter148_login1",
        "email": "iter148_login1@homeme.qa",
        "password": "Mobile1234A",
        "full_name": "Login Tester",
        "role": "company_admin",
        "company_name": "iter148 Login",
    })
    assert r.status_code == 201

    # Login
    r = requests.post(f"{API}/mobile/auth/login", json={
        "username": "iter148_login1",
        "password": "Mobile1234A",
    })
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    assert token

    # /me with token
    r = requests.get(f"{API}/mobile/auth/me",
                     headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["user"]["username"] == "iter148_login1"


# ───────────────────────────────────────────────────────────────────────
# 10. wrong password → 401
# ───────────────────────────────────────────────────────────────────────

def test_login_wrong_password(cleanup_mobile_users):
    requests.post(f"{API}/mobile/auth/register", json={
        "username": "iter148_wrong",
        "email": "iter148_wrong@homeme.qa",
        "password": "Mobile1234A",
        "full_name": "x",
        "role": "company_admin",
        "company_name": "x",
    })
    r = requests.post(f"{API}/mobile/auth/login", json={
        "username": "iter148_wrong",
        "password": "WrongPass123",
    })
    assert r.status_code == 401


# ───────────────────────────────────────────────────────────────────────
# 11. /me without token → 401
# ───────────────────────────────────────────────────────────────────────

def test_me_requires_auth():
    r = requests.get(f"{API}/mobile/auth/me")
    assert r.status_code in (401, 403)


# ───────────────────────────────────────────────────────────────────────
# 12. resend on unknown email returns generic (anti-enumeration)
# ───────────────────────────────────────────────────────────────────────

def test_resend_anti_enumeration():
    r = requests.post(f"{API}/mobile/auth/resend-otp", json={
        "email": "iter148_unknown_999@homeme.qa"
    })
    # Should be 200 with generic message — does NOT leak that the email is not registered
    assert r.status_code == 200
    assert r.json().get("sent") is False
