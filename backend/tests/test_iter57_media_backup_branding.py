"""
Iteration 57 Tests:
A) Media Backup System with Self-Healing — /api/media-health/* + serve_subdir_file self-heal
B) HomeMe App Branding — /api/app-branding (public GET, owner PUT/POST logo)
C) Regression — file routing (Iter56) + subdir 'homeme' whitelisted

Run:
  pytest /app/backend/tests/test_iter57_media_backup_branding.py -v --tb=short \
    --junitxml=/app/test_reports/pytest/iter57_results.xml
"""
import io
import os
import time
import pytest
import requests
from pathlib import Path

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://profile-nav-debug.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

OWNER = ("Owner_homeme", "Dalia1234@")
SUPER = ("superadmin", "SuperAdmin2024!")
ADV = ("test_advertiser", "TestAd123!")
COMPANY = ("testcompany2", "Company123!")


def _login(username, password):
    r = requests.post(f"{API}/auth/login", json={"username": username, "password": password}, timeout=20)
    if r.status_code != 200:
        return None
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module")
def owner_token():
    t = _login(*OWNER)
    if not t:
        pytest.skip("Owner login failed")
    return t


@pytest.fixture(scope="module")
def super_token():
    t = _login(*SUPER)
    if not t:
        pytest.skip("Super admin login failed")
    return t


@pytest.fixture(scope="module")
def adv_token():
    t = _login(*ADV)
    if not t:
        pytest.skip("Advertiser login failed")
    return t


def _hdr(t):
    return {"Authorization": f"Bearer {t}"}


# ---------- Media Health endpoints ----------

