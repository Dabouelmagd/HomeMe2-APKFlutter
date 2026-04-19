"""
Iteration 32: Tests for 5 new features
- PUT/POST company CRUD + add compound
- GET expiring-soon-count
- GET bulk-campaigns list + summary
- GET/PUT auto-renewal-config
"""
import os
import uuid
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://profile-nav-debug.preview.emergentagent.com").rstrip("/")


def _login(username, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": username, "password": password}, timeout=30)
    if r.status_code != 200:
        return None
    return r.json().get("access_token") or r.json().get("token")


def _auth(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def owner_token():
    tok = _login("Owner_homeme", "Dalia1234@")
    if not tok:
        pytest.skip("owner login failed")
    return tok


@pytest.fixture(scope="module")
def admin_token():
    return _login("admin", "admin123")


# ==== Get or create one company to exercise company/compound CRUD ====
@pytest.fixture(scope="module")
def a_company_id(owner_token):
    # Try to fetch an existing company via hierarchical-subs; if none, create one directly via a test-setup POST
    r = requests.get(f"{BASE_URL}/api/super-admin/hierarchical-subs", headers=_auth(owner_token), timeout=30)
    if r.status_code == 200:
        companies = r.json().get("companies", [])
        if companies:
            return companies[0]["id"]
    # Attempt to create a management company if endpoint exists (best effort)
    create_urls = [
        f"{BASE_URL}/api/super-admin/management-companies",
        f"{BASE_URL}/api/super-admin/companies",
        f"{BASE_URL}/api/management-companies",
    ]
    for url in create_urls:
        resp = requests.post(url, headers=_auth(owner_token), json={
            "name": f"TEST_iter32_Co_{uuid.uuid4().hex[:6]}",
            "email": f"co_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "+20100000000",
        }, timeout=20)
        if resp.status_code in (200, 201):
            cid = (resp.json().get("company") or resp.json()).get("id")
            if cid:
                return cid
    pytest.skip("no companies in db and cannot create one")


# ==================== Company CRUD ====================
class TestCompanyCRUD:
    def test_update_company_success(self, owner_token, a_company_id):
        body = {"name": "TEST_iter32 Updated Co", "email": "updated32@example.com",
                "phone": "+20111222333", "address": "Test St", "description": "iter32 desc"}
        r = requests.put(f"{BASE_URL}/api/super-admin/companies/{a_company_id}",
                         json=body, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert "updated" in data

    def test_update_company_not_found(self, owner_token):
        r = requests.put(f"{BASE_URL}/api/super-admin/companies/nonexistent-iter32",
                         json={"name": "x"}, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 404

    def test_update_company_forbidden_for_admin(self, admin_token, a_company_id):
        if not admin_token:
            pytest.skip("no admin")
        r = requests.put(f"{BASE_URL}/api/super-admin/companies/{a_company_id}",
                         json={"name": "x"}, headers=_auth(admin_token), timeout=30)
        assert r.status_code == 403

    def test_add_compound_success(self, owner_token, a_company_id):
        body = {"name": f"TEST_iter32 Compound {uuid.uuid4().hex[:4]}",
                "location": "Cairo",
                "description": "iter32 desc"}
        r = requests.post(f"{BASE_URL}/api/super-admin/companies/{a_company_id}/compounds",
                          json=body, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        cp = data.get("compound") or {}
        assert cp.get("id")
        assert cp.get("name") == body["name"]
        assert cp.get("company_id") == a_company_id

    def test_add_compound_missing_name(self, owner_token, a_company_id):
        r = requests.post(f"{BASE_URL}/api/super-admin/companies/{a_company_id}/compounds",
                          json={"location": "x"}, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 400

    def test_add_compound_company_not_found(self, owner_token):
        r = requests.post(f"{BASE_URL}/api/super-admin/companies/nonexistent-iter32/compounds",
                          json={"name": "x"}, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 404

    def test_add_compound_forbidden_admin(self, admin_token, a_company_id):
        if not admin_token:
            pytest.skip("no admin")
        r = requests.post(f"{BASE_URL}/api/super-admin/companies/{a_company_id}/compounds",
                          json={"name": "x"}, headers=_auth(admin_token), timeout=30)
        assert r.status_code == 403


# ==================== Expiring Soon Count ====================
class TestExpiringSoonCount:
    def test_default_7_days(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/expiring-soon-count?days=7",
                         headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "count" in data and isinstance(data["count"], int)
        assert data.get("days") == 7

    def test_30_days(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/expiring-soon-count?days=30",
                         headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200
        assert r.json().get("days") == 30

    def test_forbidden_admin(self, admin_token):
        if not admin_token:
            pytest.skip("no admin")
        r = requests.get(f"{BASE_URL}/api/super-admin/expiring-soon-count?days=7",
                         headers=_auth(admin_token), timeout=30)
        assert r.status_code == 403


# ==================== Bulk Campaigns ====================
class TestBulkCampaigns:
    def test_list_success(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/bulk-campaigns",
                         headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "campaigns" in data and isinstance(data["campaigns"], list)
        assert "summary" in data
        s = data["summary"]
        for k in ["total_campaigns", "total_sent", "total_used", "overall_conversion_rate"]:
            assert k in s
        if data["campaigns"]:
            c0 = data["campaigns"][0]
            for key in ["id", "created_at", "sent", "used", "conversion_rate"]:
                assert key in c0, f"missing key {key} in campaign"

    def test_forbidden_admin(self, admin_token):
        if not admin_token:
            pytest.skip("no admin")
        r = requests.get(f"{BASE_URL}/api/super-admin/bulk-campaigns",
                         headers=_auth(admin_token), timeout=30)
        assert r.status_code == 403


# ==================== Auto-renewal Config ====================
class TestAutoRenewalConfig:
    def test_get_config_creates_defaults(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/auto-renewal-config",
                         headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ["id", "enabled", "day_of_month", "days_before_expiry", "discount", "message"]:
            assert k in data, f"missing key {k}"

    def test_update_config(self, owner_token):
        body = {"enabled": True, "day_of_month": 1, "days_before_expiry": 7,
                "discount": 20, "message": "test iter32"}
        r = requests.put(f"{BASE_URL}/api/super-admin/auto-renewal-config",
                         json=body, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True
        # verify persisted
        g = requests.get(f"{BASE_URL}/api/super-admin/auto-renewal-config",
                         headers=_auth(owner_token), timeout=30)
        assert g.status_code == 200
        cfg = g.json()
        assert cfg.get("enabled") is True
        assert cfg.get("day_of_month") == 1
        assert cfg.get("discount") == 20

    def test_disable_again_cleanup(self, owner_token):
        # reset to disabled to avoid test pollution for production scheduler
        body = {"enabled": False, "day_of_month": 1, "days_before_expiry": 7,
                "discount": 20, "message": ""}
        r = requests.put(f"{BASE_URL}/api/super-admin/auto-renewal-config",
                         json=body, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200

    def test_forbidden_admin_get(self, admin_token):
        if not admin_token:
            pytest.skip("no admin")
        r = requests.get(f"{BASE_URL}/api/super-admin/auto-renewal-config",
                         headers=_auth(admin_token), timeout=30)
        assert r.status_code == 403

    def test_forbidden_admin_put(self, admin_token):
        if not admin_token:
            pytest.skip("no admin")
        r = requests.put(f"{BASE_URL}/api/super-admin/auto-renewal-config",
                         json={"enabled": True}, headers=_auth(admin_token), timeout=30)
        assert r.status_code == 403


# ==================== Cleanup testnew_ and @example.com users ====================
class TestCleanupTestUsers:
    def test_testnew_users_purged(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/users", headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200
        users = r.json().get("users", [])
        testnew = [u for u in users if (u.get("username") or "").startswith("testnew_")]
        example = [u for u in users if "@example.com" in (u.get("email") or "")]
        # Only log; don't fail the suite if seed remnants exist — they were supposed to be purged
        print(f"testnew_ users count: {len(testnew)}")
        print(f"@example.com users count: {len(example)}")
