"""Iter 63 — Backend regression for unified PageHeader iteration:
- /api/company-admin/crm-summary still returns correct notes_total after aggregation refactor
- /api/users/{user_id}/timeline now returns 200 for company_admin on user in their managed compound
- /api/users/{user_id}/timeline still returns 403 for company_admin on user in OTHER company's compound
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

CO_ADMIN = ("testcompany2", "Company123!")
OTHER_CO_ADMIN = ("newco_admin", "NewCo123!")
SUPER = ("superadmin", "SuperAdmin2024!")
TEST_USER_ID = "d6012878-6794-4d9a-8196-8577da883f5d"  # resident under testcompany2's compound
TESTCO2_COMPANY_ID = "ab8e7501-964c-4424-859f-af16ba8ad2e5"


def _login(u, p):
    r = requests.post(f"{API}/auth/login", json={"username": u, "password": p}, timeout=20)
    assert r.status_code == 200, f"Login failed for {u}: {r.status_code} {r.text}"
    return r.json()["access_token"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def co_admin_token():
    return _login(*CO_ADMIN)


@pytest.fixture(scope="module")
def other_co_admin_token():
    return _login(*OTHER_CO_ADMIN)


@pytest.fixture(scope="module")
def super_token():
    return _login(*SUPER)


# ---- crm-summary notes_total after aggregation refactor ----
class TestCrmSummaryNotesTotalAfterRefactor:
    def test_notes_total_is_int_and_matches_create_delete(self, co_admin_token):
        r1 = requests.get(f"{API}/company-admin/crm-summary", headers=_h(co_admin_token), timeout=20)
        assert r1.status_code == 200, r1.text
        before = r1.json()["notes_total"]
        assert isinstance(before, int)

        # create a note
        n = requests.post(
            f"{API}/users/{TEST_USER_ID}/notes",
            headers=_h(co_admin_token),
            json={"text": "TEST_iter63 notes_total refactor"},
            timeout=20,
        )
        assert n.status_code in (200, 201), n.text
        nid = n.json().get("id") or n.json().get("note", {}).get("id")

        r2 = requests.get(f"{API}/company-admin/crm-summary", headers=_h(co_admin_token), timeout=20)
        after = r2.json()["notes_total"]
        assert after == before + 1, f"expected {before+1}, got {after}"

        # cleanup
        if nid:
            requests.delete(
                f"{API}/users/{TEST_USER_ID}/notes/{nid}",
                headers=_h(co_admin_token),
                timeout=20,
            )

        r3 = requests.get(f"{API}/company-admin/crm-summary", headers=_h(co_admin_token), timeout=20)
        final = r3.json()["notes_total"]
        assert final == before, f"after delete expected {before}, got {final}"


# ---- timeline RBAC fix for company_admin ----
class TestUserTimelineRbacFix:
    def test_company_admin_can_access_user_in_managed_compound(self, co_admin_token):
        r = requests.get(
            f"{API}/users/{TEST_USER_ID}/timeline",
            headers=_h(co_admin_token),
            params={"days": 30},
            timeout=20,
        )
        assert r.status_code == 200, f"expected 200 for company_admin on managed compound, got {r.status_code}: {r.text}"
        body = r.json()
        for k in ("user", "events", "analytics"):
            assert k in body, f"missing {k}"
        assert body["user"]["id"] == TEST_USER_ID

    def test_other_company_admin_denied(self, other_co_admin_token):
        r = requests.get(
            f"{API}/users/{TEST_USER_ID}/timeline",
            headers=_h(other_co_admin_token),
            params={"days": 30},
            timeout=20,
        )
        assert r.status_code == 403, f"expected 403 for other-company admin, got {r.status_code}: {r.text}"

    def test_super_admin_still_allowed(self, super_token):
        r = requests.get(
            f"{API}/users/{TEST_USER_ID}/timeline",
            headers=_h(super_token),
            params={"days": 30},
            timeout=20,
        )
        assert r.status_code == 200, r.text

    def test_no_auth_blocked(self):
        r = requests.get(f"{API}/users/{TEST_USER_ID}/timeline", timeout=20)
        assert r.status_code in (401, 403)
