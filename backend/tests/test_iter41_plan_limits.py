"""
Iteration 41 — Plan Limits Enforcement tests.

Covers:
  - GET /api/company-admin/plan-usage (shape + values)
  - POST /api/company-admin/compounds 403 with detail.code == plan_limit_compounds
  - Error response structure (code, message, current_plan, current_plan_name_ar,
    current_count, max_allowed)
  - Regression smoke: login for app_owner / super_admin / company_admin
"""
import os
import pytest
import requests
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

load_dotenv("/app/backend/.env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # fallback to frontend .env
    from dotenv import dotenv_values
    BASE_URL = dotenv_values("/app/frontend/.env").get("REACT_APP_BACKEND_URL", "").rstrip("/")

COMPANY_ID = "ab8e7501-964c-4424-859f-af16ba8ad2e5"

CREDS = {
    "app_owner":     {"username": "Owner_homeme", "password": "Dalia1234@"},
    "super_admin":   {"username": "superadmin",   "password": "SuperAdmin2024!"},
    "company_admin": {"username": "testcompany2", "password": "Company123!"},
}


# ── Mongo helpers to flip the plan in / out of starter ─────────────
def _db():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    return client[os.environ["DB_NAME"]]


async def _set_plan(plan: str):
    db = _db()
    await db.company_subscriptions.update_one(
        {"company_id": COMPANY_ID}, {"$set": {"plan": plan}}
    )


def set_plan_sync(plan: str):
    asyncio.get_event_loop().run_until_complete(_set_plan(plan))


# ── Fixtures ───────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def tokens():
    out = {}
    for key, creds in CREDS.items():
        r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=15)
        assert r.status_code == 200, f"{key} login failed: {r.status_code} {r.text[:200]}"
        out[key] = r.json()["access_token"]
    return out


@pytest.fixture(scope="session", autouse=True)
def _preserve_and_restore_plan():
    """Capture original plan, yield, then restore — regardless of test outcome."""
    async def get():
        return (await _db().company_subscriptions.find_one({"company_id": COMPANY_ID}, {"_id": 0, "plan": 1}) or {}).get("plan")
    original = asyncio.get_event_loop().run_until_complete(get())
    yield original
    if original:
        asyncio.get_event_loop().run_until_complete(_set_plan(original))


