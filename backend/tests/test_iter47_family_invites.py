"""Iter47 — Phase 3: Family Invites (POST/GET/DELETE/token-view/token-accept)."""
import os, secrets, requests, pytest
from dotenv import load_dotenv
load_dotenv('/app/frontend/.env')
BASE = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')

DALIA = ('dalia', 'Dalia1234@')
OWNER = ('Owner_homeme', 'Dalia1234@')


def login(u, p):
    r = requests.post(f"{BASE}/api/auth/login", json={"username": u, "password": p}, timeout=15)
    assert r.status_code == 200, f"login {u} -> {r.status_code} {r.text}"
    return r.json().get('access_token') or r.json().get('token')


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


def me(tok):
    r = requests.get(f"{BASE}/api/auth/me", headers=H(tok), timeout=10)
    assert r.status_code == 200, r.text
    return r.json()


# ---------------- Auth/error regression ----------------
def test_list_unauth():
    r = requests.get(f"{BASE}/api/family-invites", timeout=10)
    assert r.status_code in (401, 403)


def test_create_unauth():
    r = requests.post(f"{BASE}/api/family-invites", json={}, timeout=10)
    assert r.status_code in (401, 403)


def test_public_token_invalid_404():
    r = requests.get(f"{BASE}/api/family-invites/token/__nope__", timeout=10)
    assert r.status_code == 404


def test_create_bad_relationship_400():
    tok = login(*DALIA)
    r = requests.post(f"{BASE}/api/family-invites",
                      json={"relationship": "alien"},
                      headers=H(tok), timeout=15)
    assert r.status_code == 400


def test_create_bad_validity_low_400():
    tok = login(*DALIA)
    r = requests.post(f"{BASE}/api/family-invites",
                      json={"relationship": "spouse", "validity_days": 0},
                      headers=H(tok), timeout=15)
    assert r.status_code == 400


def test_create_bad_validity_high_400():
    tok = login(*DALIA)
    r = requests.post(f"{BASE}/api/family-invites",
                      json={"relationship": "spouse", "validity_days": 91},
                      headers=H(tok), timeout=15)
    assert r.status_code == 400


# ---------------- Dalia full flow ----------------
@pytest.fixture(scope="module")
def dalia_ctx():
    tok = login(*DALIA)
    user = me(tok)
    if not user.get('compound_id'):
        pytest.skip(f"dalia has no compound_id; skipping. user={user}")
    return tok, user


@pytest.fixture(scope="module")
def dalia_invite(dalia_ctx):
    tok, _ = dalia_ctx
    payload = {"relationship": "spouse", "validity_days": 14,
               "max_uses": 1, "invitee_name": "زوجة دالية",
               "note": "TEST_iter47_spouse"}
    r = requests.post(f"{BASE}/api/family-invites", json=payload, headers=H(tok), timeout=15)
    assert r.status_code == 200, r.text
    inv = r.json()['invite']
    yield tok, inv
    try:
        requests.delete(f"{BASE}/api/family-invites/{inv['id']}", headers=H(tok), timeout=10)
    except Exception:
        pass


def test_dalia_create_returns_structured(dalia_invite, dalia_ctx):
    _, inv = dalia_invite
    _, user = dalia_ctx
    assert inv['relationship'] == 'spouse'
    assert inv['max_uses'] == 1
    assert inv['used_count'] == 0
    assert inv['is_active'] is True
    assert inv['compound_id'] == user.get('compound_id')
    assert inv['join_url'].startswith('/join-family/')
    assert inv['token']
    assert inv['family_id']
    assert inv['invitee_name_hint'] == 'زوجة دالية'


def test_get_lists_only_own(dalia_invite):
    tok, inv = dalia_invite
    r = requests.get(f"{BASE}/api/family-invites", headers=H(tok), timeout=10)
    assert r.status_code == 200
    invs = r.json()['invites']
    ids = [i['id'] for i in invs]
    assert inv['id'] in ids
    # all created_by should be the dalia user
    user = me(tok)
    for i in invs:
        assert i['created_by'] == user['id']


def test_public_view_token(dalia_invite):
    _, inv = dalia_invite
    r = requests.get(f"{BASE}/api/family-invites/token/{inv['token']}", timeout=10)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j['valid'] is True
    assert j['relationship'] == 'spouse'
    assert j['compound'] is not None
    assert j['compound'].get('id') == inv['compound_id']
    assert j['inviter'] is not None
    assert j['remaining_uses'] == 1


