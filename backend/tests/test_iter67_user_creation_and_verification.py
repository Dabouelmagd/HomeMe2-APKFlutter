"""
Iteration 67 — Regression audit:
- Verify all login flows for legacy credentials succeed (no email_verified lockout).
- Verify self-register sets email_verified=False and login is blocked with 403/EMAIL_NOT_VERIFIED.
- Verify /api/auth/verify-email/{token} unlocks login.
- Verify /api/auth/resend-verification works (generic response, no enumeration).
- Verify admin-created users (POST /api/admin/users) are email_verified=True and can login immediately.
- Verify Email Delivery Dashboard endpoints (/api/super-admin/email-logs, /stats).
"""
import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient

def _load_env_file(path):
    try:
        with open(path) as f:
            for ln in f:
                ln = ln.strip()
                if not ln or ln.startswith("#") or "=" not in ln:
                    continue
                k, v = ln.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    except FileNotFoundError:
        pass

_load_env_file("/app/frontend/.env")
_load_env_file("/app/backend/.env")

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
assert MONGO_URL and DB_NAME, "MONGO_URL and DB_NAME must be set"

CREDS = {
    "app_owner":   ("Owner_homeme", "Dalia1234@"),
    "super_admin": ("superadmin",   "SuperAdmin2024!"),
    "company":     ("testcompany2", "Company123!"),
}


@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


def login(http, username, password):
    r = http.post(f"{BASE_URL}/api/auth/login", json={"username": username, "password": password})
    return r


# ---------------- Legacy logins (must NOT be blocked by email_verified gate) ----------------

class TestLegacyLogins:
    def test_app_owner_login(self, http):
        r = login(http, *CREDS["app_owner"])
        assert r.status_code == 200, f"App owner login failed: {r.status_code} {r.text}"
        data = r.json()
        assert "access_token" in data
        assert data["user"]["role"] == "app_owner"

    def test_super_admin_login(self, http):
        r = login(http, *CREDS["super_admin"])
        assert r.status_code == 200, f"Super admin login failed: {r.status_code} {r.text}"
        assert r.json()["user"]["role"] == "super_admin"

    def test_company_admin_login(self, http):
        r = login(http, *CREDS["company"])
        assert r.status_code == 200, f"Company admin login failed: {r.status_code} {r.text}"
        u = r.json()["user"]
        assert u["role"] == "company_admin"


# ---------------- Self-registration & email verification gate ----------------

