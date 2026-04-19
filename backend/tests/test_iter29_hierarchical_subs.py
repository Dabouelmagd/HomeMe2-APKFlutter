"""
Iteration 29: Tests for Hierarchical Subscriptions + Send Gift + Compound Full Details
Endpoints:
- GET  /api/super-admin/hierarchical-subs
- POST /api/super-admin/users/{user_id}/send-gift
- GET  /api/super-admin/compounds/{compound_id}/full-details
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://profile-nav-debug.preview.emergentagent.com").rstrip("/")


def _login(username: str, password: str):
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": username, "password": password},
        timeout=30,
    )
    if r.status_code != 200:
        return None
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module")
def owner_token():
    tok = _login("Owner_homeme", "Dalia1234@")
    if not tok:
        pytest.skip("App owner login failed")
    return tok


@pytest.fixture(scope="module")
def superadmin_token():
    tok = _login("superadmin", "SuperAdmin2024!")
    if not tok:
        pytest.skip("Super admin login failed")
    return tok


@pytest.fixture(scope="module")
def admin_token():
    return _login("admin", "admin123")


def _auth(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- hierarchical-subs ----------
class TestHierarchicalSubs:
    def test_as_app_owner(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/hierarchical-subs", headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert set(["companies", "independent_compounds", "totals"]).issubset(data.keys())
        t = data["totals"]
        for k in ["companies", "compounds", "total_users", "residents", "managers", "security", "active_subs", "expired_subs"]:
            assert k in t, f"totals missing key: {k}"
            assert isinstance(t[k], int)
        assert isinstance(data["companies"], list)
        assert isinstance(data["independent_compounds"], list)

    def test_as_super_admin(self, superadmin_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/hierarchical-subs", headers=_auth(superadmin_token), timeout=30)
        assert r.status_code == 200, r.text
        assert "totals" in r.json()

    def test_forbidden_for_regular_admin(self, admin_token):
        if not admin_token:
            pytest.skip("admin/admin123 login not available")
        r = requests.get(f"{BASE_URL}/api/super-admin/hierarchical-subs", headers=_auth(admin_token), timeout=30)
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"


# ---------- send-gift ----------
@pytest.fixture(scope="module")
def resident_user_id(owner_token):
    r = requests.get(f"{BASE_URL}/api/super-admin/users?role=resident", headers=_auth(owner_token), timeout=30)
    assert r.status_code == 200, r.text
    users = r.json().get("users", [])
    if not users:
        # fall back to any user
        r2 = requests.get(f"{BASE_URL}/api/super-admin/users", headers=_auth(owner_token), timeout=30)
        users = r2.json().get("users", [])
    if not users:
        pytest.skip("No users in db")
    return users[0]["id"]


class TestSendGift:
    def test_extend_trial(self, owner_token, resident_user_id):
        r = requests.post(
            f"{BASE_URL}/api/super-admin/users/{resident_user_id}/send-gift",
            headers=_auth(owner_token),
            json={"type": "extend_trial", "details": {"days": 7}, "message": "TEST_iter29 extend"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True
        assert body["gift"]["type"] == "extend_trial"

    def test_free_subscription(self, owner_token, resident_user_id):
        r = requests.post(
            f"{BASE_URL}/api/super-admin/users/{resident_user_id}/send-gift",
            headers=_auth(owner_token),
            json={"type": "free_subscription", "details": {"days": 30, "plan": "basic"}, "message": "TEST_iter29 free"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert body["gift"]["details"]["plan"] == "basic"

    def test_discount_coupon(self, owner_token, resident_user_id):
        r = requests.post(
            f"{BASE_URL}/api/super-admin/users/{resident_user_id}/send-gift",
            headers=_auth(owner_token),
            json={"type": "discount_coupon", "details": {"discount": 25}, "message": "TEST_iter29 coupon"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        coupon_code = body["gift"]["details"].get("coupon_code", "")
        assert coupon_code.startswith("GIFT-"), f"unexpected code: {coupon_code}"
        # verify coupon created (list endpoint)
        cr = requests.get(f"{BASE_URL}/api/coupons", headers=_auth(owner_token), timeout=30)
        if cr.status_code == 200:
            codes = [c.get("code") for c in cr.json().get("coupons", [])]
            assert coupon_code in codes, "coupon not persisted"

    def test_invalid_type(self, owner_token, resident_user_id):
        r = requests.post(
            f"{BASE_URL}/api/super-admin/users/{resident_user_id}/send-gift",
            headers=_auth(owner_token),
            json={"type": "invalid_type", "details": {}},
            timeout=30,
        )
        assert r.status_code == 400, r.text

    def test_nonexistent_user(self, owner_token):
        r = requests.post(
            f"{BASE_URL}/api/super-admin/users/nonexistent-user-iter29/send-gift",
            headers=_auth(owner_token),
            json={"type": "extend_trial", "details": {"days": 7}},
            timeout=30,
        )
        assert r.status_code == 404, r.text


# ---------- compound full-details ----------
class TestCompoundFullDetails:
    def test_full_details(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/compounds", headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        compounds = r.json().get("compounds", [])
        if not compounds:
            pytest.skip("No compounds in db")
        cid = compounds[0]["id"]
        r2 = requests.get(
            f"{BASE_URL}/api/super-admin/compounds/{cid}/full-details",
            headers=_auth(owner_token),
            timeout=30,
        )
        assert r2.status_code == 200, r2.text
        data = r2.json()
        for k in ["compound", "stats", "users_by_role", "families", "recent_complaints", "services", "budget", "ads", "subscription"]:
            assert k in data, f"missing key: {k}"

    def test_nonexistent_compound(self, owner_token):
        r = requests.get(
            f"{BASE_URL}/api/super-admin/compounds/nonexistent-compound-iter29/full-details",
            headers=_auth(owner_token),
            timeout=30,
        )
        assert r.status_code == 404, r.text