# ── 1. Regression smoke: all three logins work ─────────────────────
class TestAuthRegression:
    @pytest.mark.parametrize("role", ["app_owner", "super_admin", "company_admin"])
    def test_login(self, role):
        r = requests.post(f"{BASE_URL}/api/auth/login", json=CREDS[role], timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data.get("user", {}).get("role") in ("app_owner", "super_admin", "company_admin")


# ── 2. GET /api/company-admin/plan-usage ───────────────────────────
class TestPlanUsageEndpoint:
    def test_shape_enterprise(self, tokens, _preserve_and_restore_plan):
        set_plan_sync("company_enterprise")
        r = requests.get(
            f"{BASE_URL}/api/company-admin/plan-usage",
            headers={"Authorization": f"Bearer {tokens['company_admin']}"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("plan", "plan_name_ar", "max_compounds", "max_residents",
                  "current_compounds", "current_residents", "can_add_compound", "can_add_resident"):
            assert k in d, f"missing key {k}"
        assert d["plan"] == "company_enterprise"
        assert d["max_compounds"] == -1 and d["max_residents"] == -1
        assert d["can_add_compound"] is True and d["can_add_resident"] is True
        assert isinstance(d["current_compounds"], int) and d["current_compounds"] >= 1
        assert isinstance(d["current_residents"], int) and d["current_residents"] >= 0

    def test_shape_starter(self, tokens):
        set_plan_sync("starter")
        r = requests.get(
            f"{BASE_URL}/api/company-admin/plan-usage",
            headers={"Authorization": f"Bearer {tokens['company_admin']}"},
            timeout=15,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["plan"] == "starter"
        assert d["plan_name_ar"] == "مجاني"
        assert d["max_compounds"] == 1
        assert d["max_residents"] == 50
        # testcompany2 already has 1 compound so can_add_compound should be False
        assert d["can_add_compound"] is False
        assert d["can_add_resident"] is True  # residents=4 < 50

    def test_unauthorized(self):
        r = requests.get(f"{BASE_URL}/api/company-admin/plan-usage", timeout=15)
        assert r.status_code in (401, 403)


# ── 3. POST /api/company-admin/compounds — 403 plan_limit_compounds ─
class TestCompoundCreationLimit:
    def test_403_when_at_limit(self, tokens):
        set_plan_sync("starter")
        r = requests.post(
            f"{BASE_URL}/api/company-admin/compounds",
            headers={"Authorization": f"Bearer {tokens['company_admin']}"},
            json={"name": "TEST_PlanLimit_Compound"},
            timeout=15,
        )
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text[:400]}"
        body = r.json()
        assert "detail" in body
        d = body["detail"]
        # Structure
        assert isinstance(d, dict), f"detail must be object, got: {d!r}"
        assert d.get("code") == "plan_limit_compounds"
        assert isinstance(d.get("message"), str) and len(d["message"]) > 0
        assert d.get("current_plan") == "starter"
        assert d.get("current_plan_name_ar") == "مجاني"
        assert isinstance(d.get("current_count"), int) and d["current_count"] >= 1
        assert d.get("max_allowed") == 1

    def test_200_when_enterprise(self, tokens):
        set_plan_sync("company_enterprise")
        name = "TEST_PlanLimit_Enterprise_Compound"
        r = requests.post(
            f"{BASE_URL}/api/company-admin/compounds",
            headers={"Authorization": f"Bearer {tokens['company_admin']}"},
            json={"name": name},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        compound_id = r.json()["compound"]["id"]
        # Cleanup - delete with force
        requests.delete(
            f"{BASE_URL}/api/company-admin/compounds/{compound_id}?force=true",
            headers={"Authorization": f"Bearer {tokens['company_admin']}"},
            timeout=15,
        )


# ── 4. Resident limit 403 via live endpoint (temp-patch plan file) ─
class TestResidentLimit:
    """
    Temporarily rewrite /app/backend/plan_limits.py so that starter's
    max_residents = 1, then trigger POST /company-admin/compounds/{id}/users
    with role=resident to observe a real 403 plan_limit_residents. Restores
    the file afterwards. Relies on FastAPI hot-reload (uvicorn --reload).
    """

    def test_403_plan_limit_residents(self, tokens):
        path = "/app/backend/plan_limits.py"
        with open(path, "r", encoding="utf-8") as f:
            original = f.read()
        patched = original.replace(
            '"starter":            {"max_compounds": 1,  "max_residents": 50},',
            '"starter":            {"max_compounds": 1,  "max_residents": 1},',
        )
        assert patched != original, "patch marker not found"
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(patched)
            import time; time.sleep(3)  # wait for hot-reload
            set_plan_sync("starter")

            compound_id = "88ad3711-c9ae-45fe-a270-65f4524c071c"
            r = requests.post(
                f"{BASE_URL}/api/company-admin/compounds/{compound_id}/users",
                headers={"Authorization": f"Bearer {tokens['company_admin']}"},
                json={
                    "username": "TEST_plan_limit_resident",
                    "email": "TEST_plan_limit_resident@example.com",
                    "password": "Passw0rd!",
                    "full_name": "Plan Limit Test Resident",
                    "role": "resident",
                },
                timeout=20,
            )
            assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text[:400]}"
            body = r.json()
            d = body["detail"]
            assert isinstance(d, dict)
            assert d.get("code") == "plan_limit_residents"
            assert isinstance(d.get("message"), str) and len(d["message"]) > 0
            assert d.get("current_plan") == "starter"
            assert d.get("current_plan_name_ar") == "مجاني"
            assert d.get("max_allowed") == 1
            assert isinstance(d.get("current_count"), int) and d["current_count"] >= 1
        finally:
            with open(path, "w", encoding="utf-8") as f:
                f.write(original)
            import time; time.sleep(2)


if __name__ == "__main__":
    import sys
    sys.exit(pytest.main([__file__, "-v", "--tb=short"]))
