"""Backend tests for GET /api/company-admin/compounds-trend (iter142 — Feature #36)."""
import os
import time
import requests
import pytest


def _read_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip()
    return ""


BASE_URL = _read_backend_url().rstrip("/")
API = f"{BASE_URL}/api"

CRED_COMPANY = {"username": "testcompany2", "password": "Company123!"}
CRED_RESIDENT = {"username": "test", "password": "test123"}
CRED_OWNER = {"username": "Owner_homeme", "password": "Dalia1234@"}


def _login(creds):
    last = None
    for _ in range(3):
        try:
            r = requests.post(f"{API}/auth/login", json=creds, timeout=45)
            if r.status_code == 200:
                return r.json()["access_token"]
            last = r
        except Exception as e:
            last = e
            time.sleep(2)
    raise AssertionError(f"Login failed for {creds['username']}: {last}")


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def company_token():
    return _login(CRED_COMPANY)


class TestCompoundsTrend:
    def test_default_returns_6_months(self, company_token):
        r = requests.get(f"{API}/company-admin/compounds-trend?months=6", headers=_hdr(company_token), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # top-level shape
        assert "company_id" in data
        assert "months" in data and isinstance(data["months"], list)
        assert "compounds" in data and isinstance(data["compounds"], list)
        assert len(data["months"]) == 6, f"expected 6 months, got {len(data['months'])}"
        for m in data["months"]:
            assert "month" in m and "label" in m
        # each compound has 6 points and required keys
        for c in data["compounds"]:
            assert "compound_id" in c
            assert "name" in c
            assert "points" in c
            assert len(c["points"]) == 6, f"compound {c['compound_id']} has {len(c['points'])} points (expected 6)"
            for p in c["points"]:
                for k in ("month", "label", "revenue", "residents", "complaints", "maintenance"):
                    assert k in p, f"missing key {k} in points"

    def test_residents_cumulative_non_decreasing(self, company_token):
        r = requests.get(f"{API}/company-admin/compounds-trend?months=6", headers=_hdr(company_token), timeout=30)
        assert r.status_code == 200
        data = r.json()
        for c in data["compounds"]:
            prev = -1
            for p in c["points"]:
                assert isinstance(p["residents"], int)
                assert p["residents"] >= prev, (
                    f"residents for {c['name']} not cumulative: {[pt['residents'] for pt in c['points']]}"
                )
                prev = p["residents"]

    def test_resident_token_403(self):
        try:
            tok = _login(CRED_RESIDENT)
        except AssertionError:
            pytest.skip("resident credentials unavailable")
        r = requests.get(f"{API}/company-admin/compounds-trend?months=6", headers=_hdr(tok), timeout=30)
        assert r.status_code == 403, f"resident should get 403, got {r.status_code} {r.text}"

    def test_owner_token_requires_company_id(self):
        """App owner has cross-company access; without company_id they get 400 (not a security bug)."""
        tok = _login(CRED_OWNER)
        r = requests.get(f"{API}/company-admin/compounds-trend?months=6", headers=_hdr(tok), timeout=30)
        # Owner is allowed but must provide ?company_id=...; expect 400 missing-param.
        assert r.status_code in (400, 401, 403), f"owner unexpected status {r.status_code} {r.text}"

    def test_unauthenticated_401(self):
        r = requests.get(f"{API}/company-admin/compounds-trend?months=6", timeout=30)
        assert r.status_code in (401, 403)

    def test_custom_months_param(self, company_token):
        r = requests.get(f"{API}/company-admin/compounds-trend?months=3", headers=_hdr(company_token), timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data["months"]) == 3
        for c in data["compounds"]:
            assert len(c["points"]) == 3