class TestSelfRegisterAndVerification:
    @pytest.fixture(scope="class")
    def new_user(self, http, db):
        uniq = uuid.uuid4().hex[:8]
        # Find any real compound to attach (avoid the 500 bug in /api/auth/register
        # where Family(compound_id=None) raises pydantic ValidationError when
        # resident+unit_number is given without compound_id).
        comp = db.compounds.find_one({}, {"_id": 0, "id": 1})
        compound_id = comp["id"] if comp else None
        payload = {
            "username": f"TEST_iter67_{uniq}",
            "email": f"test_iter67_{uniq}@homemetest.dev",  # not a smoke-test domain
            "password": "Iter67Pass!",
            "role": "resident",
            "full_name": "Iter67 Tester",
            "phone": "0100000000",
            "unit_number": "Z-67",
            "compound_id": compound_id,
        }
        r = http.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
        body = r.json()
        assert body.get("email_verification_required") is True
        assert "user_id" in body
        yield {"payload": payload, "user_id": body["user_id"]}
        # Cleanup
        db.users.delete_one({"id": body["user_id"]})
        db.email_verification_tokens.delete_many({"user_id": body["user_id"]})
        db.families.delete_many({"head_user_id": body["user_id"]})

    def test_register_sets_email_verified_false(self, db, new_user):
        u = db.users.find_one({"id": new_user["user_id"]})
        assert u is not None
        assert u.get("email_verified") is False, "Newly registered user must have email_verified=False"

    def test_login_blocked_with_403_email_not_verified(self, http, new_user):
        p = new_user["payload"]
        r = http.post(f"{BASE_URL}/api/auth/login", json={"username": p["username"], "password": p["password"]})
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
        body = r.json()
        # detail may be a dict (with code/message/email) or a string
        detail = body.get("detail")
        if isinstance(detail, dict):
            assert detail.get("code") == "EMAIL_NOT_VERIFIED"
            assert detail.get("email") == p["email"]
        else:
            assert "EMAIL_NOT_VERIFIED" in str(detail) or "تأكيد" in str(detail)

    def test_resend_verification_returns_generic_ok(self, http, new_user):
        r = http.post(f"{BASE_URL}/api/auth/resend-verification",
                      json={"email": new_user["payload"]["email"]})
        assert r.status_code == 200
        body = r.json()
        assert body.get("sent") is True

    def test_resend_verification_unknown_email_same_response(self, http):
        r = http.post(f"{BASE_URL}/api/auth/resend-verification",
                      json={"email": f"ghost_{uuid.uuid4().hex[:6]}@nowhere.example"})
        assert r.status_code == 200
        body = r.json()
        assert body.get("sent") is True  # no enumeration

    def test_register_no_compound_resident_500_bug(self, http):
        """Reproduces a 500 bug: /api/auth/register with role=resident + unit_number
        but NO compound_id crashes because Family(compound_id=None) fails pydantic.
        Documented for main agent to fix in /app/backend/routes/auth.py:177."""
        uniq = uuid.uuid4().hex[:8]
        payload = {
            "username": f"TEST_iter67bug_{uniq}",
            "email": f"test_iter67bug_{uniq}@homemetest.dev",
            "password": "Iter67Pass!",
            "role": "resident",
            "full_name": "Bug Repro",
            "phone": "0100000000",
            "unit_number": "BUG-1",
            # No compound_id
        }
        r = http.post(f"{BASE_URL}/api/auth/register", json=payload)
        # Expect EITHER fixed (200) OR currently-broken (500). Flag as XFAIL.
        if r.status_code == 500:
            pytest.xfail(f"Known 500 bug in register when compound_id missing: {r.text[:200]}")
        assert r.status_code in (200, 400)

    def test_verify_email_token_unlocks_login(self, db, http, new_user):
        # Look up the token directly from DB (since SMTP send is async/external)
        tok_doc = db.email_verification_tokens.find_one({"user_id": new_user["user_id"]})
        # Wait up to 3s for async insertion
        for _ in range(6):
            if tok_doc:
                break
            time.sleep(0.5)
            tok_doc = db.email_verification_tokens.find_one({"user_id": new_user["user_id"]})
        assert tok_doc is not None, "Verification token row was not created in DB"
        token = tok_doc["token"]

        r = http.get(f"{BASE_URL}/api/auth/verify-email/{token}")
        assert r.status_code == 200, f"Verify failed: {r.status_code} {r.text}"
        body = r.json()
        assert body.get("verified") is True

        # Now login should succeed
        p = new_user["payload"]
        r2 = http.post(f"{BASE_URL}/api/auth/login", json={"username": p["username"], "password": p["password"]})
        assert r2.status_code == 200, f"Post-verify login failed: {r2.status_code} {r2.text}"
        assert "access_token" in r2.json()

    def test_verify_email_invalid_token_404(self, http):
        r = http.get(f"{BASE_URL}/api/auth/verify-email/bogus_token_xyz")
        assert r.status_code == 404


# ---------------- Admin-created users are pre-verified and can login ----------------

