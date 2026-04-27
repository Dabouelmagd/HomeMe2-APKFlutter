"""
Iteration 54 — Logo upload, Email Templates, SMTP Alerts.
Validates the three new enhancements end-to-end against the public preview backend.
"""
import io
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://profile-nav-debug.preview.emergentagent.com").rstrip("/")
COMPOUND_ID = "88ad3711-c9ae-45fe-a270-65f4524c071c"

OWNER = {"username": "Owner_homeme", "password": "Dalia1234@"}
ADMIN = {"username": "admin", "password": "admin123"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"login failed for {creds['username']}: {r.status_code} {r.text[:120]}")
    return r.json()["access_token"], r.json()["user"]


@pytest.fixture(scope="module")
def owner_token():
    tok, _ = _login(OWNER)
    return tok


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=20)
    if r.status_code != 200:
        return None
    return r.json()["access_token"]


def _headers(tok):
    return {"Authorization": f"Bearer {tok}"}


def _png_bytes(size_bytes=None):
    # Minimal 1x1 PNG (67 bytes) — pad if needed
    base = bytes.fromhex(
        "89504E470D0A1A0A0000000D49484452000000010000000108020000"
        "00907753DE0000000C4944415408D763F8CFC0F01F0005000150"
        "FE6E2C7B0000000049454E44AE426082"
    )
    if size_bytes and size_bytes > len(base):
        base = base + os.urandom(size_bytes - len(base))
    return base


# ---------------- Email Templates ----------------

