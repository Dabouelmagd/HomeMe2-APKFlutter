"""Iteration 55 — Bug fix verification: /api/files/{subdir}/{filename} routing for upload assets.

Background: K8s ingress only routes /api/* to backend. /uploads/* hit the frontend SPA
fallback (returns text/html). Fix: all upload endpoints now return /api/files/{subdir}/{filename}
URLs and a generic /api/files/{subdir}/{filename} route serves them.
"""
import io
import os
import time
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://profile-nav-debug.preview.emergentagent.com").rstrip("/")
COMPOUND_ID = "88ad3711-c9ae-45fe-a270-65f4524c071c"
OWNER_USERNAME = "Owner_homeme"
OWNER_PASSWORD = "Dalia1234@"


def _make_png_bytes() -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (32, 32), color=(255, 0, 0))
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    return s


@pytest.fixture(scope="module")
def owner_token(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"username": OWNER_USERNAME, "password": OWNER_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text[:300]}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in login response: {data}"
    return token


@pytest.fixture(scope="module")
def owner_id(session, owner_token):
    r = session.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {owner_token}"})
    assert r.status_code == 200, r.text[:300]
    return r.json().get("id") or r.json().get("user_id") or "e2e32850-579f-42e0-964b-700d9dc4717c"


# ------------------- 1. Profile picture upload -------------------
class TestProfilePictureUpload:
    def test_upload_profile_picture_returns_api_files_url(self, session, owner_token, owner_id):
        png = _make_png_bytes()
        files = {"profile_picture": ("avatar.png", png, "image/png")}
        data = {"full_name": "Dalia Abou El Magd"}
        r = session.put(
            f"{BASE_URL}/api/users/{owner_id}/profile",
            headers={"Authorization": f"Bearer {owner_token}"},
            files=files,
            data=data,
        )
        assert r.status_code == 200, f"upload failed: {r.status_code} {r.text[:400]}"
        body = r.json()
        url = body.get("profile_picture_url") or body.get("user", {}).get("profile_picture_url")
        assert url, f"profile_picture_url missing in response: {body}"
        assert url.startswith("/api/files/users/"), f"Expected /api/files/users/ prefix, got: {url}"
        # Stash for next test
        TestProfilePictureUpload.url = url

    def test_get_uploaded_profile_picture_serves_image(self, session, owner_token):
        url = getattr(TestProfilePictureUpload, "url", None)
        assert url, "Skipped — upload test must run first"
        full = f"{BASE_URL}{url}"
        r = session.get(full, headers={"Authorization": f"Bearer {owner_token}"})
        assert r.status_code == 200, f"GET file failed: {r.status_code} body[:200]={r.text[:200]}"
        ct = r.headers.get("content-type", "")
        assert "image" in ct, f"Expected image content-type, got: {ct} (this was the original bug — frontend SPA returned text/html)"
        # PNG signature check (first 8 bytes)
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n", f"Not a valid PNG: {r.content[:16]!r}"

    def test_old_uploads_path_returns_html_fallback(self, session):
        """Confirms ingress behavior: /uploads/* hits frontend SPA. We avoid this path."""
        url = getattr(TestProfilePictureUpload, "url", None)
        assert url
        legacy = url.replace("/api/files/", "/uploads/")
        r = session.get(f"{BASE_URL}{legacy}", allow_redirects=True)
        ct = r.headers.get("content-type", "")
        # Either 200 text/html (SPA fallback) or some non-image — what matters is it's NOT served as image
        assert "image" not in ct, f"/uploads/ unexpectedly served image — ingress changed? ct={ct}"


# ------------------- 2. Branding logo upload -------------------
class TestBrandingLogoUpload:
    def test_upload_branding_logo_returns_api_files_url(self, session, owner_token):
        png = _make_png_bytes()
        files = {"file": ("logo.png", png, "image/png")}
        r = session.post(
            f"{BASE_URL}/api/compounds/{COMPOUND_ID}/branding/logo",
            headers={"Authorization": f"Bearer {owner_token}"},
            files=files,
        )
        assert r.status_code in (200, 201), f"branding upload failed: {r.status_code} {r.text[:400]}"
        body = r.json()
        url = body.get("logo_url") or body.get("branding", {}).get("logo_url")
        assert url, f"logo_url missing: {body}"
        assert url.startswith("/api/files/branding/"), f"Expected /api/files/branding/ prefix, got: {url}"
        TestBrandingLogoUpload.url = url

    def test_get_uploaded_logo_serves_image(self, session, owner_token):
        url = getattr(TestBrandingLogoUpload, "url", None)
        assert url
        r = session.get(f"{BASE_URL}{url}", headers={"Authorization": f"Bearer {owner_token}"})
        assert r.status_code == 200, f"GET logo failed: {r.status_code} {r.text[:200]}"
        assert "image" in r.headers.get("content-type", "")
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_cleanup_unset_branding_logo_url(self, session, owner_token):
        # Per agent context note — clean up after test
        try:
            from pymongo import MongoClient  # type: ignore
            mongo_url = os.environ.get("MONGO_URL")
            db_name = os.environ.get("DB_NAME")
            if mongo_url and db_name:
                client = MongoClient(mongo_url)
                client[db_name].compounds.update_one({"id": COMPOUND_ID}, {"$unset": {"branding.logo_url": ""}})
                client.close()
        except Exception as e:
            print(f"(cleanup skipped: {e})")