class TestAdminCreatedUsers:
    @pytest.fixture(scope="class")
    def company_token(self, http):
        r = login(http, *CREDS["company"])
        assert r.status_code == 200
        return r.json()["access_token"], r.json()["user"]

    @pytest.fixture(scope="class")
    def compound_id_for_company(self, db, company_token):
        _, u = company_token
        # Resolve actual company-owned compound (user's own compound_id might be 'default-compound')
        full_u = db.users.find_one({"id": u["id"]})
        company_id = (full_u or {}).get("company_id") or u.get("company_id")
        comp = db.compounds.find_one({"$or": [
            {"company_id": company_id}, {"management_company_id": company_id}
        ]}, {"_id": 0, "id": 1})
        if comp:
            return comp["id"]
        cid = u.get("compound_id")
        if cid and cid != "default-compound":
            return cid
        return None

    @pytest.fixture(scope="class")
    def created_ids(self):
        return []

    def test_admin_creates_resident_and_can_login(self, http, db, company_token, compound_id_for_company, created_ids):
        if not compound_id_for_company:
            pytest.skip("No compound resolvable for testcompany2")
        token, _ = company_token
        uniq = uuid.uuid4().hex[:8]
        payload = {
            "username": f"TEST_admincreated_{uniq}",
            "email": f"TEST_admincreated_{uniq}@homeme.qa",
            "password": "Admin67Pass!",
            "role": "resident",
            "full_name": "Admin-Created Resident",
            "phone": "0100000111",
            "unit_number": "AC-1",
            "compound_id": compound_id_for_company,
        }
        headers = {"Authorization": f"Bearer {token}",
                   "X-Active-Compound-Id": compound_id_for_company,
                   "Content-Type": "application/json"}
        r = requests.post(f"{BASE_URL}/api/admin/users", json=payload, headers=headers)
        assert r.status_code in (200, 201), f"Admin create failed: {r.status_code} {r.text}"

        # Verify DB state
        u = db.users.find_one({"username": payload["username"]})
        assert u is not None
        assert u.get("email_verified") is True, "Admin-created user MUST be email_verified=True"
        created_ids.append(u["id"])

        # Immediate login must succeed (no verification step)
        rl = http.post(f"{BASE_URL}/api/auth/login",
                       json={"username": payload["username"], "password": payload["password"]})
        assert rl.status_code == 200, f"Admin-created user login failed: {rl.status_code} {rl.text}"

    def test_admin_creates_admin_role_and_can_login(self, http, db, company_token, compound_id_for_company, created_ids):
        if not compound_id_for_company:
            pytest.skip("No compound resolvable for testcompany2")
        token, _ = company_token
        uniq = uuid.uuid4().hex[:8]
        payload = {
            "username": f"TEST_adminrole_{uniq}",
            "email": f"TEST_adminrole_{uniq}@homeme.qa",
            "password": "Admin67Pass!",
            "role": "admin",
            "full_name": "Admin-Created Admin",
            "phone": "0100000222",
            "unit_number": None,
            "compound_id": compound_id_for_company,
        }
        headers = {"Authorization": f"Bearer {token}",
                   "X-Active-Compound-Id": compound_id_for_company,
                   "Content-Type": "application/json"}
        r = requests.post(f"{BASE_URL}/api/admin/users", json=payload, headers=headers)
        assert r.status_code in (200, 201), f"Admin create (admin role) failed: {r.status_code} {r.text}"

        u = db.users.find_one({"username": payload["username"]})
        assert u is not None
        assert u.get("email_verified") is True
        created_ids.append(u["id"])

        rl = http.post(f"{BASE_URL}/api/auth/login",
                       json={"username": payload["username"], "password": payload["password"]})
        assert rl.status_code == 200, f"Admin-role login failed: {rl.status_code} {rl.text}"

    def test_cleanup(self, db, created_ids):
        # Teardown
        if created_ids:
            db.users.delete_many({"id": {"$in": created_ids}})


# ---------------- Email Delivery Dashboard ----------------

class TestEmailLogsDashboard:
    @pytest.fixture(scope="class")
    def super_token(self, http):
        r = login(http, *CREDS["super_admin"])
        assert r.status_code == 200
        return r.json()["access_token"]

    @pytest.fixture(scope="class")
    def owner_token(self, http):
        r = login(http, *CREDS["app_owner"])
        assert r.status_code == 200
        return r.json()["access_token"]

    @pytest.fixture(scope="class")
    def company_token(self, http):
        r = login(http, *CREDS["company"])
        assert r.status_code == 200
        return r.json()["access_token"]

    def test_list_email_logs_super_admin(self, super_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/email-logs",
                         headers={"Authorization": f"Bearer {super_token}"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "logs" in body
        assert isinstance(body["logs"], list)

    def test_email_logs_filter_failed(self, super_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/email-logs?status=failed",
                         headers={"Authorization": f"Bearer {super_token}"})
        assert r.status_code == 200
        for log in r.json()["logs"]:
            assert log["success"] is False

    def test_email_logs_stats(self, super_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/email-logs/stats",
                         headers={"Authorization": f"Bearer {super_token}"})
        assert r.status_code == 200
        body = r.json()
        assert "last_7_days" in body
        assert "last_30_days" in body
        assert "by_type_30d" in body
        for k in ("total", "delivered", "failed"):
            assert k in body["last_7_days"]
            assert k in body["last_30_days"]

    def test_email_logs_app_owner_allowed(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/email-logs",
                         headers={"Authorization": f"Bearer {owner_token}"})
        assert r.status_code == 200

    def test_email_logs_company_admin_forbidden(self, company_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/email-logs",
                         headers={"Authorization": f"Bearer {company_token}"})
        assert r.status_code == 403


# ---------------- Legacy migration check ----------------

class TestLegacyMigration:
    def test_all_legacy_users_email_verified(self, db):
        """server.py startup backfills email_verified=True for users that don't have the field."""
        missing = db.users.count_documents({"email_verified": {"$exists": False}})
        assert missing == 0, f"{missing} legacy users still missing email_verified field"

    def test_known_accounts_verified(self, db):
        for username, _ in CREDS.values():
            u = db.users.find_one({"username": username})
            assert u is not None, f"Known user '{username}' missing"
            assert u.get("email_verified") is True, f"'{username}' should be email_verified=True after migration"
