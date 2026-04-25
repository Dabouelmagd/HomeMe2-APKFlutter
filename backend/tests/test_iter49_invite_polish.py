"""Iter49 — period_days filter + CSV export + invite-analytics + family invitee_name cosmetic fix."""
import os
import requests
import pytest
from pathlib import Path


def _load_url():
    u = os.environ.get("REACT_APP_BACKEND_URL")
    if u:
        return u.rstrip("/")
    p = Path("/app/frontend/.env")
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
def dalia_token():
    return _login("dalia", "Dalia1234@")


# ---------- /api/invite-stats period_days ----------
@pytest.mark.parametrize("p,expected", [("7", 7), ("30", 30), ("90", 90), ("all", None)])
def test_invite_stats_period_days(owner_token, p, expected):
    r = requests.get(f"{API}/invite-stats", params={"period_days": p},
                     headers={"Authorization": f"Bearer {owner_token}"}, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["period_days"] == expected
    assert "compound" in d and "family" in d
    for blk in (d["compound"], d["family"]):
        for k in ("total", "active", "used_up", "expired", "revoked", "total_acceptances"):
            assert k in blk and isinstance(blk[k], int)


def test_invite_stats_period_days_invalid(owner_token):
    r = requests.get(f"{API}/invite-stats", params={"period_days": "abc"},
                     headers={"Authorization": f"Bearer {owner_token}"}, timeout=20)
    assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text}"


# ---------- /api/invite-stats/export.csv ----------
def test_export_csv_no_auth():
    r = requests.get(f"{API}/invite-stats/export.csv", timeout=15)
    assert r.status_code in (401, 403)


def test_export_csv_owner(owner_token):
    r = requests.get(f"{API}/invite-stats/export.csv",
                     headers={"Authorization": f"Bearer {owner_token}"}, timeout=20)
    assert r.status_code == 200, r.text
    ctype = r.headers.get("content-type", "")
    assert "text/csv" in ctype and "utf-8" in ctype.lower(), f"bad content-type: {ctype}"
    cd = r.headers.get("content-disposition", "")
    assert "attachment" in cd.lower() and ".csv" in cd.lower(), f"bad CD: {cd}"
    body = r.content.decode("utf-8")
    assert body.startswith("\ufeff"), "missing BOM"
    first_line = body.splitlines()[0].lstrip("\ufeff")
    expected_headers = "kind,id,role_or_relationship,compound_id,company_id,max_uses,used_count,is_active,status,created_at,expires_at,created_by_username,note,invitee_name_hint"
    assert first_line == expected_headers, f"unexpected headers: {first_line}"


# ---------- /api/invite-analytics ----------
def test_invite_analytics_owner(owner_token):
    r = requests.get(f"{API}/invite-analytics", params={"period_days": "30"},
                     headers={"Authorization": f"Bearer {owner_token}"}, timeout=25)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("period_days", "scope", "daily_acceptances", "top_compounds",
             "top_roles", "slowest_roles", "total_acceptances"):
        assert k in d, f"missing {k}"
    assert d["period_days"] == 30
    # daily_acceptances should have period_days+1 buckets (inclusive both ends)
    assert len(d["daily_acceptances"]) == 31, f"got {len(d['daily_acceptances'])} buckets"
    assert isinstance(d["top_compounds"], list)
    assert isinstance(d["top_roles"], list)
    assert isinstance(d["slowest_roles"], list)


def test_invite_analytics_period_7(owner_token):
    r = requests.get(f"{API}/invite-analytics", params={"period_days": "7"},
                     headers={"Authorization": f"Bearer {owner_token}"}, timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert d["period_days"] == 7
    assert len(d["daily_acceptances"]) == 8


def test_invite_analytics_resident_forbidden():
    """A regular resident (not app_owner/super_admin/company_admin) → 403."""
    # dalia is compound_admin (admin role) — still gated to 403 per code
    tok = _login("dalia", "Dalia1234@")
    r = requests.get(f"{API}/invite-analytics",
                     headers={"Authorization": f"Bearer {tok}"}, timeout=20)
    assert r.status_code == 403, f"expected 403 for compound admin (admin role), got {r.status_code} {r.text}"


# ---------- Family invitee_name cosmetic fix ----------
def test_family_invite_invitee_name_round_trip(dalia_token):
    h = {"Authorization": f"Bearer {dalia_token}"}
    payload = {"relationship": "spouse", "validity_days": 7, "max_uses": 1,
               "invitee_name": "TEST_iter49_dalia_wife"}
    cr = requests.post(f"{API}/family-invites", json=payload, headers=h, timeout=20)
    assert cr.status_code in (200, 201), cr.text
    inv = cr.json().get("invite", {})
    inv_id = inv.get("id")
    assert inv_id

    lr = requests.get(f"{API}/family-invites", headers=h, timeout=20)
    assert lr.status_code == 200
    items = lr.json().get("invites", [])
    found = next((i for i in items if i.get("id") == inv_id), None)
    assert found, "created invite not in list"
    assert found.get("invitee_name_hint") == "TEST_iter49_dalia_wife", \
        f"hint mismatch: {found.get('invitee_name_hint')!r}"

    # cleanup
    requests.delete(f"{API}/family-invites/{inv_id}", headers=h, timeout=15)


def test_family_invite_invitee_name_hint_key(dalia_token):
    """Backend should also accept the payload key 'invitee_name_hint'."""
    h = {"Authorization": f"Bearer {dalia_token}"}
    payload = {"relationship": "child", "validity_days": 7, "max_uses": 1,
               "invitee_name_hint": "TEST_iter49_hint_key"}
    cr = requests.post(f"{API}/family-invites", json=payload, headers=h, timeout=20)
    assert cr.status_code in (200, 201), cr.text
    inv = cr.json().get("invite", {})
    inv_id = inv.get("id")
    assert inv_id

    lr = requests.get(f"{API}/family-invites", headers=h, timeout=20)
    items = lr.json().get("invites", [])
    found = next((i for i in items if i.get("id") == inv_id), None)
    assert found and found.get("invitee_name_hint") == "TEST_iter49_hint_key"

    requests.delete(f"{API}/family-invites/{inv_id}", headers=h, timeout=15)