class TestEmailTemplates:
    def test_list_returns_4_templates(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/email-templates", headers=_headers(owner_token), timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        kinds = {t["kind"] for t in data["templates"]}
        assert kinds == {"monthly_summary", "monthly_statement", "renewal_reminder", "generic"}
        for t in data["templates"]:
            assert "subject" in t and "html" in t and "variables" in t and "label" in t
            assert "is_customized" in t

    def test_get_single_template(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/email-templates/monthly_summary", headers=_headers(owner_token), timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["kind"] == "monthly_summary"
        assert "{{compound_name}}" in data["subject"] or "compound_name" in str(data.get("variables", []))

    def test_unknown_kind_returns_404(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/email-templates/unknown_kind", headers=_headers(owner_token), timeout=20)
        assert r.status_code == 404

    def test_put_owner_customizes(self, owner_token):
        payload = {
            "subject": "TEST_HomeMe — تقرير {{compound_name}} ({{period}})",
            "html": "<p>TEST custom body for {{compound_name}} {{period}}</p>",
        }
        r = requests.put(
            f"{BASE_URL}/api/email-templates/monthly_summary",
            json=payload, headers=_headers(owner_token), timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["is_customized"] is True
        assert data["subject"] == payload["subject"]

        # Verify persistence
        g = requests.get(f"{BASE_URL}/api/email-templates/monthly_summary", headers=_headers(owner_token), timeout=20)
        assert g.json()["subject"] == payload["subject"]

    def test_put_empty_returns_400(self, owner_token):
        r = requests.put(
            f"{BASE_URL}/api/email-templates/monthly_summary",
            json={"subject": "", "html": ""}, headers=_headers(owner_token), timeout=20,
        )
        assert r.status_code == 400

    def test_put_non_owner_returns_403(self, admin_token):
        if not admin_token:
            pytest.skip("admin user not seeded")
        r = requests.put(
            f"{BASE_URL}/api/email-templates/monthly_summary",
            json={"subject": "x", "html": "x"}, headers=_headers(admin_token), timeout=20,
        )
        assert r.status_code == 403

    def test_preview_substitutes_variables(self, owner_token):
        r = requests.post(
            f"{BASE_URL}/api/email-templates/monthly_summary/preview",
            json={"subject": "Hi {{compound_name}} {{period}}", "html": "<p>{{compound_name}}</p>"},
            headers=_headers(owner_token), timeout=20,
        )
        assert r.status_code == 200
        data = r.json()
        assert "مجمع رويال سيتي" in data["subject"]
        assert "2026-04" in data["subject"]
        assert "مجمع رويال سيتي" in data["html"]

    def test_reset_clears_customization(self, owner_token):
        r = requests.post(
            f"{BASE_URL}/api/email-templates/monthly_summary/reset",
            headers=_headers(owner_token), timeout=20,
        )
        assert r.status_code == 200
        assert r.json()["is_customized"] is False
        # Verify persistence
        g = requests.get(f"{BASE_URL}/api/email-templates/monthly_summary", headers=_headers(owner_token), timeout=20)
        assert "TEST_" not in g.json().get("subject", "")


# ---------------- Logo Upload ----------------

class TestLogoUpload:
    uploaded_filename = None

    def test_upload_valid_png(self, owner_token):
        png = _png_bytes()
        files = {"file": ("logo.png", io.BytesIO(png), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/compounds/{COMPOUND_ID}/branding/logo",
            files=files, headers=_headers(owner_token), timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "logo_url" in data and data["logo_url"].startswith("/uploads/branding/")
        assert data["size_bytes"] == len(png)
        assert data["filename"].endswith(".png")
        TestLogoUpload.uploaded_filename = data["filename"]

        # Verify persisted
        g = requests.get(f"{BASE_URL}/api/compounds/{COMPOUND_ID}/branding", headers=_headers(owner_token), timeout=20)
        assert g.status_code == 200
        assert g.json()["branding"]["logo_url"] == data["logo_url"]

    def test_upload_wrong_content_type_400(self, owner_token):
        files = {"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")}
        r = requests.post(
            f"{BASE_URL}/api/compounds/{COMPOUND_ID}/branding/logo",
            files=files, headers=_headers(owner_token), timeout=20,
        )
        assert r.status_code == 400
        assert "غير مدعوم" in r.text or "نوع ملف" in r.text

    def test_upload_too_large_returns_413(self, owner_token):
        big = _png_bytes(3 * 1024 * 1024)  # 3 MB
        files = {"file": ("big.png", io.BytesIO(big), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/compounds/{COMPOUND_ID}/branding/logo",
            files=files, headers=_headers(owner_token), timeout=60,
        )
        assert r.status_code == 413, f"expected 413 got {r.status_code}: {r.text[:200]}"

    def test_uploaded_logo_served_publicly(self, owner_token):
        if not TestLogoUpload.uploaded_filename:
            pytest.skip("no uploaded file recorded")
        url = f"{BASE_URL}/uploads/branding/{TestLogoUpload.uploaded_filename}"
        r = requests.get(url, timeout=20)
        assert r.status_code == 200, f"static asset not served: {r.status_code}"
        assert r.headers.get("content-type", "").startswith("image/") or len(r.content) > 0

    def test_upload_non_admin_returns_403(self):
        # use 'security' role — non-admin
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "security", "password": "Security2024!"}, timeout=20)
        if r.status_code != 200:
            pytest.skip("security user not available")
        sec_token = r.json()["access_token"]
        png = _png_bytes()
        files = {"file": ("logo.png", io.BytesIO(png), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/compounds/{COMPOUND_ID}/branding/logo",
            files=files, headers=_headers(sec_token), timeout=30,
        )
        assert r.status_code == 403, f"expected 403 got {r.status_code}"


# ---------------- SMTP Alerts ----------------

class TestSMTPAlerts:
    def test_list_alerts_owner(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/system/smtp-health/alerts", headers=_headers(owner_token), timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "alerts" in data and "total" in data
        assert isinstance(data["alerts"], list)

    def test_check_now_owner(self, owner_token):
        r = requests.post(f"{BASE_URL}/api/system/smtp-health/alerts/check-now", headers=_headers(owner_token), timeout=30)
        assert r.status_code == 200
        assert r.json().get("checked") is True

    def test_alerts_non_owner_403(self, admin_token):
        if not admin_token:
            pytest.skip("admin not seeded")
        r = requests.get(f"{BASE_URL}/api/system/smtp-health/alerts", headers=_headers(admin_token), timeout=20)
        assert r.status_code == 403
        r2 = requests.post(f"{BASE_URL}/api/system/smtp-health/alerts/check-now", headers=_headers(admin_token), timeout=20)
        assert r2.status_code == 403


# ---------------- Regression ----------------

class TestRegression:
    def test_2fa_status(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/2fa/status", headers=_headers(owner_token), timeout=20)
        assert r.status_code == 200

    def test_compounds_list(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/compounds", headers=_headers(owner_token), timeout=20)
        assert r.status_code == 200

    def test_audit_logs(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/audit-logs", headers=_headers(owner_token), timeout=20)
        assert r.status_code == 200

    def test_analytics_dashboard_real(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/analytics/dashboard", headers=_headers(owner_token), timeout=30)
        assert r.status_code == 200
        data = r.json()
        # residents.total > 0
        residents = data.get("residents") or {}
        assert int(residents.get("total", 0)) > 0, f"expected real residents data, got: {residents}"

    def test_scheduler_status(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/reports/scheduler/status", headers=_headers(owner_token), timeout=20)
        assert r.status_code == 200

    def test_smtp_health_stats(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/system/smtp-health/stats", headers=_headers(owner_token), timeout=20)
        assert r.status_code == 200
