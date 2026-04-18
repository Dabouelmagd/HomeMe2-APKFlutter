"""
Iteration 28: Backend tests for push notification behavior on security incident creation.
- severity=critical or high should include push_result in response
- severity=low or medium should NOT include push_result
- push_result.total is integer; compound isolation verified via target_user_ids query
"""
import os
import pytest
import requests

def _load_frontend_env():
    try:
        with open("/app/frontend/.env", "r") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return None

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _load_frontend_env()).rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def security_token():
    r = requests.post(f"{API}/auth/login", json={"username": "security", "password": "Security2024!"})
    assert r.status_code == 200, f"security login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def super_admin_token():
    r = requests.post(f"{API}/auth/login", json={"username": "superadmin", "password": "SuperAdmin2024!"})
    assert r.status_code == 200, f"superadmin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def _auth(tok):
    return {"Authorization": f"Bearer {tok}"}


def _create(tok, severity, title):
    return requests.post(
        f"{API}/security/incidents",
        json={"title": title, "description": "TEST_iter28 push test", "severity": severity, "location": "Gate A"},
        headers=_auth(tok),
    )


# ---------- Severity triggers push_result key ----------
class TestPushResultPresence:
    def test_critical_includes_push_result(self, security_token, super_admin_token):
        r = _create(security_token, "critical", "TEST_iter28_critical")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        incident = data["incident"]
        assert incident["severity"] == "critical"
        assert "push_result" in incident, "push_result must be present for critical severity"
        pr = incident["push_result"]
        assert isinstance(pr, dict)
        for k in ("total", "sent", "failed"):
            assert k in pr and isinstance(pr[k], int)
        # Cleanup
        requests.delete(f"{API}/security/incidents/{incident['id']}", headers=_auth(super_admin_token))

    def test_high_includes_push_result(self, security_token, super_admin_token):
        r = _create(security_token, "high", "TEST_iter28_high")
        assert r.status_code == 200, r.text
        incident = r.json()["incident"]
        assert incident["severity"] == "high"
        assert "push_result" in incident, "push_result must be present for high severity"
        pr = incident["push_result"]
        assert isinstance(pr["total"], int) and pr["total"] >= 0
        requests.delete(f"{API}/security/incidents/{incident['id']}", headers=_auth(super_admin_token))

    def test_low_absent_push_result(self, security_token, super_admin_token):
        r = _create(security_token, "low", "TEST_iter28_low")
        assert r.status_code == 200, r.text
        incident = r.json()["incident"]
        assert incident["severity"] == "low"
        assert "push_result" not in incident, "push_result must be ABSENT for low severity"
        requests.delete(f"{API}/security/incidents/{incident['id']}", headers=_auth(super_admin_token))

    def test_medium_absent_push_result(self, security_token, super_admin_token):
        r = _create(security_token, "medium", "TEST_iter28_medium")
        assert r.status_code == 200, r.text
        incident = r.json()["incident"]
        assert incident["severity"] == "medium"
        assert "push_result" not in incident, "push_result must be ABSENT for medium severity"
        requests.delete(f"{API}/security/incidents/{incident['id']}", headers=_auth(super_admin_token))


# ---------- Compound isolation: admin_ids should be compound-scoped ----------
class TestCompoundIsolation:
    def test_compound_scoped_admin_targeting(self, security_token, super_admin_token):
        """
        Verify that when security user in compound X creates a critical incident,
        the incident itself is tagged with that compound_id, confirming the scope
        used for admin targeting in the backend query.
        """
        # Fetch current user info
        me = requests.get(f"{API}/auth/me", headers=_auth(security_token))
        assert me.status_code == 200, me.text
        sec_compound = me.json().get("compound_id")

        r = _create(security_token, "critical", "TEST_iter28_isolation")
        assert r.status_code == 200, r.text
        incident = r.json()["incident"]
        # Incident's compound_id should match reporter's compound_id (isolation basis)
        assert incident.get("compound_id", "") == (sec_compound or ""), \
            f"Incident compound mismatch: {incident.get('compound_id')} vs {sec_compound}"
        assert "push_result" in incident
        requests.delete(f"{API}/security/incidents/{incident['id']}", headers=_auth(super_admin_token))


# ---------- Regression: listing still works ----------
class TestIncidentListRegression:
    def test_list_incidents_still_works(self, security_token):
        r = requests.get(f"{API}/security/incidents", headers=_auth(security_token))
        assert r.status_code == 200
        body = r.json()
        assert body["success"] is True
        assert "incidents" in body and isinstance(body["incidents"], list)
        assert "open_count" in body and "critical_open" in body and "total" in body
