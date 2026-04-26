"""
Iter50 — Tests for:
  - Bug fixes: GET /api/compounds/{id}/services & /bookings (App Owner)
  - PDF Reports endpoints (4)
  - 2FA TOTP full lifecycle
"""
import os
import time
import pytest
import requests
import pyotp

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://profile-nav-debug.preview.emergentagent.com").rstrip("/")
COMPOUND_ID = "88ad3711-c9ae-45fe-a270-65f4524c071c"
RESIDENT_USER_ID = "d6012878-6794-4d9a-8196-8577da883f5d"

OWNER_USER = "Owner_homeme"
OWNER_PASS = "Dalia1234@"


@pytest.fixture(scope="module")
def owner_token():
    """Login as App Owner. Handle 2FA leftover state — call /2fa/disable if enabled."""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": OWNER_USER, "password": OWNER_PASS}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    if data.get("two_factor_required"):
        pytest.skip("Owner has 2FA still enabled from a previous run — disable manually first")
    token = data.get("access_token")
    assert token
    return token


@pytest.fixture(scope="module")
def resident_token():
    """Login as a resident (compound member, non-admin) for 403 RBAC tests."""
    # Try candidates from credentials
    for u, p in [("dalia_resident", "Dalia1234@"), ("testresident", "Test1234@"), ("dalia", "Dalia1234@")]:
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": u, "password": p}, timeout=30)
        if r.status_code == 200 and r.json().get("access_token"):
            return r.json()["access_token"], r.json().get("user", {})
    pytest.skip("No resident credentials available for RBAC tests")


# ---------- Bug fixes ----------
class TestCompoundServicesBookings:
    def test_get_compound_services(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/compounds/{COMPOUND_ID}/services",
                         headers={"Authorization": f"Bearer {owner_token}"}, timeout=20)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        body = r.json()
        assert isinstance(body, (list, dict))

    def test_get_compound_bookings(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/compounds/{COMPOUND_ID}/bookings",
                         headers={"Authorization": f"Bearer {owner_token}"}, timeout=20)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        body = r.json()
        assert isinstance(body, (list, dict))


# ---------- PDF Reports ----------
class TestPdfReports:
    MONTH = "2025-01"

    def _assert_pdf(self, r):
        assert r.status_code == 200, f"{r.status_code}: {r.text[:200]}"
        assert r.content[:5] == b"%PDF-", f"Not a PDF: {r.content[:20]}"
        assert len(r.content) > 500

    def test_occupancy_pdf(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/reports/compound/{COMPOUND_ID}/occupancy?month={self.MONTH}",
                         headers={"Authorization": f"Bearer {owner_token}"}, timeout=60)
        self._assert_pdf(r)

    def test_invoices_pdf(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/reports/compound/{COMPOUND_ID}/invoices?month={self.MONTH}",
                         headers={"Authorization": f"Bearer {owner_token}"}, timeout=60)
        self._assert_pdf(r)

    def test_summary_pdf(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/reports/compound/{COMPOUND_ID}/summary?month={self.MONTH}",
                         headers={"Authorization": f"Bearer {owner_token}"}, timeout=60)
        self._assert_pdf(r)

    def test_unit_statement_pdf(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/reports/unit/{RESIDENT_USER_ID}/statement?month={self.MONTH}",
                         headers={"Authorization": f"Bearer {owner_token}"}, timeout=60)
        self._assert_pdf(r)

    def test_invalid_month(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/reports/compound/{COMPOUND_ID}/occupancy?month=invalid",
                         headers={"Authorization": f"Bearer {owner_token}"}, timeout=20)
        assert r.status_code == 400

    def test_rbac_resident_blocked_on_compound_report(self, resident_token):
        token, user = resident_token
        # Pick a different compound_id to ensure 403 (their own compound would pass).
        other_compound = "00000000-0000-0000-0000-000000000000"
        r = requests.get(f"{BASE_URL}/api/reports/compound/{other_compound}/occupancy?month={self.MONTH}",
                         headers={"Authorization": f"Bearer {token}"}, timeout=20)
        assert r.status_code in (403, 404), f"Expected 403/404, got {r.status_code}"


