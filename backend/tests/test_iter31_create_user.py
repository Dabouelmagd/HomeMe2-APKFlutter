"""
Iteration 31: Tests for new POST /api/super-admin/users endpoint
(create user in any compound by app_owner / super_admin).
Regression on other key endpoints used by the HierarchicalSubs UI.
"""
import os
import uuid
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://profile-nav-debug.preview.emergentagent.com").rstrip("/")


def _login(username: str, password: str):
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": username, "password": password},
        timeout=30,
    )
    if r.status_code != 200:
        return None
    return r.json().get("access_token") or r.json().get("token")


def _auth(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def owner_token():
    tok = _login("Owner_homeme", "Dalia1234@")
    if not tok:
        pytest.skip("App owner login failed")
    return tok


@pytest.fixture(scope="module")
def admin_token():
    return _login("admin", "admin123")


@pytest.fixture(scope="module")
def any_compound_id(owner_token):
    r = requests.get(f"{BASE_URL}/api/super-admin/compounds", headers=_auth(owner_token), timeout=30)
    assert r.status_code == 200, r.text
    compounds = r.json().get("compounds", [])
    if not compounds:
        pytest.skip("No compounds in db")
    return compounds[0]["id"]


@pytest.fixture(scope="module")
def created_user_ids():
    # keep track for cleanup (not forcefully deleted to keep tests simple)
    return []


def _payload(**overrides):
    rand = uuid.uuid4().hex[:8]
    base = {
        "username": f"testnew_{rand}",
        "email": f"testnew_{rand}@example.com",
        "password": "abcdef",
        "full_name": "TEST_iter31 New User",
        "role": "resident",
    }
    base.update(overrides)
    return base


# -------------------- POST /api/super-admin/users --------------------
class TestCreateUser:
    def test_valid_creation(self, owner_token, any_compound_id, created_user_ids):
        body = _payload(compound_id=any_compound_id)
        r = requests.post(f"{BASE_URL}/api/super-admin/users", json=body, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        user = data.get("user") or {}
        assert user.get("id")
        assert user.get("username") == body["username"]
        assert user.get("email") == body["email"]
        assert user.get("role") == "resident"
        assert user.get("compound_id") == any_compound_id
        assert "password_hash" not in user
        assert "_id" not in user
        created_user_ids.append(user["id"])

    def test_missing_required_field_username(self, owner_token, any_compound_id):
        body = _payload(compound_id=any_compound_id)
        body.pop("username")
        r = requests.post(f"{BASE_URL}/api/super-admin/users", json=body, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 400, r.text

    def test_missing_required_field_email(self, owner_token, any_compound_id):
        body = _payload(compound_id=any_compound_id)
        body.pop("email")
        r = requests.post(f"{BASE_URL}/api/super-admin/users", json=body, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 400, r.text

    def test_missing_required_field_full_name(self, owner_token, any_compound_id):
        body = _payload(compound_id=any_compound_id)
        body.pop("full_name")
        r = requests.post(f"{BASE_URL}/api/super-admin/users", json=body, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 400, r.text

    def test_short_password(self, owner_token, any_compound_id):
        body = _payload(compound_id=any_compound_id, password="abc")
        r = requests.post(f"{BASE_URL}/api/super-admin/users", json=body, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 400, r.text

    def test_duplicate_username(self, owner_token, any_compound_id, created_user_ids):
        # First create a user
        body = _payload(compound_id=any_compound_id)
        r = requests.post(f"{BASE_URL}/api/super-admin/users", json=body, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        created_user_ids.append(r.json()["user"]["id"])
        # now duplicate the username with a different email
        dup = _payload(compound_id=any_compound_id, username=body["username"])
        r2 = requests.post(f"{BASE_URL}/api/super-admin/users", json=dup, headers=_auth(owner_token), timeout=30)
        assert r2.status_code == 400, r2.text
        assert "مستخدم" in r2.text or "username" in r2.text.lower() or "already" in r2.text.lower()

    def test_duplicate_email(self, owner_token, any_compound_id, created_user_ids):
        body = _payload(compound_id=any_compound_id)
        r = requests.post(f"{BASE_URL}/api/super-admin/users", json=body, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        created_user_ids.append(r.json()["user"]["id"])
        # now duplicate the email with a different username
        dup = _payload(compound_id=any_compound_id, email=body["email"])
        r2 = requests.post(f"{BASE_URL}/api/super-admin/users", json=dup, headers=_auth(owner_token), timeout=30)
        assert r2.status_code == 400, r2.text

    def test_invalid_compound_id(self, owner_token):
        body = _payload(compound_id="nonexistent-compound-iter31")
        r = requests.post(f"{BASE_URL}/api/super-admin/users", json=body, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 400, r.text

    def test_invalid_role(self, owner_token, any_compound_id):
        body = _payload(compound_id=any_compound_id, role="invalid_role_xyz")
        r = requests.post(f"{BASE_URL}/api/super-admin/users", json=body, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 400, r.text

    def test_forbidden_for_regular_admin(self, admin_token, any_compound_id):
        if not admin_token:
            pytest.skip("admin/admin123 login not available")
        body = _payload(compound_id=any_compound_id)
        r = requests.post(f"{BASE_URL}/api/super-admin/users", json=body, headers=_auth(admin_token), timeout=30)
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"

    def test_valid_creation_appears_in_hierarchical(self, owner_token, any_compound_id, created_user_ids):
        body = _payload(compound_id=any_compound_id, full_name="TEST_iter31 Persistence Check")
        r = requests.post(f"{BASE_URL}/api/super-admin/users", json=body, headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        new_id = r.json()["user"]["id"]
        created_user_ids.append(new_id)
        # verify it shows up in hierarchical subs (users grouped by role inside users_by_role)
        hs = requests.get(f"{BASE_URL}/api/super-admin/hierarchical-subs", headers=_auth(owner_token), timeout=30)
        assert hs.status_code == 200
        tree = hs.json()
        found = False
        def _scan(cpd_list):
            for cpd in cpd_list:
                by_role = cpd.get("users_by_role") or {}
                for _role, lst in by_role.items():
                    for u in (lst or []):
                        if u.get("id") == new_id:
                            return True
            return False
        if _scan(tree.get("independent_compounds", [])):
            found = True
        if not found:
            for co in tree.get("companies", []):
                if _scan(co.get("compounds", [])):
                    found = True
                    break
        assert found, "newly created user not found in /hierarchical-subs tree"


# -------------------- Regression on existing endpoints --------------------
class TestRegression:
    def test_hierarchical_subs_200(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/super-admin/hierarchical-subs", headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200

    def test_bulk_preview_200(self, owner_token):
        r = requests.post(
            f"{BASE_URL}/api/super-admin/bulk-renewal-offer/preview?days_before_expiry=7",
            headers=_auth(owner_token),
            timeout=30,
        )
        assert r.status_code == 200

    def test_full_details_200(self, owner_token, any_compound_id):
        r = requests.get(f"{BASE_URL}/api/super-admin/compounds/{any_compound_id}/full-details", headers=_auth(owner_token), timeout=30)
        assert r.status_code == 200

    def test_send_gift_still_works(self, owner_token, created_user_ids):
        if not created_user_ids:
            pytest.skip("no user available")
        uid = created_user_ids[0]
        r = requests.post(
            f"{BASE_URL}/api/super-admin/users/{uid}/send-gift",
            headers=_auth(owner_token),
            json={"type": "extend_trial", "details": {"days": 3}, "message": "TEST_iter31"},
            timeout=30,
        )
        assert r.status_code == 200, r.text

    def test_update_user_db(self, owner_token, created_user_ids):
        if not created_user_ids:
            pytest.skip("no user available")
        uid = created_user_ids[0]
        r = requests.put(
            f"{BASE_URL}/api/database/users/{uid}",
            headers=_auth(owner_token),
            json={"full_name": "TEST_iter31 Renamed"},
            timeout=30,
        )
        assert r.status_code in (200, 204), r.text

    def test_delete_user_db_cleanup(self, owner_token, created_user_ids):
        if not created_user_ids:
            pytest.skip("no user available")
        # delete one created user to verify DELETE still works
        uid = created_user_ids[-1]
        r = requests.delete(f"{BASE_URL}/api/database/users/{uid}", headers=_auth(owner_token), timeout=30)
        assert r.status_code in (200, 204), r.text
