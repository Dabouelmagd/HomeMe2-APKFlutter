"""Regression + happy path tests for Phase 1 hierarchical compound invites."""
import os, secrets, time, requests, pytest
from dotenv import load_dotenv
load_dotenv('/app/frontend/.env')
BASE = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')

DALIA = ('dalia', 'Dalia1234@')
OWNER = ('Owner_homeme', 'Dalia1234@')
SUPER = ('superadmin', 'SuperAdmin2024!')
ROYAL_CPD_ID = '88ad3711-c9ae-45fe-a270-65f4524c071c'

def login(u, p):
    r = requests.post(f"{BASE}/api/auth/login", json={"username": u, "password": p}, timeout=15)
    assert r.status_code == 200, f"login {u} -> {r.status_code} {r.text}"
    return r.json().get('access_token') or r.json().get('token')

def H(tok): return {"Authorization": f"Bearer {tok}"}

# ---------------- Auth/error regression ----------------
def test_list_invites_unauthenticated():
    r = requests.get(f"{BASE}/api/compound-invites", timeout=10)
    assert r.status_code in (401, 403)

def test_create_invite_unauthenticated():
    r = requests.post(f"{BASE}/api/compound-invites", json={"compound_id": ROYAL_CPD_ID}, timeout=10)
    assert r.status_code in (401, 403)

def test_public_token_invalid_returns_404():
    r = requests.get(f"{BASE}/api/compound-invites/token/__nonexistent_token__", timeout=10)
    assert r.status_code == 404

def test_create_bad_role_returns_400():
    tok = login(*DALIA)
    r = requests.post(f"{BASE}/api/compound-invites",
                      json={"compound_id": ROYAL_CPD_ID, "role": "hacker"},
                      headers=H(tok), timeout=15)
    assert r.status_code == 400

# ---------------- Compound Admin (dalia) full flow ----------------
@pytest.fixture(scope="module")
def dalia_invite():
    tok = login(*DALIA)
    payload = {"compound_id": ROYAL_CPD_ID, "role": "resident",
               "validity_days": 14, "max_uses": 5,
               "note": "TEST_iter45 دفعة سكان أبراج 2026"}
    r = requests.post(f"{BASE}/api/compound-invites", json=payload, headers=H(tok), timeout=15)
    assert r.status_code == 200, r.text
    inv = r.json()['invite']
    yield tok, inv
    # cleanup
    try:
        requests.delete(f"{BASE}/api/compound-invites/{inv['id']}", headers=H(tok), timeout=10)
    except Exception: pass

def test_dalia_create_lists_at_top(dalia_invite):
    tok, inv = dalia_invite
    assert inv['role'] == 'resident'
    assert inv['max_uses'] == 5
    assert inv['used_count'] == 0
    assert inv['join_url'].startswith('/join/')
    r = requests.get(f"{BASE}/api/compound-invites",
                     params={"compound_id": ROYAL_CPD_ID}, headers=H(tok), timeout=10)
    assert r.status_code == 200
    ids = [i['id'] for i in r.json()['invites']]
    assert inv['id'] in ids

def test_public_view_token_returns_compound_info(dalia_invite):
    _, inv = dalia_invite
    tok_str = inv['token']
    r = requests.get(f"{BASE}/api/compound-invites/token/{tok_str}", timeout=10)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j['valid'] is True
    assert j['role'] == 'resident'
    assert j['compound']['id'] == ROYAL_CPD_ID

def test_public_accept_creates_user_and_increments(dalia_invite):
    _, inv = dalia_invite
    tok_str = inv['token']
    uniq = f"TEST_iter45_{secrets.token_hex(4)}"
    payload = {"full_name": "Iter45 Tester", "username": uniq,
               "email": f"{uniq}@example.com", "password": "secret123",
               "unit_number": "A-101"}
    r = requests.post(f"{BASE}/api/compound-invites/token/{tok_str}/accept",
                      json=payload, timeout=15)
    assert r.status_code == 200, r.text
    # verify used_count incremented
    tok = login(*DALIA)
    r2 = requests.get(f"{BASE}/api/compound-invites",
                      params={"compound_id": ROYAL_CPD_ID}, headers=H(tok), timeout=10)
    found = next((i for i in r2.json()['invites'] if i['id'] == inv['id']), None)
    assert found is not None
    assert found['used_count'] == 1

def test_accept_short_password_400(dalia_invite):
    _, inv = dalia_invite
    r = requests.post(f"{BASE}/api/compound-invites/token/{inv['token']}/accept",
                      json={"full_name": "x", "username": f"TEST_p_{secrets.token_hex(3)}",
                            "email": f"p_{secrets.token_hex(3)}@x.com", "password": "12"},
                      timeout=10)
    assert r.status_code == 400

def test_dalia_can_revoke(dalia_invite):
    tok, inv = dalia_invite
    # create one extra, then revoke it (don't revoke main fixture or other tests fail)
    r = requests.post(f"{BASE}/api/compound-invites",
                      json={"compound_id": ROYAL_CPD_ID, "role": "manager",
                            "validity_days": 7, "note": "TEST_iter45_revoke"},
                      headers=H(tok), timeout=15)
    assert r.status_code == 200
    new_id = r.json()['invite']['id']
    new_tok = r.json()['invite']['token']
    r2 = requests.delete(f"{BASE}/api/compound-invites/{new_id}", headers=H(tok), timeout=10)
    assert r2.status_code == 200
    # Token now revoked → public view should be 410
    r3 = requests.get(f"{BASE}/api/compound-invites/token/{new_tok}", timeout=10)
    assert r3.status_code == 410

# ---------------- App Owner & Super Admin wide-scope ----------------
@pytest.mark.parametrize("creds", [OWNER, SUPER])
def test_wide_scope_can_create_for_any_compound(creds):
    tok = login(*creds)
    r = requests.post(f"{BASE}/api/compound-invites",
                      json={"compound_id": ROYAL_CPD_ID, "role": "manager",
                            "validity_days": 30, "note": f"TEST_iter45_{creds[0]}"},
                      headers=H(tok), timeout=15)
    assert r.status_code == 200, r.text
    iid = r.json()['invite']['id']
    # cleanup
    requests.delete(f"{BASE}/api/compound-invites/{iid}", headers=H(tok), timeout=10)

def test_wide_scope_list_all():
    tok = login(*OWNER)
    r = requests.get(f"{BASE}/api/compound-invites", headers=H(tok), timeout=10)
    assert r.status_code == 200
    assert isinstance(r.json().get('invites'), list)