# ---------- 2FA TOTP Full Lifecycle ----------
class TestTwoFactor:
    def test_status_before(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/2fa/status",
                         headers={"Authorization": f"Bearer {owner_token}"}, timeout=20)
        assert r.status_code == 200
        body = r.json()
        assert "enabled" in body and "eligible" in body
        assert body["eligible"] is True
        assert body["enabled"] is False  # should be disabled at start

    def test_full_lifecycle(self, owner_token):
        H = {"Authorization": f"Bearer {owner_token}"}

        # 1. Setup
        r = requests.post(f"{BASE_URL}/api/2fa/setup", headers=H, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        secret = d["secret"]
        assert d["qr_code"].startswith("data:image/png;base64,")

        # 2. Verify-setup with INVALID code → 400
        r = requests.post(f"{BASE_URL}/api/2fa/verify-setup", headers=H,
                          json={"token_code": "000000"}, timeout=20)
        assert r.status_code == 400

        # 3. Verify-setup with VALID code → 8 backup codes
        valid = pyotp.TOTP(secret).now()
        r = requests.post(f"{BASE_URL}/api/2fa/verify-setup", headers=H,
                          json={"token_code": valid}, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["success"] is True
        backup_codes = d["backup_codes"]
        assert len(backup_codes) == 8

        # 4. Login when 2FA enabled → returns temp_token
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"username": OWNER_USER, "password": OWNER_PASS}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d.get("two_factor_required") is True
        assert "temp_token" in d
        assert "ttl_minutes" in d
        temp_token = d["temp_token"]

        # 5. verify-login with valid TOTP → full access_token
        # Wait briefly to ensure TOTP step doesn't reuse exact same token
        time.sleep(1)
        valid2 = pyotp.TOTP(secret).now()
        r = requests.post(f"{BASE_URL}/api/2fa/verify-login",
                          json={"temp_token": temp_token, "code": valid2}, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "access_token" in d
        assert "user" in d and d["user"]["username"] == OWNER_USER

        # 6. Backup code works once
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"username": OWNER_USER, "password": OWNER_PASS}, timeout=20)
        temp_token2 = r.json()["temp_token"]
        bc = backup_codes[0]
        r = requests.post(f"{BASE_URL}/api/2fa/verify-login",
                          json={"temp_token": temp_token2, "code": bc}, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json().get("backup_code_used") is True

        # 7. Same backup code reused → fail
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"username": OWNER_USER, "password": OWNER_PASS}, timeout=20)
        temp_token3 = r.json()["temp_token"]
        r = requests.post(f"{BASE_URL}/api/2fa/verify-login",
                          json={"temp_token": temp_token3, "code": bc}, timeout=20)
        assert r.status_code == 401

        # 8. Disable with valid TOTP
        time.sleep(1)
        valid3 = pyotp.TOTP(secret).now()
        # Need fresh access_token (the original owner_token fixture is still valid since
        # backend issues regular tokens and 2FA only gates *login*, not subsequent requests).
        r = requests.post(f"{BASE_URL}/api/2fa/disable", headers=H,
                          json={"token_code": valid3}, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["success"] is True

        # 9. Login after disable → direct access_token (no 2FA prompt)
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"username": OWNER_USER, "password": OWNER_PASS}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d.get("two_factor_required") in (None, False)
        assert "access_token" in d


# ---------- Regression ----------
class TestRegression:
    def test_compounds_list(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/compounds",
                         headers={"Authorization": f"Bearer {owner_token}"}, timeout=20)
        assert r.status_code == 200

    def test_audit_logs(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/audit-logs",
                         headers={"Authorization": f"Bearer {owner_token}"}, timeout=20)
        assert r.status_code in (200, 404)
