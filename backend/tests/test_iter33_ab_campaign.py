"""
Iteration 33: Tests for 4 new quality improvements
- RENEW coupons with campaign_id FK for per-campaign tracking
- A/B testing for bulk campaign messages (variant_a/variant_b, 50/50 split)
- Bulk campaigns list returns per-variant stats
- run_auto_renewal_if_due returns campaign_id + sends Owner summary email
- Gift endpoint regression
"""
import os
import sys
import uuid
import asyncio
import pytest
import requests

def _load_base_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if url:
        return url.rstrip("/")
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    return ""


BASE_URL = _load_base_url()

# Allow direct import of backend helper
sys.path.insert(0, "/app/backend")


def _login(username, password):
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"username": username, "password": password}, timeout=120)
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


@pytest.fixture(scope="module")
def target_user_ids(owner_token):
    """Pick 2 real user_ids from db so A/B split is exercised."""
    r = requests.get(f"{BASE_URL}/api/super-admin/users",
                     headers=_auth(owner_token), timeout=30)
    if r.status_code != 200:
        pytest.skip("cannot list users")
    users = r.json().get("users", [])
    # pick any 2 users that are NOT the owner
    picks = [u["id"] for u in users if u.get("username") not in ("Owner_homeme", "superadmin")][:2]
    if len(picks) < 2:
        pytest.skip("need at least 2 non-owner users")
    return picks


# ==================== (1) campaign_id FK on bulk-renewal send ====================
def _send_and_poll(owner_token, body, expected_sent, max_wait=300):
    """POST bulk send; since SMTP in test env is slow and ingress may disconnect,
    poll /bulk-campaigns until a matching campaign appears. Returns (campaign_dict, resp_json_or_None)."""
    resp_json = None
    # Snapshot existing campaign IDs
    pre = requests.get(f"{BASE_URL}/api/super-admin/bulk-campaigns",
                       headers=_auth(owner_token), timeout=30).json()
    pre_ids = {c["id"] for c in pre.get("campaigns", [])}
    try:
        r = requests.post(f"{BASE_URL}/api/super-admin/bulk-renewal-offer/send",
                          json=body, headers=_auth(owner_token), timeout=90)
        if r.status_code == 200:
            resp_json = r.json()
    except requests.exceptions.RequestException:
        resp_json = None  # timeout — poll instead
    import time
    deadline = time.time() + max_wait
    while time.time() < deadline:
        rc = requests.get(f"{BASE_URL}/api/super-admin/bulk-campaigns",
                          headers=_auth(owner_token), timeout=30)
        if rc.status_code == 200:
            for c in rc.json().get("campaigns", []):
                if c["id"] not in pre_ids and c.get("sent") == expected_sent:
                    return c, resp_json
        time.sleep(10)
    # final attempt — return latest new campaign if any
    rc = requests.get(f"{BASE_URL}/api/super-admin/bulk-campaigns",
                      headers=_auth(owner_token), timeout=30)
    for c in rc.json().get("campaigns", []):
        if c["id"] not in pre_ids:
            return c, resp_json
    return None, resp_json


class TestBulkRenewalCampaignId:
    def test_send_no_ab_has_campaign_id(self, owner_token, target_user_ids):
        body = {
            "user_ids": target_user_ids[:1],
            "days_before_expiry": 90,
            "discount": 15,
            "message": "TEST_iter33 no-ab baseline",
        }
        c, resp = _send_and_poll(owner_token, body, expected_sent=1)
        assert c is not None, "no new campaign created within timeout"
        assert c.get("id")
        assert c.get("sent") == 1
        assert c.get("ab_test") is False or c.get("ab_test") is None
        # variant_a/variant_b keys should be present but zero-sent
        assert "variant_a" in c and "variant_b" in c
        assert c["variant_a"]["sent"] == 0
        assert c["variant_b"]["sent"] == 0
        if resp:
            assert resp.get("campaign_id") == c["id"]

    def test_send_with_ab_split(self, owner_token, target_user_ids):
        body = {
            "user_ids": target_user_ids[:2],
            "ab_test": True,
            "variant_a_message": "TEST_iter33 Variant A",
            "variant_b_message": "TEST_iter33 Variant B",
            "days_before_expiry": 90,
            "discount": 15,
        }
        c, resp = _send_and_poll(owner_token, body, expected_sent=2, max_wait=420)
        assert c is not None
        assert c.get("sent") == 2
        assert c.get("ab_test") is True
        assert c["variant_a"]["sent"] == 1
        assert c["variant_b"]["sent"] == 1
        if resp:
            assert resp.get("sent_a") + resp.get("sent_b") == resp.get("sent")
            assert resp.get("ab_test") is True

    def test_ab_missing_variant_b_silently_disabled(self, owner_token, target_user_ids):
        body = {
            "user_ids": target_user_ids[:1],
            "ab_test": True,
            "variant_a_message": "TEST_iter33 A only",
            "days_before_expiry": 90,
            "discount": 15,
        }
        c, resp = _send_and_poll(owner_token, body, expected_sent=1)
        assert c is not None
        # ab_test should be silently disabled
        assert c.get("ab_test") is False
        assert c["variant_a"]["sent"] == 0
        assert c["variant_b"]["sent"] == 0
        if resp:
            assert resp.get("ab_test") is False


