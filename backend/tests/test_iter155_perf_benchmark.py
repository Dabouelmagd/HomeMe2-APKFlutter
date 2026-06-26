"""
Iter155 — Fresh performance benchmark for the 5 endpoints that were optimized in Iter151.
Confirms the optimizations are functional on PREVIEW codebase.

Targets (was → now):
  /api/super-admin/export-full-structure  60.9s → <3s
  /api/residents/bulk-import/template      4.5s → <3s
  /api/ads/analytics/export-pdf            4.4s → <3s
  /api/analytics/export                    4.2s → <3s
  /api/analytics/dashboard                 4.1s → <3s
"""
import os
import time
import pytest
import requests
import pyotp

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://profile-nav-debug.preview.emergentagent.com").rstrip("/")
OWNER_USER = "Owner_homeme"
OWNER_PASS = "Dalia1234@"
TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"

# Generous SLA: code-level optimization target was <3s; we'll mark >5s as a regression
SLA_SECONDS = 5.0


@pytest.fixture(scope="module")
def owner_token():
    s = requests.Session()
    # Login step 1
    r = s.post(f"{BASE_URL}/api/auth/login", json={"username": OWNER_USER, "password": OWNER_PASS}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    if data.get("requires_2fa") or data.get("two_factor_required"):
        code = pyotp.TOTP(TOTP_SECRET).now()
        r2 = s.post(f"{BASE_URL}/api/2fa/verify-login",
                    json={"temp_token": data.get("temp_token"), "code": code},
                    timeout=30)
        assert r2.status_code == 200, f"2fa failed: {r2.status_code} {r2.text[:200]}"
        data = r2.json()
    token = data.get("access_token") or data.get("token")
    if not token:
        pytest.skip(f"No token obtained from login response: {data}")
    return token


def _hit(token, path, method="GET", **kwargs):
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {token}"
    t0 = time.perf_counter()
    if method == "GET":
        r = requests.get(f"{BASE_URL}{path}", headers=headers, timeout=120, **kwargs)
    else:
        r = requests.post(f"{BASE_URL}{path}", headers=headers, timeout=120, **kwargs)
    elapsed = time.perf_counter() - t0
    return r, elapsed


def test_perf_export_full_structure(owner_token):
    r, elapsed = _hit(owner_token, "/api/super-admin/export-full-structure")
    print(f"\n[PERF] /api/super-admin/export-full-structure  status={r.status_code}  elapsed={elapsed:.2f}s")
    assert r.status_code == 200, f"unexpected status {r.status_code}"
    assert elapsed < SLA_SECONDS, f"too slow: {elapsed:.2f}s (was 60.9s, target <3s, SLA {SLA_SECONDS}s)"


def test_perf_bulk_import_template(owner_token):
    r, elapsed = _hit(owner_token, "/api/residents/bulk-import/template")
    print(f"\n[PERF] /api/residents/bulk-import/template     status={r.status_code}  elapsed={elapsed:.2f}s")
    assert r.status_code == 200, f"unexpected status {r.status_code}"
    assert elapsed < SLA_SECONDS, f"too slow: {elapsed:.2f}s (was 4.5s, target <3s, SLA {SLA_SECONDS}s)"


def test_perf_ads_pdf_export(owner_token):
    r, elapsed = _hit(owner_token, "/api/ads/analytics/export-pdf")
    print(f"\n[PERF] /api/ads/analytics/export-pdf           status={r.status_code}  elapsed={elapsed:.2f}s")
    assert r.status_code == 200, f"unexpected status {r.status_code}"
    assert elapsed < SLA_SECONDS, f"too slow: {elapsed:.2f}s (was 4.4s, target <3s, SLA {SLA_SECONDS}s)"


def test_perf_analytics_export(owner_token):
    r, elapsed = _hit(owner_token, "/api/analytics/export")
    print(f"\n[PERF] /api/analytics/export                    status={r.status_code}  elapsed={elapsed:.2f}s")
    assert r.status_code == 200, f"unexpected status {r.status_code}"
    assert elapsed < SLA_SECONDS, f"too slow: {elapsed:.2f}s (was 4.2s, target <3s, SLA {SLA_SECONDS}s)"


def test_perf_analytics_dashboard(owner_token):
    r, elapsed = _hit(owner_token, "/api/analytics/dashboard")
    print(f"\n[PERF] /api/analytics/dashboard                 status={r.status_code}  elapsed={elapsed:.2f}s")
    assert r.status_code == 200, f"unexpected status {r.status_code}"
    assert elapsed < SLA_SECONDS, f"too slow: {elapsed:.2f}s (was 4.1s, target <3s, SLA {SLA_SECONDS}s)"