class TestMediaHealth:
    def test_overview_owner(self, owner_token):
        r = requests.get(f"{API}/media-health/overview", headers=_hdr(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("total_files", "total_bytes", "by_subdir", "orphan_count",
                  "broken_count", "snapshot_count", "last_snapshot"):
            assert k in d, f"missing {k}"
        assert isinstance(d["total_files"], int)
        assert isinstance(d["by_subdir"], dict)

    def test_overview_super_admin(self, super_token):
        r = requests.get(f"{API}/media-health/overview", headers=_hdr(super_token), timeout=30)
        assert r.status_code == 200

    def test_overview_advertiser_forbidden(self, adv_token):
        r = requests.get(f"{API}/media-health/overview", headers=_hdr(adv_token), timeout=15)
        assert r.status_code == 403

    def test_overview_no_auth(self):
        r = requests.get(f"{API}/media-health/overview", timeout=15)
        assert r.status_code in (401, 403)

    def test_orphans_owner(self, owner_token):
        r = requests.get(f"{API}/media-health/orphans", headers=_hdr(owner_token), timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "orphans" in d and "count" in d
        assert isinstance(d["orphans"], list)
        assert d["count"] == len(d["orphans"])

    def test_broken_owner(self, owner_token):
        r = requests.get(f"{API}/media-health/broken", headers=_hdr(owner_token), timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "broken" in d and "count" in d

    def test_backups_owner(self, owner_token):
        r = requests.get(f"{API}/media-health/backups", headers=_hdr(owner_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "snapshots" in d and isinstance(d["snapshots"], list)
        for s in d["snapshots"]:
            assert "snapshot" in s and "files" in s and "bytes" in s

    def test_backup_now_owner(self, owner_token):
        r = requests.post(f"{API}/media-health/backup-now", headers=_hdr(owner_token), timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("success") is True
        for k in ("snapshot", "copied", "skipped", "errors"):
            assert k in d

    def test_backup_now_advertiser_forbidden(self, adv_token):
        r = requests.post(f"{API}/media-health/backup-now", headers=_hdr(adv_token), timeout=15)
        assert r.status_code == 403

    def test_repair_broken_owner(self, owner_token):
        r = requests.post(f"{API}/media-health/repair-broken", headers=_hdr(owner_token), timeout=60)
        assert r.status_code == 200
        d = r.json()
        for k in ("repaired_count", "missing_count", "repaired", "still_missing"):
            assert k in d


# ---------- App Branding ----------

class TestAppBranding:
    def test_get_branding_public_no_auth(self):
        r = requests.get(f"{API}/app-branding", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("app_name_ar", "app_name_en", "tagline_ar", "tagline_en",
                  "primary_color", "secondary_color", "accent_color"):
            assert k in d, f"missing {k}"
        # logo_url may be None or string
        assert "logo_url" in d

    def test_put_branding_owner(self, owner_token):
        payload = {
            "app_name_ar": "هوم مي",
            "app_name_en": "HomeMe",
            "tagline_ar": "إدارة المجتمعات السكنية بسهولة",
            "primary_color": "#e11d48",
            "secondary_color": "#7c3aed",
            "accent_color": "#f59e0b",
        }
        r = requests.put(f"{API}/app-branding", json=payload, headers=_hdr(owner_token), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["primary_color"] == "#e11d48"
        assert d["app_name_en"] == "HomeMe"

    def test_put_branding_invalid_hex_400(self, owner_token):
        r = requests.put(f"{API}/app-branding",
                         json={"primary_color": "not-a-hex"},
                         headers=_hdr(owner_token), timeout=15)
        assert r.status_code == 400

    def test_put_branding_advertiser_forbidden(self, adv_token):
        r = requests.put(f"{API}/app-branding",
                         json={"app_name_en": "Hack"},
                         headers=_hdr(adv_token), timeout=15)
        assert r.status_code == 403

    def test_upload_logo_owner(self, owner_token):
        # 1x1 PNG
        png = bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489"
            "0000000D49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
        )
        files = {"file": ("test_logo.png", io.BytesIO(png), "image/png")}
        r = requests.post(f"{API}/app-branding/logo", files=files, headers=_hdr(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("success") is True
        assert d.get("logo_url", "").startswith("/api/files/homeme/")
        # Save for next test
        TestAppBranding._uploaded_url = d["logo_url"]

    def test_serve_uploaded_logo(self, owner_token):
        url = getattr(TestAppBranding, "_uploaded_url", None)
        if not url:
            pytest.skip("No logo uploaded")
        r = requests.get(f"{BASE_URL}{url}", timeout=15)
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("image/")

    def test_upload_logo_wrong_type_400(self, owner_token):
        files = {"file": ("bad.txt", io.BytesIO(b"not an image"), "text/plain")}
        r = requests.post(f"{API}/app-branding/logo", files=files, headers=_hdr(owner_token), timeout=15)
        assert r.status_code == 400

    def test_upload_logo_oversize_413(self, owner_token):
        big = b"\x89PNG\r\n\x1a\n" + b"0" * (3 * 1024 * 1024)
        files = {"file": ("big.png", io.BytesIO(big), "image/png")}
        r = requests.post(f"{API}/app-branding/logo", files=files, headers=_hdr(owner_token), timeout=30)
        assert r.status_code == 413

    def test_upload_logo_advertiser_forbidden(self, adv_token):
        png = bytes.fromhex("89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489")
        files = {"file": ("x.png", io.BytesIO(png), "image/png")}
        r = requests.post(f"{API}/app-branding/logo", files=files, headers=_hdr(adv_token), timeout=15)
        assert r.status_code == 403


# ---------- Self-healing route ----------

class TestSelfHeal:
    """Upload logo, take backup, delete file from disk, GET should self-heal and return 200."""

    def test_self_heal_via_files_route(self, owner_token):
        # Upload a fresh logo
        png = bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489"
            "0000000D49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
        )
        files = {"file": ("heal_test.png", io.BytesIO(png), "image/png")}
        r = requests.post(f"{API}/app-branding/logo", files=files, headers=_hdr(owner_token), timeout=30)
        assert r.status_code == 200
        url = r.json()["logo_url"]
        filename = url.rsplit("/", 1)[-1]
        local = Path("/app/uploads/homeme") / filename
        assert local.exists(), f"file not on disk: {local}"

        # Take a backup
        r2 = requests.post(f"{API}/media-health/backup-now", headers=_hdr(owner_token), timeout=60)
        assert r2.status_code == 200

        # Delete from /app/uploads to simulate disappearance
        local.unlink()
        assert not local.exists()

        # GET via /api/files/homeme/{filename} → should auto-restore
        r3 = requests.get(f"{BASE_URL}{url}", timeout=15)
        assert r3.status_code == 200, f"self-heal failed: {r3.status_code} {r3.text[:200]}"
        assert r3.headers.get("content-type", "").startswith("image/")

        # Verify file restored back to disk
        time.sleep(0.3)
        assert local.exists(), "file was not restored to /app/uploads"


# ---------- Regression: Iter56 file routing ----------

class TestIter56Regression:
    def test_homeme_subdir_invalid_filename_404(self):
        r = requests.get(f"{API}/files/homeme/does-not-exist.png", timeout=15)
        assert r.status_code == 404

    def test_invalid_subdir_404(self):
        r = requests.get(f"{API}/files/notwhitelisted/foo.png", timeout=15)
        assert r.status_code == 404

    def test_ads_public_homepage_hero(self):
        r = requests.get(f"{API}/ads/public", params={"position": "homepage_hero"}, timeout=20)
        # Endpoint must respond; if it returns ads, those with image_url should rank first
        assert r.status_code in (200, 204)
        if r.status_code == 200:
            data = r.json()
            ads = data if isinstance(data, list) else data.get("ads", [])
            # Verify ranking: any ad with image should come before ads without
            seen_no_image = False
            for ad in ads:
                if not ad.get("image_url"):
                    seen_no_image = True
                elif seen_no_image:
                    pytest.fail("Ad with image_url ranked AFTER an ad without image_url")
