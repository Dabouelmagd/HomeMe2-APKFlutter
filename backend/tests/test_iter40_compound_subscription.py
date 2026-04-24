"""Iteration 40 — Compound Subscription endpoints + auth subscription fields propagation."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://profile-nav-debug.preview.emergentagent.com").rstrip("/")
ROYAL_CITY_CID = "88ad3711-c9ae-45fe-a270-65f4524c071c"


def _login(username, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": username, "password": password}, timeout=15)
    return r


@pytest.fixture(scope="module")
def owner_token():
    r = _login("Owner_homeme", "Dalia1234@")
    assert r.status_code == 200, f"owner login failed: {r.text}"
    return r.json()["access_token"], r.json()["user"]


@pytest.fixture(scope="module")
def dalia_token():
    # Royal City compound admin. Per test_credentials.md, user 'admin' (role=admin,
    # compound=Royal City, subscription_type=lifetime) uses password 'admin123'.
    # The 'dalia' username login credentials provided in review are stale (401).
    r = _login("admin", "admin123")
    assert r.status_code == 200, f"royal-city admin login failed: {r.text}"
    return r.json()["access_token"], r.json()["user"]


# ---------- AUTH: login returns subscription fields ----------
class TestLoginSubscriptionFields:
    def test_login_returns_subscription_fields_dalia(self, dalia_token):
        _, user = dalia_token
        assert "subscription_active" in user
        assert "subscription_type" in user
        assert "subscription_plan" in user
        assert "subscription_end" in user
        # Royal City is lifetime
        assert user["subscription_type"] == "lifetime", f"Expected lifetime, got {user['subscription_type']}"
        assert user["subscription_active"] is True

    def test_login_returns_subscription_fields_owner(self, owner_token):
        _, user = owner_token
        assert "subscription_type" in user
        assert "subscription_active" in user


# ---------- AUTH: /me returns subscription fields ----------
class TestAuthMeSubscriptionFields:
    def test_me_dalia_lifetime(self, dalia_token):
        token, _ = dalia_token
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        for key in ["subscription_active", "subscription_type", "subscription_plan",
                    "subscription_end", "subscription_code_used"]:
            assert key in data, f"missing {key} in /auth/me"
        assert data["subscription_type"] == "lifetime"
        assert data["subscription_active"] is True

    def test_me_owner_returns_subscription_type(self, owner_token):
        token, _ = owner_token
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 200
        assert "subscription_type" in r.json()


# ---------- Compound subscription GET ----------
class TestCompoundSubscriptionGet:
    def test_owner_can_get_royal_city_subscription(self, owner_token):
        token, _ = owner_token
        r = requests.get(f"{BASE_URL}/api/compounds/{ROYAL_CITY_CID}/subscription",
                         headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["compound_id"] == ROYAL_CITY_CID
        assert "compound_name" in data
        sub = data["subscription"]
        for key in ["subscription_active", "subscription_type", "subscription_plan",
                    "subscription_start", "subscription_end", "subscription_code_used",
                    "days_remaining"]:
            assert key in sub
        assert sub["subscription_type"] == "lifetime"
        assert sub["subscription_active"] is True
        plans = data["plans"]
        assert "residential" in plans and "company" in plans
        assert len(plans["residential"]) >= 4
        assert len(plans["company"]) >= 3
        # Verify plan shape
        first = plans["residential"][0]
        for k in ["key", "name_ar", "name_en", "monthly_egp"]:
            assert k in first

    def test_compound_admin_dalia_can_get_own_compound(self, dalia_token):
        token, user = dalia_token
        assert user["compound_id"] == ROYAL_CITY_CID
        r = requests.get(f"{BASE_URL}/api/compounds/{ROYAL_CITY_CID}/subscription",
                         headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["subscription"]["subscription_type"] == "lifetime"

    def test_admin_of_different_compound_gets_403(self, dalia_token):
        token, _ = dalia_token
        other_cid = "00000000-0000-0000-0000-000000000000"
        r = requests.get(f"{BASE_URL}/api/compounds/{other_cid}/subscription",
                         headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"

    def test_unauth_returns_401_or_403(self):
        r = requests.get(f"{BASE_URL}/api/compounds/{ROYAL_CITY_CID}/subscription", timeout=15)
        assert r.status_code in (401, 403)


# ---------- Compound subscription POST apply-code ----------
class TestApplyCode:
    def test_invalid_code_returns_400(self, owner_token):
        token, _ = owner_token
        r = requests.post(f"{BASE_URL}/api/compounds/{ROYAL_CITY_CID}/subscription/apply-code",
                          json={"code": "INVALID-XXXX-XXXX"},
                          headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
        # Error message should be present
        assert "detail" in r.json()

    def test_admin_of_other_compound_cannot_apply(self, dalia_token):
        token, _ = dalia_token
        other_cid = "00000000-0000-0000-0000-000000000000"
        r = requests.post(f"{BASE_URL}/api/compounds/{other_cid}/subscription/apply-code",
                          json={"code": "INVALID"},
                          headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 403

    def test_empty_code_returns_400(self, owner_token):
        token, _ = owner_token
        r = requests.post(f"{BASE_URL}/api/compounds/{ROYAL_CITY_CID}/subscription/apply-code",
                          json={"code": ""},
                          headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 400
