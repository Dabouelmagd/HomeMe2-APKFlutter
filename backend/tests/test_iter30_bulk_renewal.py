"""
Iteration 30 — Bulk Renewal Offer + Gift Email + Full-Details improvements.

Covers:
- POST /api/super-admin/users/{user_id}/send-gift now includes 'email' key
- POST /api/super-admin/bulk-renewal-offer/preview
- POST /api/super-admin/bulk-renewal-offer/send (auto-fetch + specific user_ids)
- Auth guard: admin role gets 403 on send
- GET /api/super-admin/compounds/{id}/full-details returns new keys
- Regression: hierarchical-subs, dashboard, users endpoints still work
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL missing"

OWNER = {"username": "Owner_homeme", "password": "Dalia1234@"}
SUPERADMIN = {"username": "superadmin", "password": "SuperAdmin2024!"}
ADMIN = {"username": "admin", "password": "admin123"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"Login failed for {creds['username']}: {r.status_code} {r.text[:200]}"
    data = r.json()
    tok = data.get("token") or data.get("access_token")
    assert tok, f"no token in login response: {data}"
    return tok


@pytest.fixture(scope="module")
def owner_headers():
    return {"Authorization": f"Bearer {_login(OWNER)}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_headers():
    try:
        return {"Authorization": f"Bearer {_login(ADMIN)}", "Content-Type": "application/json"}
    except AssertionError:
        pytest.skip("admin creds unavailable")


@pytest.fixture(scope="module")
def users_list(owner_headers):
    r = requests.get(f"{BASE_URL}/api/super-admin/users", headers=owner_headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    users = data if isinstance(data, list) else data.get("users", [])
    return users


# ---------------------------------------------------------------
# 1) send-gift now returns an 'email' key
# ---------------------------------------------------------------
class TestSendGiftEmail:
    def test_send_gift_returns_email_key(self, owner_headers, users_list):
        # pick user with email
        user_with_email = next((u for u in users_list if u.get("email")), None)
        assert user_with_email, "no user with email in seed"
        uid = user_with_email["id"]
        r = requests.post(
            f"{BASE_URL}/api/super-admin/users/{uid}/send-gift",
            headers=owner_headers,
            json={"type": "discount_coupon", "discount": 10, "message": "TEST_iter30 gift email"},
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("success") is True
        assert "email" in data, "expected 'email' key in response"
        email_info = data["email"]
        assert isinstance(email_info, dict)
        assert "sent" in email_info, f"expected sent in email dict: {email_info}"
        assert isinstance(email_info["sent"], bool)

    def test_send_gift_no_email_user(self, owner_headers, users_list):
        user_no_email = next((u for u in users_list if not u.get("email")), None)
        if not user_no_email:
            pytest.skip("all users have emails")
        uid = user_no_email["id"]
        r = requests.post(
            f"{BASE_URL}/api/super-admin/users/{uid}/send-gift",
            headers=owner_headers,
            json={"type": "extend_trial", "days": 3, "message": "TEST_iter30 no-email"},
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("email", {}).get("sent") is False
        assert data["email"].get("reason") == "no_email"


# ---------------------------------------------------------------
# 2) bulk-renewal-offer preview
# ---------------------------------------------------------------
class TestBulkRenewalPreview:
    def test_preview_7(self, owner_headers):
        r = requests.post(
            f"{BASE_URL}/api/super-admin/bulk-renewal-offer/preview?days_before_expiry=7",
            headers=owner_headers, timeout=15,
        )
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert set(["targets", "count", "days_before_expiry"]).issubset(data.keys())
        assert isinstance(data["targets"], list)
        assert isinstance(data["count"], int)
        assert data["days_before_expiry"] == 7
        assert data["count"] == len(data["targets"])

    def test_preview_30(self, owner_headers):
        r = requests.post(
            f"{BASE_URL}/api/super-admin/bulk-renewal-offer/preview?days_before_expiry=30",
            headers=owner_headers, timeout=15,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["days_before_expiry"] == 30


# ---------------------------------------------------------------
# 3) bulk-renewal-offer send (auto-fetch) + 4) explicit user_ids
# ---------------------------------------------------------------
class TestBulkRenewalSend:
    def test_send_auto_fetch(self, owner_headers):
        r = requests.post(
            f"{BASE_URL}/api/super-admin/bulk-renewal-offer/send",
            headers=owner_headers,
            json={"days_before_expiry": 7, "discount": 20, "message": "TEST_iter30 bulk auto", "user_ids": []},
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("success") is True
        for key in ["sent", "emails_sent", "failed", "discount"]:
            assert key in data, f"missing key {key} in {data}"
        assert isinstance(data["sent"], int)
        assert isinstance(data["emails_sent"], int)
        assert isinstance(data["failed"], int)
        assert data["discount"] == 20

    def test_send_explicit_user_ids_creates_renew_coupon(self, owner_headers, users_list):
        # pick 1-2 residents
        residents = [u["id"] for u in users_list if u.get("role") == "resident"][:2]
        if not residents:
            # fall back to any users
            residents = [u["id"] for u in users_list][:2]
        assert len(residents) >= 1, "need at least 1 user"
        r = requests.post(
            f"{BASE_URL}/api/super-admin/bulk-renewal-offer/send",
            headers=owner_headers,
            json={"days_before_expiry": 7, "discount": 25, "message": "TEST_iter30 explicit", "user_ids": residents},
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data["success"] is True
        assert data["sent"] == len(residents), f"expected sent={len(residents)}, got {data['sent']}"
        assert data["discount"] == 25

        # verify coupons created
        cr = requests.get(f"{BASE_URL}/api/coupons", headers=owner_headers, timeout=15)
        assert cr.status_code == 200
        cdata = cr.json()
        coupons = cdata if isinstance(cdata, list) else cdata.get("coupons", [])
        renew_coupons = [c for c in coupons if str(c.get("code", "")).startswith("RENEW-")]
        assert len(renew_coupons) >= len(residents), (
            f"expected >= {len(residents)} RENEW-* coupons, got {len(renew_coupons)}"
        )
        # Check one RENEW coupon has campaign bulk_renewal & correct discount (25)
        # (there may be multiple — at least one with discount 25)
        matching = [c for c in renew_coupons if c.get("campaign") == "bulk_renewal" and c.get("discount_value") == 25]
        assert matching, f"No RENEW-* coupon with campaign=bulk_renewal and discount=25 found"


# ---------------------------------------------------------------
# 5) admin gets 403
# ---------------------------------------------------------------
class TestBulkRenewalAuthGuard:
    def test_admin_forbidden(self, admin_headers):
        r = requests.post(
            f"{BASE_URL}/api/super-admin/bulk-renewal-offer/send",
            headers=admin_headers,
            json={"days_before_expiry": 7, "discount": 20, "user_ids": []},
            timeout=15,
        )
        assert r.status_code == 403, f"expected 403 for admin, got {r.status_code} {r.text[:200]}"


# ---------------------------------------------------------------
# 6) full-details has ads_targeted/ads_global separation
# ---------------------------------------------------------------
class TestFullDetails:
    def test_full_details_keys(self, owner_headers):
        r = requests.get(f"{BASE_URL}/api/super-admin/hierarchical-subs", headers=owner_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        compounds = data.get("independent_compounds", [])
        if not compounds:
            # maybe in companies[]
            companies = data.get("companies", [])
            for c in companies:
                compounds.extend(c.get("compounds", []))
        assert compounds, "no compounds found in hierarchical-subs"
        cid = compounds[0].get("id") or compounds[0].get("compound_id")
        assert cid

        fr = requests.get(f"{BASE_URL}/api/super-admin/compounds/{cid}/full-details",
                          headers=owner_headers, timeout=20)
        assert fr.status_code == 200, fr.text[:300]
        fd = fr.json()
        expected_keys = {
            "compound", "stats", "users_by_role", "families", "recent_complaints",
            "services", "budget", "ads", "ads_targeted", "ads_global", "subscription"
        }
        missing = expected_keys - set(fd.keys())
        assert not missing, f"missing keys: {missing}"
        stats = fd["stats"]
        assert "ads_targeted_count" in stats
        assert "ads_global_count" in stats
        assert stats["ads_targeted_count"] == len(fd["ads_targeted"])
        assert stats["ads_global_count"] == len(fd["ads_global"])
        # ads = targeted + global dedup
        targeted_ids = {a.get("id") for a in fd["ads_targeted"]}
        global_ids = {a.get("id") for a in fd["ads_global"]}
        union = targeted_ids | global_ids
        ads_ids = {a.get("id") for a in fd["ads"]}
        assert ads_ids == union, "ads should be dedup union of targeted + global"


# ---------------------------------------------------------------
# 7) regression
# ---------------------------------------------------------------
class TestRegression:
    def test_hierarchical_subs(self, owner_headers):
        r = requests.get(f"{BASE_URL}/api/super-admin/hierarchical-subs", headers=owner_headers, timeout=15)
        assert r.status_code == 200

    def test_dashboard(self, owner_headers):
        r = requests.get(f"{BASE_URL}/api/super-admin/dashboard", headers=owner_headers, timeout=15)
        assert r.status_code == 200

    def test_users_list(self, owner_headers):
        r = requests.get(f"{BASE_URL}/api/super-admin/users", headers=owner_headers, timeout=15)
        assert r.status_code == 200
