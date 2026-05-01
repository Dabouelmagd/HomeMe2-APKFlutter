"""Iter 62 — Tests for /api/company-admin/crm-summary aggregation endpoint."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://profile-nav-debug.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CO_ADMIN = ("testcompany2", "Company123!")
SUPER = ("superadmin", "SuperAdmin2024!")
RESIDENT = ("test", "test123")
TESTCO2_COMPANY_ID = "ab8e7501-964c-4424-859f-af16ba8ad2e5"
SEED_COMPOUND_ID = "88ad3711-c9ae-45fe-a270-65f4524c071c"
TEST_USER_ID = "d6012878-6794-4d9a-8196-8577da883f5d"


def _login(username, password):
    r = requests.post(f"{API}/auth/login", json={"username": username, "password": password}, timeout=15)
    assert r.status_code == 200, f"Login failed for {username}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def co_admin_token():
    return _login(*CO_ADMIN)


@pytest.fixture(scope="module")
def super_token():
    return _login(*SUPER)


@pytest.fixture(scope="module")
def resident_token():
    return _login(*RESIDENT)


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# --- Auth/role gate ---
class TestCrmSummaryAuth:
    def test_resident_forbidden(self, resident_token):
        r = requests.get(f"{API}/company-admin/crm-summary", headers=_h(resident_token), timeout=15)
        assert r.status_code == 403, f"resident expected 403, got {r.status_code}: {r.text}"

    def test_no_auth(self):
        r = requests.get(f"{API}/company-admin/crm-summary", timeout=15)
        assert r.status_code in (401, 403)

    def test_super_admin_without_company_id(self, super_token):
        r = requests.get(f"{API}/company-admin/crm-summary", headers=_h(super_token), timeout=15)
        # _resolve_company_id should 400 when override missing
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"


# --- Company admin happy path ---
class TestCrmSummaryAsCompanyAdmin:
    def test_summary_shape(self, co_admin_token):
        r = requests.get(f"{API}/company-admin/crm-summary", headers=_h(co_admin_token), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["company_id"] == TESTCO2_COMPANY_ID
        for k in ("tag_counts", "vip_users", "late_payers", "notes_total"):
            assert k in data, f"missing key {k}"
        assert isinstance(data["tag_counts"], dict)
        assert isinstance(data["vip_users"], list)
        assert isinstance(data["late_payers"], list)
        assert isinstance(data["notes_total"], int)

    def test_seed_counts_vip_and_late(self, co_admin_token):
        r = requests.get(f"{API}/company-admin/crm-summary", headers=_h(co_admin_token), timeout=15)
        data = r.json()
        tc = data["tag_counts"]
        assert tc.get("vip", 0) >= 2, f"expected vip>=2, got {tc.get('vip')}: full={tc}"
        assert tc.get("late_payer", 0) >= 2, f"expected late_payer>=2, got {tc.get('late_payer')}: full={tc}"

    def test_user_rows_have_expected_fields(self, co_admin_token):
        r = requests.get(f"{API}/company-admin/crm-summary", headers=_h(co_admin_token), timeout=15)
        data = r.json()
        for lst_name in ("vip_users", "late_payers"):
            lst = data[lst_name]
            assert len(lst) <= 10, f"{lst_name} should be capped at 10"
            assert len(lst) >= 1, f"{lst_name} expected at least 1 seeded entry"
            for u in lst:
                # All required fields present (may be empty string but key must exist)
                for f in ("id", "compound_name", "unit_number", "phone", "email"):
                    assert f in u, f"{lst_name} missing field {f}: {u}"


# --- Super admin override ---
class TestCrmSummaryAsSuperAdmin:
    def test_with_company_id_override(self, super_token):
        r = requests.get(
            f"{API}/company-admin/crm-summary",
            headers=_h(super_token),
            params={"company_id": TESTCO2_COMPANY_ID},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["company_id"] == TESTCO2_COMPANY_ID
        assert data["tag_counts"].get("vip", 0) >= 2
        assert data["tag_counts"].get("late_payer", 0) >= 2


# --- Notes total increment via user_crm POST note ---
class TestNotesTotal:
    def test_create_note_increments(self, co_admin_token):
        r1 = requests.get(f"{API}/company-admin/crm-summary", headers=_h(co_admin_token), timeout=15)
        before = r1.json()["notes_total"]

        # Create a note on the test resident user (under managed compound)
        note_resp = requests.post(
            f"{API}/users/{TEST_USER_ID}/notes",
            headers=_h(co_admin_token),
            json={"text": "TEST_iter62 note for crm summary"},
            timeout=15,
        )
        assert note_resp.status_code in (200, 201), f"note create failed: {note_resp.status_code} {note_resp.text}"
        note_id = note_resp.json().get("id") or note_resp.json().get("note", {}).get("id")

        r2 = requests.get(f"{API}/company-admin/crm-summary", headers=_h(co_admin_token), timeout=15)
        after = r2.json()["notes_total"]
        assert after == before + 1, f"notes_total did not increment: before={before} after={after}"

        # cleanup
        if note_id:
            requests.delete(
                f"{API}/users/{TEST_USER_ID}/notes/{note_id}",
                headers=_h(co_admin_token),
                timeout=15,
            )
