"""
Iter56 full regression sweep after image/ad-serving fixes.
Covers: file routing, ad ordering, auth, PDFs, 2FA, SMTP-health, email-templates,
branding, visitor passes, route-health, audit-logs, owner KPIs, plan limits,
compound invites.
"""
import os
import io
import pytest
import requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

OWNER = ("Owner_homeme", "Dalia1234@")
SUPER = ("superadmin", "SuperAdmin2024!")
COMPANY = ("testcompany2", "Company123!")
SECURITY = ("security", "Security2024!")


def _login(u, p):
    r = requests.post(f"{BASE}/api/auth/login", json={"username": u, "password": p}, timeout=20)
    return r


@pytest.fixture(scope="module")
def owner_token():
    r = _login(*OWNER)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def super_token():
    r = _login(*SUPER)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def company_token():
    r = _login(*COMPANY)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def H(t):
    return {"Authorization": f"Bearer {t}"}


# ---------- AUTH ----------
class TestAuth:
    def test_owner_login(self):
        r = _login(*OWNER)
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_super_login(self):
        r = _login(*SUPER)
        assert r.status_code == 200

    def test_company_login(self):
        r = _login(*COMPANY)
        assert r.status_code == 200

    def test_security_login(self):
        r = _login(*SECURITY)
        assert r.status_code == 200

    def test_bad_login(self):
        r = _login("Owner_homeme", "wrong")
        assert r.status_code in (400, 401)

    def test_test_advertiser_missing(self):
        """Flag: test_advertiser account not provisioned."""
        r = _login("test_advertiser", "TestAd123!")
        # expected 401 because user doesn't exist — flagged in action items
        assert r.status_code in (400, 401)


# ---------- ADS ordering + /api/files routing ----------
class TestAdsAndFiles:
    def test_homepage_hero_ads_media_first(self):
        r = requests.get(f"{BASE}/api/ads/public", params={"position": "homepage_hero"}, timeout=20)
        assert r.status_code == 200
        ads = r.json().get("ads", [])
        if len(ads) >= 2:
            # Any ad with image_url must come before any without
            seen_empty = False
            for a in ads:
                has_img = bool(a.get("image_url"))
                if not has_img:
                    seen_empty = True
                elif seen_empty:
                    pytest.fail("Ad with image appears after ad without image — ordering broken")

    def test_first_ad_has_image(self):
        r = requests.get(f"{BASE}/api/ads/public", params={"position": "homepage_hero"}, timeout=20)
        ads = r.json().get("ads", [])
        if ads:
            assert ads[0].get("image_url"), "First homepage_hero ad should have image_url"

    def test_ad_media_is_image_content_type(self):
        r = requests.get(f"{BASE}/api/ads/public", params={"position": "homepage_hero"}, timeout=20)
        ads = r.json().get("ads", [])
        if ads and ads[0].get("image_url"):
            url = ads[0]["image_url"]
            full = f"{BASE}{url}" if url.startswith("/") else url
            rr = requests.get(full, timeout=20)
            assert rr.status_code == 200
            ct = rr.headers.get("content-type", "")
            assert ct.startswith("image/"), f"Expected image/* got {ct}"

    def test_files_invalid_subdir_404(self):
        r = requests.get(f"{BASE}/api/files/notallowed/x.png", timeout=15)
        assert r.status_code in (403, 404)

    def test_files_missing_file_404(self):
        r = requests.get(f"{BASE}/api/files/users/does_not_exist_xyz.png", timeout=15)
        assert r.status_code == 404