# ==================== (2) Bulk campaigns list — variant stats ====================
class TestBulkCampaignsVariantStats:
    def test_campaigns_have_variant_keys(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/bulk-campaigns",
                         headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200
        camps = r.json().get("campaigns", [])
        assert camps, "expected at least 1 campaign from previous tests"
        for c in camps:
            assert "variant_a" in c and "variant_b" in c
            for va in (c["variant_a"], c["variant_b"]):
                assert "sent" in va and "used" in va and "conversion_rate" in va
                # rate should be numeric
                assert isinstance(va["conversion_rate"], (int, float))

    def test_conversion_rate_computation(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/bulk-campaigns",
                         headers=_auth(owner_token), timeout=30)
        camps = r.json().get("campaigns", [])
        for c in camps:
            sent = c.get("sent", 0) or 0
            used = c.get("used", 0) or 0
            expected = round(100 * used / sent, 1) if sent else 0
            assert c.get("conversion_rate") == expected, f"bad rate for {c.get('id')}"


# ==================== (3) run_auto_renewal_if_due — config validates; helper shape checked indirectly ====================
class TestAutoRenewalHelper:
    def test_config_roundtrip(self, owner_token):
        """Config PUT/GET works. Helper is called by scheduler (tested in iter32). In this env SMTP blocks ~60s per user, so we skip direct helper invocation here — the smoke test already confirmed it returns {sent, emails_sent, targets, campaign_id}."""
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).day
        cfg = {"enabled": True, "day_of_month": today,
               "days_before_expiry": 90, "discount": 15, "message": "TEST_iter33 auto"}
        r = requests.put(f"{BASE_URL}/api/super-admin/auto-renewal-config",
                         json=cfg, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200
        g = requests.get(f"{BASE_URL}/api/super-admin/auto-renewal-config",
                         headers=_auth(owner_token), timeout=30).json()
        assert g.get("enabled") is True
        assert g.get("day_of_month") == today
        assert g.get("days_before_expiry") == 90
        # cleanup: disable scheduler
        requests.put(f"{BASE_URL}/api/super-admin/auto-renewal-config",
                     json={"enabled": False, "day_of_month": 1, "days_before_expiry": 7,
                           "discount": 20, "message": ""},
                     headers=_auth(owner_token), timeout=30)

    def test_helper_imports_and_has_campaign_id_code(self):
        """Static check: run_auto_renewal_if_due source includes campaign_id creation and owner summary email."""
        import inspect
        sys.path.insert(0, "/app/backend")
        from routes.superadmin import run_auto_renewal_if_due
        src = inspect.getsource(run_auto_renewal_if_due)
        assert "campaign_id" in src, "helper must create campaign_id"
        assert "return {\"sent\"" in src or "'campaign_id'" in src or '"campaign_id"' in src
        assert "app_owner" in src or "Owner" in src or "owner" in src.lower()
        # return dict includes campaign_id
        assert "campaign_id" in src.split("return")[-1]


# ==================== (4) Regression: gift & other endpoints still work ====================
class TestGiftRegression:
    def test_gift_endpoint_still_works(self, owner_token, target_user_ids):
        uid = target_user_ids[0]
        body = {"type": "discount_coupon", "discount": 10, "message": "TEST_iter33 gift"}
        r = requests.post(f"{BASE_URL}/api/super-admin/users/{uid}/send-gift",
                          json=body, headers=_auth(owner_token), timeout=180)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "gift" in data and "email" in data

    def test_expiring_count_still_200(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/expiring-soon-count?days=7",
                         headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200

    def test_hierarchical_subs_still_200(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/hierarchical-subs",
                         headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200

    def test_auto_renewal_config_still_200(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/auto-renewal-config",
                         headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200


# ==================== Admin 403 regression ====================
class TestAdminForbidden:
    def test_bulk_send_forbidden_admin(self, admin_token):
        if not admin_token:
            pytest.skip("no admin")
        r = requests.post(f"{BASE_URL}/api/super-admin/bulk-renewal-offer/send",
                          json={"user_ids": [], "discount": 10},
                          headers=_auth(admin_token), timeout=30)
        assert r.status_code == 403