# ------------------- 3. Ad media upload -------------------
class TestAdMediaUpload:
    def test_upload_ad_media_returns_url(self, session, owner_token):
        png = _make_png_bytes()
        files = {"file": ("ad.png", png, "image/png")}
        r = session.post(
            f"{BASE_URL}/api/ads/upload-media",
            headers={"Authorization": f"Bearer {owner_token}"},
            files=files,
        )
        assert r.status_code in (200, 201), f"ad upload failed: {r.status_code} {r.text[:400]}"
        body = r.json()
        url = body.get("url") or body.get("media_url") or body.get("file_url")
        assert url, f"url missing in ad upload response: {body}"
        # Either /api/ads/media/ or /api/files/ads/ — both should serve image
        assert url.startswith("/api/"), f"Expected /api/ prefix, got: {url}"
        TestAdMediaUpload.url = url

    def test_get_ad_media_serves_image(self, session, owner_token):
        url = getattr(TestAdMediaUpload, "url", None)
        assert url
        r = session.get(f"{BASE_URL}{url}", headers={"Authorization": f"Bearer {owner_token}"})
        assert r.status_code == 200, f"GET ad media failed: {r.status_code} body[:200]={r.text[:200]}"
        assert "image" in r.headers.get("content-type", "")


# ------------------- 4. Generic /api/files router behavior -------------------
class TestGenericFileRouter:
    def test_invalid_subdir_returns_404(self, session):
        r = session.get(f"{BASE_URL}/api/files/invalidsubdir/hello.png")
        assert r.status_code == 404, f"Whitelist failed — got {r.status_code} for invalid subdir"

    def test_nonexistent_file_in_users_returns_404(self, session):
        r = session.get(f"{BASE_URL}/api/files/users/nonexistent_test_file_xyz.png")
        assert r.status_code == 404

    def test_path_traversal_blocked(self, session):
        # subdir traversal attempt
        r = session.get(f"{BASE_URL}/api/files/..%2Fetc/passwd")
        assert r.status_code in (404, 400)


# ------------------- 5. Migration idempotency -------------------
class TestMigrationIdempotent:
    def test_migration_rerun_zero_updates(self):
        import subprocess
        env = os.environ.copy()
        env["PYTHONPATH"] = "/app/backend"
        result = subprocess.run(
            ["python", "/app/backend/migrations/migrate_upload_urls.py"],
            capture_output=True, text=True, cwd="/app/backend", timeout=60, env=env,
        )
        assert result.returncode == 0, f"Migration failed: {result.stderr}"
        out = result.stdout + result.stderr
        assert "documents updated: 0" in out, f"Migration not idempotent — output: {out[-500:]}"


# ------------------- 6. Regression — previously fixed endpoints -------------------
class TestRegression:
    def test_2fa_status(self, session, owner_token):
        r = session.get(f"{BASE_URL}/api/2fa/status", headers={"Authorization": f"Bearer {owner_token}"})
        assert r.status_code == 200

    def test_email_templates(self, session, owner_token):
        r = session.get(f"{BASE_URL}/api/email-templates", headers={"Authorization": f"Bearer {owner_token}"})
        assert r.status_code == 200

    def test_smtp_health(self, session, owner_token):
        r = session.get(f"{BASE_URL}/api/system/smtp-health/stats", headers={"Authorization": f"Bearer {owner_token}"})
        assert r.status_code == 200

    def test_reports_scheduler_status(self, session, owner_token):
        r = session.get(f"{BASE_URL}/api/reports/scheduler/status", headers={"Authorization": f"Bearer {owner_token}"})
        assert r.status_code == 200

    def test_analytics_dashboard(self, session, owner_token):
        r = session.get(f"{BASE_URL}/api/analytics/dashboard", headers={"Authorization": f"Bearer {owner_token}"})
        assert r.status_code == 200