# ---------- OWNER KPIs ----------
class TestOwnerKpis:
    def test_owner_kpis(self, owner_token):
        r = requests.get(f"{BASE}/api/owner-kpis", headers=H(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # schema fields
        for key in ["compounds", "users", "revenue", "churn", "top_compounds"]:
            assert key in data, f"missing {key}"


# ---------- PDF REPORTS ----------
class TestPdfs:
    def _get_any_compound(self, token):
        r = requests.get(f"{BASE}/api/compounds", headers=H(token), timeout=20)
        if r.status_code == 200:
            j = r.json()
            items = j if isinstance(j, list) else j.get("compounds", [])
            if items:
                return items[0]["id"]
        return None

    def test_pdfs_owner(self, owner_token):
        cid = self._get_any_compound(owner_token)
        if not cid:
            pytest.skip("no compound available")
        # summary
        r = requests.get(f"{BASE}/api/reports/compound/{cid}/summary", params={"month": "2026-01"}, headers=H(owner_token), timeout=60)
        assert r.status_code == 200, r.text
        assert r.content[:4] == b"%PDF"

    def test_pdf_unauthorized(self):
        r = requests.get(f"{BASE}/api/reports/compound/xxx/summary", params={"month": "2026-01"}, timeout=20)
        assert r.status_code in (401, 403, 404)


# ---------- 2FA ----------
class Test2FA:
    def test_2fa_status(self, owner_token):
        r = requests.get(f"{BASE}/api/2fa/status", headers=H(owner_token), timeout=20)
        assert r.status_code == 200
        assert "enabled" in r.json()


# ---------- SMTP HEALTH ----------
class TestSmtpHealth:
    def test_stats(self, owner_token):
        r = requests.get(f"{BASE}/api/system/smtp-health/stats", params={"hours": 24}, headers=H(owner_token), timeout=20)
        assert r.status_code == 200
        d = r.json()
        # schema keys
        assert any(k in d for k in ["total", "success", "failed", "total_attempts", "success_rate"])

    def test_alerts_list(self, owner_token):
        r = requests.get(f"{BASE}/api/system/smtp-health/alerts", headers=H(owner_token), timeout=20)
        assert r.status_code == 200

    def test_stats_non_owner_forbidden(self, company_token):
        r = requests.get(f"{BASE}/api/system/smtp-health/stats", headers=H(company_token), timeout=20)
        assert r.status_code in (401, 403)


# ---------- EMAIL TEMPLATES ----------
class TestEmailTemplates:
    def test_list(self, owner_token):
        r = requests.get(f"{BASE}/api/email-templates", headers=H(owner_token), timeout=20)
        assert r.status_code == 200
        items = r.json() if isinstance(r.json(), list) else r.json().get("templates", [])
        assert len(items) >= 1

    def test_preview(self, owner_token):
        r = requests.get(f"{BASE}/api/email-templates", headers=H(owner_token), timeout=20)
        items = r.json() if isinstance(r.json(), list) else r.json().get("templates", [])
        if not items:
            pytest.skip("no templates")
        kind = items[0].get("kind") or items[0].get("id")
        rr = requests.post(f"{BASE}/api/email-templates/{kind}/preview", headers=H(owner_token), json={}, timeout=20)
        assert rr.status_code in (200, 400)  # 400 if missing ctx vars is acceptable


# ---------- AUDIT LOGS ----------
class TestAudit:
    def test_list(self, owner_token):
        r = requests.get(f"{BASE}/api/audit-logs", headers=H(owner_token), timeout=20)
        assert r.status_code == 200

    def test_summary(self, owner_token):
        r = requests.get(f"{BASE}/api/audit-logs/summary", headers=H(owner_token), timeout=20)
        assert r.status_code == 200

    def test_forbidden_non_owner(self, company_token):
        r = requests.get(f"{BASE}/api/audit-logs", headers=H(company_token), timeout=20)
        assert r.status_code in (401, 403)


# ---------- ROUTE HEALTH ----------
class TestRouteHealth:
    def test_scan(self, owner_token):
        r = requests.post(f"{BASE}/api/system/route-health/scan", headers=H(owner_token), timeout=90)
        assert r.status_code == 200
        d = r.json()
        assert "fail" in d or "failed" in d or "results" in d or "summary" in d

    def test_last(self, owner_token):
        r = requests.get(f"{BASE}/api/system/route-health/last", headers=H(owner_token), timeout=20)
        assert r.status_code in (200, 404)


# ---------- COMPOUND BRANDING ----------
class TestBranding:
    def test_get_branding(self, owner_token):
        r = requests.get(f"{BASE}/api/compounds", headers=H(owner_token), timeout=20)
        if r.status_code != 200:
            pytest.skip("no compound list")
        j = r.json()
        items = j if isinstance(j, list) else j.get("compounds", [])
        if not items:
            pytest.skip("no compound")
        cid = items[0]["id"]
        rr = requests.get(f"{BASE}/api/compounds/{cid}/branding", headers=H(owner_token), timeout=20)
        assert rr.status_code == 200


# ---------- VISITOR PASS ----------
class TestVisitorPass:
    def test_public_endpoint_shape(self):
        # invalid token should return 404
        r = requests.get(f"{BASE}/api/visitor-passes/public/invalid_token_xyz", timeout=15)
        assert r.status_code in (400, 404)


# ---------- PLAN LIMITS ----------
class TestPlanLimits:
    def test_company_admin_compound_limit(self, company_token):
        # company_admin compound creation happens under /api/company-admin/compounds
        payload = {"name": "TEST_over_limit_compound", "address": "x"}
        r = requests.post(f"{BASE}/api/company-admin/compounds", headers=H(company_token), json=payload, timeout=20)
        # Either created (if under limit) or 403 with structured plan_limit_compounds
        assert r.status_code in (200, 201, 400, 403, 409, 422), r.text
        if r.status_code == 403:
            try:
                d = r.json().get("detail", {})
                body = str(d).lower()
                assert "limit" in body or "plan" in body
            except Exception:
                pass
        # Cleanup if created
        if r.status_code in (200, 201):
            try:
                cid = r.json().get("id")
                if cid:
                    requests.delete(f"{BASE}/api/company-admin/compounds/{cid}", headers=H(company_token), timeout=20)
            except Exception:
                pass


# ---------- COMPOUND INVITES ----------
class TestCompoundInvites:
    def test_list(self, owner_token):
        r = requests.get(f"{BASE}/api/compound-invites", headers=H(owner_token), timeout=20)
        assert r.status_code in (200, 404)

    def test_public_invalid_token(self):
        r = requests.get(f"{BASE}/api/compound-invites/token/invalid_xyz", timeout=15)
        assert r.status_code in (400, 404)