def test_accept_creates_user_and_increments(dalia_invite, dalia_ctx):
    _, inv = dalia_invite
    _, inviter = dalia_ctx
    uniq = f"TEST_iter47_{secrets.token_hex(4)}"
    payload = {"full_name": "Iter47 Spouse", "username": uniq,
               "email": f"{uniq}@example.com", "password": "secret123",
               "phone": "0100000000"}
    r = requests.post(f"{BASE}/api/family-invites/token/{inv['token']}/accept",
                      json=payload, timeout=15)
    assert r.status_code == 200, r.text
    user = r.json()['user']
    assert user['role'] == 'resident'
    assert user['family_id'] == inv['family_id']
    assert user['compound_id'] == inviter.get('compound_id')
    assert user['unit_number'] == inviter.get('unit_number')
    assert user['source'] == 'family_invite_link'
    assert user['relationship_to_head'] == 'spouse'
    # used_count now 1 → next view should be 410 (used_up)
    r2 = requests.get(f"{BASE}/api/family-invites/token/{inv['token']}", timeout=10)
    assert r2.status_code == 410


def test_accept_duplicate_username_400(dalia_ctx):
    tok, _ = dalia_ctx
    # create fresh invite with max_uses=2 so we can attempt twice
    r = requests.post(f"{BASE}/api/family-invites",
                      json={"relationship": "child", "validity_days": 5, "max_uses": 2,
                            "note": "TEST_iter47_dup"},
                      headers=H(tok), timeout=15)
    assert r.status_code == 200
    inv = r.json()['invite']
    uniq = f"TEST_dup_{secrets.token_hex(4)}"
    p1 = {"full_name": "A", "username": uniq, "email": f"{uniq}@x.com", "password": "secret123"}
    r1 = requests.post(f"{BASE}/api/family-invites/token/{inv['token']}/accept", json=p1, timeout=15)
    assert r1.status_code == 200
    # duplicate same username
    r2 = requests.post(f"{BASE}/api/family-invites/token/{inv['token']}/accept", json=p1, timeout=15)
    assert r2.status_code == 400
    requests.delete(f"{BASE}/api/family-invites/{inv['id']}", headers=H(tok), timeout=10)


def test_accept_short_password_400(dalia_ctx):
    tok, _ = dalia_ctx
    r = requests.post(f"{BASE}/api/family-invites",
                      json={"relationship": "sibling", "validity_days": 3,
                            "note": "TEST_iter47_pw"},
                      headers=H(tok), timeout=15)
    assert r.status_code == 200
    inv = r.json()['invite']
    uniq = f"TEST_pw_{secrets.token_hex(3)}"
    r2 = requests.post(f"{BASE}/api/family-invites/token/{inv['token']}/accept",
                      json={"full_name": "x", "username": uniq,
                            "email": f"{uniq}@x.com", "password": "12"},
                      timeout=10)
    assert r2.status_code == 400
    requests.delete(f"{BASE}/api/family-invites/{inv['id']}", headers=H(tok), timeout=10)


# ---------------- Revoke / 403 ----------------
def test_revoke_by_other_user_403(dalia_ctx):
    tok_d, _ = dalia_ctx
    # dalia creates
    r = requests.post(f"{BASE}/api/family-invites",
                      json={"relationship": "driver", "validity_days": 7,
                            "note": "TEST_iter47_403"},
                      headers=H(tok_d), timeout=15)
    assert r.status_code == 200
    inv = r.json()['invite']
    # Create a fresh user via the invite token who has no perms on dalia's invite
    uniq = f"TEST_other_{secrets.token_hex(4)}"
    pw = "secret123"
    rr = requests.post(f"{BASE}/api/family-invites/token/{inv['token']}/accept",
                       json={"full_name": "Outsider", "username": uniq,
                             "email": f"{uniq}@x.com", "password": pw}, timeout=15)
    assert rr.status_code == 200
    # now login as that new user
    other_tok = login(uniq, pw)
    # The new user can't revoke an invite they didn't create
    r3 = requests.delete(f"{BASE}/api/family-invites/{inv['id']}", headers=H(other_tok), timeout=10)
    assert r3.status_code == 403, f"expected 403 got {r3.status_code} {r3.text}"
    # creator can revoke → 200
    r4 = requests.delete(f"{BASE}/api/family-invites/{inv['id']}", headers=H(tok_d), timeout=10)
    assert r4.status_code == 200
    # is_active must now be false
    r5 = requests.get(f"{BASE}/api/family-invites", headers=H(tok_d), timeout=10)
    found = next((i for i in r5.json()['invites'] if i['id'] == inv['id']), None)
    assert found is not None
    assert found['is_active'] is False
    assert found.get('effective_status') == 'revoked'
    # public token now 410
    r6 = requests.get(f"{BASE}/api/family-invites/token/{inv['token']}", timeout=10)
    assert r6.status_code == 410


# ---------------- Owner without compound (fallback regression) ----------------
def test_inviter_no_compound_400():
    """If user has no compound_id, creation must 400."""
    tok = login(*OWNER)
    user = me(tok)
    if user.get('compound_id'):
        pytest.skip(f"OWNER has compound_id={user['compound_id']}; cannot test 400 path here")
    r = requests.post(f"{BASE}/api/family-invites",
                      json={"relationship": "spouse"},
                      headers=H(tok), timeout=15)
    assert r.status_code == 400
