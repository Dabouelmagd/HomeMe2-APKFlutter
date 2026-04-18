"""
Test DELETE /api/admin/users/{user_id} endpoint - iteration 26
Verifies fix for Delete User button in Super Admin panel.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://profile-nav-debug.preview.emergentagent.com').rstrip('/')


def _login(username, password):
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"username": username, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed {r.status_code}: {r.text}"
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="module")
def super_admin_token():
    return _login("superadmin", "SuperAdmin2024!")


@pytest.fixture(scope="module")
def owner_token():
    return _login("Owner_homeme", "Dalia1234@")


def _headers(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def test_super_admin_users_list_loads(super_admin_token):
    r = requests.get(f"{BASE_URL}/api/super-admin/users", headers=_headers(super_admin_token), timeout=30)
    assert r.status_code == 200
    body = r.json()
    assert "users" in body
    assert isinstance(body["users"], list)


def test_delete_self_forbidden(super_admin_token):
    # get current user id
    me = requests.get(f"{BASE_URL}/api/auth/me", headers=_headers(super_admin_token), timeout=30)
    assert me.status_code == 200
    my_id = me.json().get("id") or me.json().get("user", {}).get("id")
    assert my_id, f"cannot get id: {me.json()}"
    r = requests.delete(f"{BASE_URL}/api/admin/users/{my_id}", headers=_headers(super_admin_token), timeout=30)
    assert r.status_code == 400
    assert "Cannot delete your own account" in r.text


def test_delete_nonexistent_user_404(super_admin_token):
    fake = f"TEST_nonexistent_{uuid.uuid4()}"
    r = requests.delete(f"{BASE_URL}/api/admin/users/{fake}", headers=_headers(super_admin_token), timeout=30)
    assert r.status_code == 404


def test_create_and_delete_resident_flow(owner_token, super_admin_token):
    """Use owner (has compound) to create resident; then super_admin deletes it."""
    # Try create via owner which likely has compound_id
    payload = {
        "username": f"TEST_del_{uuid.uuid4().hex[:8]}",
        "email": f"TEST_del_{uuid.uuid4().hex[:8]}@example.com",
        "password": "TestPass123!",
        "full_name": "TEST Delete Me",
        "phone": "01000000000",
        "unit_number": "T1",
        "role": "resident"
    }
    create = requests.post(f"{BASE_URL}/api/admin/users", json=payload, headers=_headers(owner_token), timeout=30)
    if create.status_code != 200:
        pytest.skip(f"Cannot create test user as owner: {create.status_code} {create.text}")
    user_id = create.json().get("user_id")
    assert user_id

    # delete as super_admin
    d = requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=_headers(super_admin_token), timeout=30)
    assert d.status_code == 200, f"delete failed: {d.status_code} {d.text}"
    body = d.json()
    assert body.get("message") == "User deleted successfully"

    # verify deleted: delete again should return 404
    d2 = requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=_headers(super_admin_token), timeout=30)
    assert d2.status_code == 404
