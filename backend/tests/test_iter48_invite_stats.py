"""Iter48 — Invite Stats (GET /api/invite-stats) + smoke regression for compound/family invites."""
import os
import requests
import pytest
from pathlib import Path

# Load REACT_APP_BACKEND_URL from frontend .env if not in env
def _load_url():
    u = os.environ.get("REACT_APP_BACKEND_URL")
    if u:
        return u.rstrip("/")
    p = Path("/app/frontend/.env")
    if p.exists():
        for line in p.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

BASE_URL = _load_url()
API = f"{BASE_URL}/api"


def _login(username, password):
    r = requests.post(f"{API}/auth/login", json={"username": username, "password": password}, timeout=20)
    assert r.status_code == 200, f"login failed for {username}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def owner_token():
    return _login("Owner_homeme", "Dalia1234@")


@pytest.fixture(scope="module")
def super_token():
    return _login("superadmin", "SuperAdmin2024!")


@pytest.fixture(scope="module")
def dalia_token():
    return _login("dalia", "Dalia1234@")


# ---- Auth-gate ----
def test_invite_stats_no_auth():
    r = requests.get(f"{API}/invite-stats", timeout=15)
    assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"


# ---- Owner scope ----
def test_invite_stats_owner_scope_all(owner_token):
    r = requests.get(f"{API}/invite-stats", headers={"Authorization": f"Bearer {owner_token}"}, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["scope"] == "all"
    assert "compound" in d and "family" in d
    for blk in (d["compound"], d["family"]):
        for k in ("total", "active", "used_up", "expired", "revoked", "total_acceptances"):
            assert k in blk, f"missing key {k}"
            assert isinstance(blk[k], int)
    assert isinstance(d["conversion_rate"], (int, float))
    assert 0.0 <= d["conversion_rate"] <= 1.0


def test_invite_stats_super_scope_all(super_token):
    r = requests.get(f"{API}/invite-stats", headers={"Authorization": f"Bearer {super_token}"}, timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert d["scope"] == "all"


# ---- Compound admin scope (dalia) ----
def test_invite_stats_compound_admin_scope(dalia_token):
    r = requests.get(f"{API}/invite-stats", headers={"Authorization": f"Bearer {dalia_token}"}, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["scope"] == "compound"
    assert d["compound"]["total"] >= 0
    assert d["family"]["total"] >= 0


# ---- Compound invites smoke regression ----
def test_compound_invites_no_auth():
    r = requests.get(f"{API}/compound-invites", timeout=15)
    assert r.status_code in (401, 403)


def test_compound_invite_create_and_list(dalia_token, owner_token):
    h = {"Authorization": f"Bearer {dalia_token}"}
    payload = {"role": "resident", "validity_days": 7, "max_uses": 1,
               "compound_id": "88ad3711-c9ae-45fe-a270-65f4524c071c", "notes": "TEST_iter48_smoke"}
    cr = requests.post(f"{API}/compound-invites", json=payload, headers=h, timeout=20)
    assert cr.status_code in (200, 201), cr.text
    body = cr.json()
    inv = body.get("invite", body)
    inv_id = inv.get("id") or inv.get("_id")
    assert inv_id
    assert "token" in inv or "join_url" in inv

    # List as owner (compound-invites listing is admin-restricted)
    oh = {"Authorization": f"Bearer {owner_token}"}
    lr = requests.get(f"{API}/compound-invites", headers=oh, timeout=20)
    assert lr.status_code == 200, lr.text
    items = lr.json() if isinstance(lr.json(), list) else lr.json().get("invites", [])
    ids = [i.get("id") for i in items]
    assert inv_id in ids

    # cleanup
    requests.delete(f"{API}/compound-invites/{inv_id}", headers=h, timeout=15)


# ---- Family invites smoke regression ----
def test_family_invites_no_auth():
    r = requests.get(f"{API}/family-invites", timeout=15)
    assert r.status_code in (401, 403)


def test_family_invite_create_and_list(dalia_token):
    h = {"Authorization": f"Bearer {dalia_token}"}
    payload = {"relationship": "spouse", "validity_days": 7, "max_uses": 1, "invitee_name": "TEST_iter48_smoke"}
    cr = requests.post(f"{API}/family-invites", json=payload, headers=h, timeout=20)
    assert cr.status_code in (200, 201), cr.text
    body = cr.json()
    inv = body.get("invite", body)
    inv_id = inv.get("id") or inv.get("_id")
    assert inv_id

    lr = requests.get(f"{API}/family-invites", headers=h, timeout=20)
    assert lr.status_code == 200
    items = lr.json() if isinstance(lr.json(), list) else lr.json().get("invites", [])
    ids = [i.get("id") for i in items]
    assert inv_id in ids

    # check stats reflect the new invite
    sr = requests.get(f"{API}/invite-stats", headers=h, timeout=15)
    assert sr.status_code == 200
    assert sr.json()["family"]["total"] >= 1

    # cleanup
    requests.delete(f"{API}/family-invites/{inv_id}", headers=h, timeout=15)
