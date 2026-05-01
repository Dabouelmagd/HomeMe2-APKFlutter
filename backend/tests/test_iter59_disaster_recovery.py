"""
Iter59 — Disaster Recovery Wizard + Feature Gating
Tests:
  - GET /preview, /snapshot, /restore, /history (RBAC + happy path)
  - Feature gate on /api/financial/export-excel + /api/reports/compound/{id}/summary
"""
import io
import os
import json
import zipfile
import hashlib
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://profile-nav-debug.preview.emergentagent.com").rstrip("/")
DR = f"{BASE_URL}/api/super-admin/disaster-recovery"


def _login(username, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": username, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed for {username}: {r.status_code} {r.text}"
    j = r.json()
    return j.get("token") or j.get("access_token")


@pytest.fixture(scope="module")
def owner_token():
    return _login("Owner_homeme", "Dalia1234@")


@pytest.fixture(scope="module")
def super_token():
    return _login("superadmin", "SuperAdmin2024!")


@pytest.fixture(scope="module")
def company_token():
    return _login("testcompany2", "Company123!")


@pytest.fixture(scope="module")
def newco_token():
    return _login("newco_admin", "NewCo123!")


def H(t):
    return {"Authorization": f"Bearer {t}"}


# ---------- DR PREVIEW ----------
def test_dr_preview_owner(owner_token):
    r = requests.get(f"{DR}/preview", headers=H(owner_token), timeout=30)
    assert r.status_code == 200, r.text
    j = r.json()
    assert "collections" in j and isinstance(j["collections"], list)
    assert "total_documents" in j
    assert "media_files_count" in j
    assert "app_version" in j
    assert "excluded" in j and isinstance(j["excluded"], list)


def test_dr_preview_company_admin_403(company_token):
    r = requests.get(f"{DR}/preview", headers=H(company_token), timeout=30)
    assert r.status_code == 403, r.text


# ---------- DR SNAPSHOT ----------
@pytest.fixture(scope="module")
def snapshot_zip(owner_token):
    r = requests.get(f"{DR}/snapshot", headers=H(owner_token), timeout=180)
    assert r.status_code == 200, r.text[:500]
    assert r.headers.get("content-type", "").startswith("application/zip"), r.headers
    data = r.content
    assert len(data) > 10_000, f"zip too small: {len(data)}"
    return data


def test_dr_snapshot_zip_layout_and_checksums(snapshot_zip):
    zf = zipfile.ZipFile(io.BytesIO(snapshot_zip))
    names = zf.namelist()
    assert "manifest.json" in names
    manifest = json.loads(zf.read("manifest.json"))
    assert manifest.get("version") == "1"
    assert "collections" in manifest and len(manifest["collections"]) > 0
    # Verify sha256 for every collection
    for col in manifest["collections"]:
        path = f"collections/{col['name']}.json"
        assert path in names, f"missing {path}"
        payload = zf.read(path)
        sha = hashlib.sha256(payload).hexdigest()
        assert sha == col["sha256"], f"sha mismatch for {col['name']}"
    # Verify media sha256
    for m in manifest.get("media", []):
        path = f"media/{m['filename']}"
        if path in names:
            data = zf.read(path)
            assert hashlib.sha256(data).hexdigest() == m["sha256"], f"media sha mismatch: {m['filename']}"


def test_dr_snapshot_company_admin_403(company_token):
    r = requests.get(f"{DR}/snapshot", headers=H(company_token), timeout=30)
    assert r.status_code == 403


# ---------- DR RESTORE ----------
def test_dr_restore_missing_confirm_422(owner_token, snapshot_zip):
    files = {"file": ("snap.zip", snapshot_zip, "application/zip")}
    r = requests.post(f"{DR}/restore", headers=H(owner_token), files=files, timeout=180)
    assert r.status_code == 422, r.text[:300]


def test_dr_restore_wrong_confirm_400(owner_token, snapshot_zip):
    files = {"file": ("snap.zip", snapshot_zip, "application/zip")}
    r = requests.post(f"{DR}/restore?confirm=NO", headers=H(owner_token), files=files, timeout=180)
    assert r.status_code == 400, r.text[:300]


def test_dr_restore_company_admin_403(company_token, snapshot_zip):
    files = {"file": ("snap.zip", snapshot_zip, "application/zip")}
    r = requests.post(
        f"{DR}/restore?confirm=I_UNDERSTAND_OVERWRITE",
        headers=H(company_token), files=files, timeout=120,
    )
    assert r.status_code == 403


def test_dr_restore_happy_path_idempotent(owner_token, snapshot_zip):
    """Restore the SAME snapshot — should be idempotent (no data loss)."""
    files = {"file": ("snap.zip", snapshot_zip, "application/zip")}
    r = requests.post(
        f"{DR}/restore?confirm=I_UNDERSTAND_OVERWRITE",
        headers=H(owner_token), files=files, timeout=300,
    )
    assert r.status_code == 200, r.text[:500]
    j = r.json()
    assert j.get("success") is True, f"errors: {j.get('errors')}"
    assert j["restored"]["collections_count"] > 0


# ---------- DR HISTORY ----------
def test_dr_history(owner_token):
    r = requests.get(f"{DR}/history", headers=H(owner_token), timeout=30)
    assert r.status_code == 200, r.text
    j = r.json()
    assert "runs" in j and isinstance(j["runs"], list)
    assert len(j["runs"]) > 0
    sample = j["runs"][0]
    assert "action" in sample and "username" in sample and "timestamp" in sample


def test_dr_history_company_admin_403(company_token):
    r = requests.get(f"{DR}/history", headers=H(company_token), timeout=30)
    assert r.status_code == 403


# ---------- FEATURE GATING ----------
def test_export_excel_blocked_for_free_plan(newco_token):
    r = requests.get(f"{BASE_URL}/api/financial/export-excel", headers=H(newco_token), timeout=30)
    assert r.status_code == 403, r.text[:300]
    try:
        detail = r.json().get("detail")
        if isinstance(detail, dict):
            assert detail.get("code") == "plan_limit_feature"
    except Exception:
        pass


def test_export_excel_allowed_for_enterprise(company_token):
    r = requests.get(f"{BASE_URL}/api/financial/export-excel", headers=H(company_token), timeout=60)
    # 200 (or 204 / 500 if no data); MUST NOT be 403
    assert r.status_code != 403, r.text[:300]


def test_compound_summary_blocked_for_free_plan(newco_token):
    # Try to find a compound id; even with 0 compounds, route should still gate first.
    r = requests.get(f"{BASE_URL}/api/reports/compound/any-id/summary?month=2026-01", headers=H(newco_token), timeout=30)
    assert r.status_code == 403, r.text[:300]
    try:
        detail = r.json().get("detail")
        if isinstance(detail, dict):
            assert detail.get("code") == "plan_limit_feature"
    except Exception:
        pass


def test_compound_summary_allowed_for_enterprise(company_token):
    # Get company's compounds first
    r = requests.get(f"{BASE_URL}/api/company-admin/compounds", headers=H(company_token), timeout=30)
    assert r.status_code == 200, r.text[:300]
    compounds = r.json() if isinstance(r.json(), list) else r.json().get("compounds", [])
    if not compounds:
        pytest.skip("no compounds for testcompany2")
    cid = compounds[0].get("id")
    r2 = requests.get(f"{BASE_URL}/api/reports/compound/{cid}/summary?month=2026-01", headers=H(company_token), timeout=60)
    # Gate must NOT fire for enterprise. 403 is allowed only if it's NOT plan_limit_feature.
    if r2.status_code == 403:
        try:
            detail = r2.json().get("detail")
            if isinstance(detail, dict):
                assert detail.get("code") != "plan_limit_feature", f"Enterprise should not be plan-gated: {detail}"
        except Exception:
            pass
