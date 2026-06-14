"""Iter143 backend tests:
- Authenticated testimonials submit-authenticated + /my
- Super Admin comprehensive-report
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


def _login(username, password):
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"username": username, "password": password}, timeout=30)
    assert r.status_code == 200, f"Login failed for {username}: {r.status_code} {r.text}"
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="module")
def resident_token():
    return _login("test", "test123")


@pytest.fixture(scope="module")
def owner_token():
    return _login("Owner_homeme", "Dalia1234@")


# ── Testimonials ───────────────────────────────────────────────────────
class TestAuthenticatedTestimonials:
    def test_my_returns_existing_or_null(self, resident_token):
        r = requests.get(f"{BASE_URL}/api/testimonials/my",
                         headers={"Authorization": f"Bearer {resident_token}"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "testimonial" in data
        # If user has one, the auto-fill fields should be present
        if data["testimonial"]:
            t = data["testimonial"]
            assert t.get("name"), "name auto-fill missing"
            assert t.get("role"), "role auto-fill missing"
            # compound_id present (test user belongs to compound)
            assert t.get("submitted_by")

    def test_duplicate_submit_rejected(self, resident_token):
        """`test` user already has 1 pending testimonial — must return 400."""
        payload = {"stars": 5, "comment": "تقييم اختبار طويل بما يكفي للتجربة."}
        r = requests.post(f"{BASE_URL}/api/testimonials/submit-authenticated",
                          headers={"Authorization": f"Bearer {resident_token}"},
                          json=payload, timeout=30)
        # If no existing, this would 200; if existing pending/published → 400.
        assert r.status_code in (200, 400), f"Unexpected: {r.status_code} {r.text}"
        if r.status_code == 200:
            # First submission succeeded → now second must reject
            r2 = requests.post(f"{BASE_URL}/api/testimonials/submit-authenticated",
                               headers={"Authorization": f"Bearer {resident_token}"},
                               json=payload, timeout=30)
            assert r2.status_code == 400, f"Duplicate not rejected: {r2.status_code} {r2.text}"

    def test_short_comment_rejected(self, resident_token):
        r = requests.post(f"{BASE_URL}/api/testimonials/submit-authenticated",
                          headers={"Authorization": f"Bearer {resident_token}"},
                          json={"stars": 4, "comment": "short"}, timeout=30)
        assert r.status_code == 422

    def test_unauthenticated_rejected(self):
        r = requests.post(f"{BASE_URL}/api/testimonials/submit-authenticated",
                          json={"stars": 5, "comment": "comment long enough"}, timeout=30)
        assert r.status_code in (401, 403)


# ── Super Admin Comprehensive Report ───────────────────────────────────
class TestComprehensiveReport:
    def test_owner_can_access(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/comprehensive-report?months=12",
                         headers={"Authorization": f"Bearer {owner_token}"}, timeout=60)
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        # Subscriptions
        s = data["subscriptions"]
        for k in ("total_active_companies", "total_paid_companies", "total_cancelled", "by_plan"):
            assert k in s, f"missing subscriptions.{k}"
        assert isinstance(s["by_plan"], dict)
        # Revenue
        rev = data["revenue"]
        for k in ("lifetime_egp", "this_month_egp", "last_month_egp", "trend_months"):
            assert k in rev, f"missing revenue.{k}"
        assert isinstance(rev["trend_months"], list)
        assert len(rev["trend_months"]) == 12, f"trend_months len={len(rev['trend_months'])}"
        for tm in rev["trend_months"]:
            assert "month" in tm and "revenue" in tm
        # Churn
        ch = data["churn"]
        for k in ("rate_30d_percent", "rate_90d_percent", "cancelled_30d", "cancelled_90d"):
            assert k in ch
        # Top compounds
        tc = data["top_compounds"]
        assert isinstance(tc, list)
        assert len(tc) <= 10
        if tc:
            t = tc[0]
            for k in ("compound_id", "compound_name", "residents",
                      "recent_complaints_30d", "recent_maintenance_30d", "activity_score"):
                assert k in t, f"missing top_compounds[0].{k}"

    def test_resident_forbidden(self, resident_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/comprehensive-report",
                         headers={"Authorization": f"Bearer {resident_token}"}, timeout=30)
        assert r.status_code in (401, 403), f"resident got {r.status_code}"

    def test_unauthenticated_forbidden(self):
        r = requests.get(f"{BASE_URL}/api/super-admin/comprehensive-report", timeout=30)
        assert r.status_code in (401, 403)

    def test_custom_months(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/comprehensive-report?months=6",
                         headers={"Authorization": f"Bearer {owner_token}"}, timeout=30)
        assert r.status_code == 200
        assert len(r.json()["revenue"]["trend_months"]) == 6
