"""
Iteration 38 — Verify Super Admin route split across 4 files
(superadmin.py, superadmin_gifts.py, superadmin_companies.py, superadmin_campaigns.py)
All existing URLs must remain functional. No URL changes expected.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

SA_USER = "superadmin"
SA_PASS = "SuperAdmin2024!"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def sa_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": SA_USER, "password": SA_PASS},
        timeout=30,
    )
    assert r.status_code == 200, f"super admin login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    assert tok, f"no token in login response: {data}"
    return tok


@pytest.fixture(scope="session")
def sa_headers(sa_token):
    return {"Authorization": f"Bearer {sa_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def any_user_id(sa_headers):
    r = requests.get(f"{BASE_URL}/api/super-admin/users", headers=sa_headers, timeout=30)
    assert r.status_code == 200
    users = r.json() if isinstance(r.json(), list) else r.json().get("users", [])
    assert len(users) > 0, "need at least one user in DB"
    return users[0]["id"]


@pytest.fixture(scope="session")
def any_compound_id(sa_headers):
    r = requests.get(f"{BASE_URL}/api/super-admin/compounds", headers=sa_headers, timeout=30)
    assert r.status_code == 200
    compounds = r.json() if isinstance(r.json(), list) else r.json().get("compounds", [])
    if not compounds:
        pytest.skip("no compounds in DB")
    return compounds[0]["id"]


# ---------- Stays in superadmin.py ----------
class TestSuperadminStays:
    def test_1_dashboard(self, sa_headers):
        r = requests.get(f"{BASE_URL}/api/super-admin/dashboard", headers=sa_headers, timeout=30)
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        # Must contain stats keys
        assert isinstance(data, dict)
        # Common dashboard keys
        assert any(k in data for k in ("total_users", "stats", "users_count", "compounds_count")), \
            f"dashboard missing expected stats keys: {list(data.keys())[:10]}"

    def test_2_compounds(self, sa_headers):
        r = requests.get(f"{BASE_URL}/api/super-admin/compounds", headers=sa_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, (list, dict))

    def test_3_hierarchical_subs(self, sa_headers):
        r = requests.get(f"{BASE_URL}/api/super-admin/hierarchical-subs", headers=sa_headers, timeout=30)
        assert r.status_code == 200

    def test_6_compound_full_details(self, sa_headers, any_compound_id):
        r = requests.get(
            f"{BASE_URL}/api/super-admin/compounds/{any_compound_id}/full-details",
            headers=sa_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        assert isinstance(data, dict)

    def test_7_users(self, sa_headers):
        r = requests.get(f"{BASE_URL}/api/super-admin/users", headers=sa_headers, timeout=30)
        assert r.status_code == 200
        users = r.json() if isinstance(r.json(), list) else r.json().get("users", [])
        assert isinstance(users, list)
        assert len(users) > 0

    def test_8_create_user(self, sa_headers):
        uniq = uuid.uuid4().hex[:6]
        payload = {
            "username": f"TEST_iter38_u_{uniq}",
            "password": "TestPass123!",
            "full_name": "TEST Iter38 User",
            "email": f"test_iter38_{uniq}@example.com",
            "role": "resident",
        }
        r = requests.post(
            f"{BASE_URL}/api/super-admin/users",
            headers=sa_headers,
            json=payload,
            timeout=30,
        )
        assert r.status_code in (200, 201), f"create user failed: {r.status_code} {r.text[:200]}"
        data = r.json()
        # Either returns user directly or {user: ...}
        uid = data.get("id") or (data.get("user") or {}).get("id")
        assert uid, f"no id in create user response: {data}"

        # GET to verify persistence
        g = requests.get(f"{BASE_URL}/api/super-admin/users", headers=sa_headers, timeout=30)
        users = g.json() if isinstance(g.json(), list) else g.json().get("users", [])
        assert any(u.get("id") == uid for u in users), "created user not found in list"

    def test_9_subscription_analytics(self, sa_headers):
        r = requests.get(
            f"{BASE_URL}/api/super-admin/subscription-analytics",
            headers=sa_headers,
            timeout=30,
        )
        assert r.status_code == 200
        assert isinstance(r.json(), dict)

    def test_14_expiring_soon_count(self, sa_headers):
        r = requests.get(
            f"{BASE_URL}/api/super-admin/expiring-soon-count",
            headers=sa_headers,
            timeout=30,
        )
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)
        assert "count" in data or "total" in data or "expiring_soon" in data

    def test_15_auto_renewal_config(self, sa_headers):
        r = requests.get(
            f"{BASE_URL}/api/super-admin/auto-renewal-config",
            headers=sa_headers,
            timeout=30,
        )
        assert r.status_code == 200
        assert isinstance(r.json(), dict)


# ---------- Moved to superadmin_gifts.py ----------
class TestSuperadminGifts:
    def test_4_send_gift_extend_trial(self, sa_headers, any_user_id):
        payload = {
            "type": "extend_trial",
            "details": {"days": 7},
            "message": "TEST iter38 gift",
        }
        r = requests.post(
            f"{BASE_URL}/api/super-admin/users/{any_user_id}/send-gift",
            headers=sa_headers,
            json=payload,
            timeout=30,
        )
        assert r.status_code in (200, 201), f"send-gift failed: {r.status_code} {r.text[:300]}"
        data = r.json()
        assert isinstance(data, dict)
        # Should contain gift record or success
        assert data.get("type") == "extend_trial" or data.get("success") or data.get("id") or data.get("message")

    def test_5_bulk_renewal_offer_preview(self, sa_headers):
        payload = {
            "target": "all_expiring",
            "days_before_expiry": 30,
            "discount_percent": 10,
        }
        r = requests.post(
            f"{BASE_URL}/api/super-admin/bulk-renewal-offer/preview",
            headers=sa_headers,
            json=payload,
            timeout=30,
        )
        # Preview should always 200 even if 0 targets
        assert r.status_code == 200, f"preview failed: {r.status_code} {r.text[:200]}"
        data = r.json()
        assert isinstance(data, dict)
        assert "count" in data or "total" in data or "users" in data or "targets" in data


# ---------- Moved to superadmin_companies.py ----------
class TestSuperadminCompanies:
    def test_10_list_companies(self, sa_headers):
        r = requests.get(f"{BASE_URL}/api/super-admin/companies", headers=sa_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        companies = data if isinstance(data, list) else data.get("companies", [])
        assert isinstance(companies, list)

    def test_11_create_company(self, sa_headers):
        uniq = uuid.uuid4().hex[:6]
        payload = {
            "name": f"TEST_iter38_Company_{uniq}",
            "email": f"test_iter38_company_{uniq}@example.com",
            "phone": "+201000000000",
        }
        r = requests.post(
            f"{BASE_URL}/api/super-admin/companies",
            headers=sa_headers,
            json=payload,
            timeout=30,
        )
        assert r.status_code in (200, 201), f"create company failed: {r.status_code} {r.text[:300]}"
        data = r.json()
        cid = data.get("id") or (data.get("company") or {}).get("id")
        assert cid, f"no id in create company response: {data}"

        # verify via list
        g = requests.get(f"{BASE_URL}/api/super-admin/companies", headers=sa_headers, timeout=30)
        gdata = g.json()
        companies = gdata if isinstance(gdata, list) else gdata.get("companies", [])
        assert any(c.get("id") == cid for c in companies), "created company not found"

        # cleanup
        requests.delete(
            f"{BASE_URL}/api/super-admin/companies/{cid}",
            headers=sa_headers,
            timeout=30,
        )

    def test_12_top10_companies(self, sa_headers):
        r = requests.get(
            f"{BASE_URL}/api/super-admin/companies/top10",
            headers=sa_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        # Accept list or wrapped object
        items = data if isinstance(data, list) else data.get("companies", data.get("top10", []))
        assert isinstance(items, list)


# ---------- Moved to superadmin_campaigns.py ----------
class TestSuperadminCampaigns:
    def test_13_bulk_campaigns(self, sa_headers):
        r = requests.get(
            f"{BASE_URL}/api/super-admin/bulk-campaigns",
            headers=sa_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        items = data if isinstance(data, list) else data.get("campaigns", [])
        assert isinstance(items, list)


# ---------- Auth guard check (one random moved endpoint) ----------
class TestAuthGuard:
    def test_unauthenticated_rejected_on_moved_endpoint(self):
        r = requests.get(f"{BASE_URL}/api/super-admin/companies", timeout=30)
        assert r.status_code in (401, 403), f"expected 401/403 without auth, got {r.status_code}"
