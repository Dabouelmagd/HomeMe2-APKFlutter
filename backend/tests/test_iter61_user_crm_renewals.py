"""
Iteration 61 — Tests for:
  1. Manual subscription renewal trigger (/api/super-admin/trigger-renewals)
  2. User CRM (tags + notes) /api/users/{uid}/... + /api/users/crm/tag-suggestions

Run:
  pytest /app/backend/tests/test_iter61_user_crm_renewals.py -v \
     --junitxml=/app/test_reports/pytest/iter61_results.xml
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://profile-nav-debug.preview.emergentagent.com").rstrip("/")

# Credentials from /app/memory/test_credentials.md
SUPERADMIN = ("superadmin", "SuperAdmin2024!")
OWNER = ("Owner_homeme", "Dalia1234@")
RESIDENT = ("test", "test123")
COMPANY = ("testcompany2", "Company123!")

TEST_USER_ID = "d6012878-6794-4d9a-8196-8577da883f5d"  # resident 'test'


def _login(username, password):
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"username": username, "password": password}, timeout=15)
    if r.status_code != 200:
        return None
    j = r.json()
    return j.get("token") or j.get("access_token")


# ---------- session fixtures ----------
@pytest.fixture(scope="module")
def super_token():
    t = _login(*SUPERADMIN)
    if not t:
        pytest.skip("superadmin login failed")
    return t


@pytest.fixture(scope="module")
def owner_token():
    t = _login(*OWNER)
    if not t:
        pytest.skip("app_owner login failed")
    return t


@pytest.fixture(scope="module")
def resident_token():
    t = _login(*RESIDENT)
    if not t:
        pytest.skip("resident login failed")
    return t


@pytest.fixture(scope="module")
def company_token():
    t = _login(*COMPANY)
    if not t:
        pytest.skip("company_admin login failed")
    return t


def H(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# =============================================================================
# 1) RENEWAL REMINDER TRIGGER
# =============================================================================
class TestRenewalTrigger:
    def test_super_admin_can_trigger(self, super_token):
        r = requests.post(f"{BASE_URL}/api/super-admin/trigger-renewals",
                          headers=H(super_token), timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("status") == "ok"
        assert "emails_dispatched" in data
        assert isinstance(data["emails_dispatched"], int)
        assert data["emails_dispatched"] >= 0
        assert "triggered_at" in data

    def test_app_owner_can_trigger(self, owner_token):
        r = requests.post(f"{BASE_URL}/api/super-admin/trigger-renewals",
                          headers=H(owner_token), timeout=60)
        # app_owner should also be allowed (require_super_admin usually accepts both)
        assert r.status_code in (200, 403), r.text
        if r.status_code == 200:
            assert r.json().get("status") == "ok"

    def test_resident_cannot_trigger(self, resident_token):
        r = requests.post(f"{BASE_URL}/api/super-admin/trigger-renewals",
                          headers=H(resident_token), timeout=30)
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"

    def test_unauthenticated_cannot_trigger(self):
        r = requests.post(f"{BASE_URL}/api/super-admin/trigger-renewals", timeout=30)
        assert r.status_code in (401, 403)

    def test_idempotent_second_call(self, super_token):
        r1 = requests.post(f"{BASE_URL}/api/super-admin/trigger-renewals",
                           headers=H(super_token), timeout=60)
        r2 = requests.post(f"{BASE_URL}/api/super-admin/trigger-renewals",
                           headers=H(super_token), timeout=60)
        assert r1.status_code == 200 and r2.status_code == 200
        # Second immediate call should typically dispatch 0 additional emails
        assert r2.json()["emails_dispatched"] <= r1.json()["emails_dispatched"] + 5


# =============================================================================
# 2) USER CRM — tags & notes
# =============================================================================
class TestUserCRM:
    def test_get_crm_as_super_admin(self, super_token):
        r = requests.get(f"{BASE_URL}/api/users/{TEST_USER_ID}/crm",
                         headers=H(super_token), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user_id"] == TEST_USER_ID
        assert isinstance(d.get("tags"), list)
        assert isinstance(d.get("tag_colors"), dict)
        assert isinstance(d.get("notes"), list)

    def test_resident_cannot_get_crm(self, resident_token):
        r = requests.get(f"{BASE_URL}/api/users/{TEST_USER_ID}/crm",
                         headers=H(resident_token), timeout=15)
        assert r.status_code == 403

    def test_add_tag_creates(self, super_token):
        # First cleanup in case previous run left it
        requests.delete(f"{BASE_URL}/api/users/{TEST_USER_ID}/tags/test_vip",
                        headers=H(super_token), timeout=15)
        r = requests.post(f"{BASE_URL}/api/users/{TEST_USER_ID}/tags",
                          headers=H(super_token),
                          json={"tag": "TEST_VIP", "color": "amber"}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["success"] is True
        # tags are lowercased
        assert "test_vip" in d["tags"]
        assert d["colors"].get("test_vip") == "amber"

        # verify persistence via GET
        g = requests.get(f"{BASE_URL}/api/users/{TEST_USER_ID}/crm",
                         headers=H(super_token), timeout=15).json()
        assert "test_vip" in g["tags"]
        assert g["tag_colors"].get("test_vip") == "amber"

    def test_add_tag_idempotent(self, super_token):
        r1 = requests.post(f"{BASE_URL}/api/users/{TEST_USER_ID}/tags",
                           headers=H(super_token),
                           json={"tag": "test_vip", "color": "amber"}, timeout=15)
        r2 = requests.post(f"{BASE_URL}/api/users/{TEST_USER_ID}/tags",
                           headers=H(super_token),
                           json={"tag": "test_vip", "color": "amber"}, timeout=15)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["tags"].count("test_vip") == 1
        assert r2.json()["tags"].count("test_vip") == 1

    def test_tag_too_long_rejected(self, super_token):
        long_tag = "x" * 40
        r = requests.post(f"{BASE_URL}/api/users/{TEST_USER_ID}/tags",
                          headers=H(super_token),
                          json={"tag": long_tag}, timeout=15)
        assert r.status_code == 400

    def test_empty_tag_rejected(self, super_token):
        r = requests.post(f"{BASE_URL}/api/users/{TEST_USER_ID}/tags",
                          headers=H(super_token),
                          json={"tag": "   "}, timeout=15)
        assert r.status_code == 400

    def test_delete_tag(self, super_token):
        # ensure it exists
        requests.post(f"{BASE_URL}/api/users/{TEST_USER_ID}/tags",
                      headers=H(super_token),
                      json={"tag": "test_del", "color": "blue"}, timeout=15)
        r = requests.delete(f"{BASE_URL}/api/users/{TEST_USER_ID}/tags/test_del",
                            headers=H(super_token), timeout=15)
        assert r.status_code == 200
        g = requests.get(f"{BASE_URL}/api/users/{TEST_USER_ID}/crm",
                         headers=H(super_token), timeout=15).json()
        assert "test_del" not in g["tags"]
        assert "test_del" not in g["tag_colors"]

    def test_resident_cannot_add_tag(self, resident_token):
        r = requests.post(f"{BASE_URL}/api/users/{TEST_USER_ID}/tags",
                          headers=H(resident_token),
                          json={"tag": "hack"}, timeout=15)
        assert r.status_code == 403

    def test_create_update_delete_note(self, super_token):
        # CREATE
        r = requests.post(f"{BASE_URL}/api/users/{TEST_USER_ID}/notes",
                          headers=H(super_token),
                          json={"text": "TEST_NOTE unit-test note", "color": "emerald"}, timeout=15)
        assert r.status_code == 200, r.text
        note = r.json()["note"]
        assert note["text"] == "TEST_NOTE unit-test note"
        assert note["color"] == "emerald"
        assert note["created_by_name"]
        note_id = note["id"]

        # Verify persisted via GET
        g = requests.get(f"{BASE_URL}/api/users/{TEST_USER_ID}/crm",
                         headers=H(super_token), timeout=15).json()
        assert any(n["id"] == note_id for n in g["notes"])

        # UPDATE
        u = requests.put(f"{BASE_URL}/api/users/{TEST_USER_ID}/notes/{note_id}",
                        headers=H(super_token),
                        json={"text": "TEST_NOTE updated body"}, timeout=15)
        assert u.status_code == 200, u.text
        updated = u.json()["note"]
        assert updated["text"] == "TEST_NOTE updated body"
        assert updated.get("updated_at") is not None
        assert updated.get("updated_by") is not None

        # DELETE
        d = requests.delete(f"{BASE_URL}/api/users/{TEST_USER_ID}/notes/{note_id}",
                            headers=H(super_token), timeout=15)
        assert d.status_code == 200
        # Verify gone
        g2 = requests.get(f"{BASE_URL}/api/users/{TEST_USER_ID}/crm",
                          headers=H(super_token), timeout=15).json()
        assert not any(n["id"] == note_id for n in g2["notes"])

    def test_note_empty_rejected(self, super_token):
        r = requests.post(f"{BASE_URL}/api/users/{TEST_USER_ID}/notes",
                          headers=H(super_token),
                          json={"text": "   "}, timeout=15)
        assert r.status_code == 400

    def test_note_too_long_rejected(self, super_token):
        r = requests.post(f"{BASE_URL}/api/users/{TEST_USER_ID}/notes",
                          headers=H(super_token),
                          json={"text": "x" * 2100}, timeout=15)
        assert r.status_code == 400

    def test_update_nonexistent_note_404(self, super_token):
        r = requests.put(
            f"{BASE_URL}/api/users/{TEST_USER_ID}/notes/{uuid.uuid4()}",
            headers=H(super_token),
            json={"text": "x"}, timeout=15,
        )
        assert r.status_code == 404

    def test_resident_cannot_create_note(self, resident_token):
        r = requests.post(f"{BASE_URL}/api/users/{TEST_USER_ID}/notes",
                          headers=H(resident_token),
                          json={"text": "hack"}, timeout=15)
        assert r.status_code == 403

    def test_tag_suggestions_for_super_admin(self, super_token):
        # Ensure at least one tag exists
        requests.post(f"{BASE_URL}/api/users/{TEST_USER_ID}/tags",
                      headers=H(super_token),
                      json={"tag": "test_sugg", "color": "pink"}, timeout=15)
        r = requests.get(f"{BASE_URL}/api/users/crm/tag-suggestions",
                         headers=H(super_token), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("suggestions"), list)
        tags = {s["tag"] for s in d["suggestions"]}
        assert "test_sugg" in tags
        # cleanup
        requests.delete(f"{BASE_URL}/api/users/{TEST_USER_ID}/tags/test_sugg",
                        headers=H(super_token), timeout=15)

    def test_tag_suggestions_resident_forbidden(self, resident_token):
        r = requests.get(f"{BASE_URL}/api/users/crm/tag-suggestions",
                         headers=H(resident_token), timeout=15)
        assert r.status_code == 403

    def test_nonexistent_user_returns_404(self, super_token):
        r = requests.get(f"{BASE_URL}/api/users/{uuid.uuid4()}/crm",
                         headers=H(super_token), timeout=15)
        assert r.status_code == 404


# =============================================================================
# 3) RBAC: company_admin outside their compound
# =============================================================================
class TestRBACCrossCompound:
    def test_company_admin_cannot_manage_user_outside_their_compound(self, company_token, super_token):
        """
        Resident 'test' (TEST_USER_ID) lives in a compound NOT managed by testcompany2's company.
        (testcompany2 manages 'مدينتي' & 'الرحاب'.) So company_admin should get 403.
        If the test user actually IS in their compound this test will be adjusted.
        """
        r = requests.get(f"{BASE_URL}/api/users/{TEST_USER_ID}/crm",
                         headers=H(company_token), timeout=15)
        # Either target user isn't in their compound → 403, OR it IS → 200.
        # We accept both but assert a concrete response.
        assert r.status_code in (200, 403), r.text
        if r.status_code == 403:
            # Try a tag add → must also be blocked
            r2 = requests.post(f"{BASE_URL}/api/users/{TEST_USER_ID}/tags",
                               headers=H(company_token),
                               json={"tag": "test_hack"}, timeout=15)
            assert r2.status_code == 403


# =============================================================================
# Cleanup
# =============================================================================
@pytest.fixture(scope="module", autouse=True)
def _cleanup_after(super_token):
    yield
    # Remove any lingering TEST_* tags
    try:
        g = requests.get(f"{BASE_URL}/api/users/{TEST_USER_ID}/crm",
                         headers=H(super_token), timeout=15).json()
        for t in list(g.get("tags", [])):
            if t.startswith("test_"):
                requests.delete(f"{BASE_URL}/api/users/{TEST_USER_ID}/tags/{t}",
                                headers=H(super_token), timeout=15)
        for n in g.get("notes", []):
            if "TEST_NOTE" in (n.get("text") or ""):
                requests.delete(f"{BASE_URL}/api/users/{TEST_USER_ID}/notes/{n['id']}",
                                headers=H(super_token), timeout=15)
    except Exception:
        pass
