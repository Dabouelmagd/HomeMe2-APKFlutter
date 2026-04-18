"""Iteration 27: Security Analytics + Incidents CRUD tests"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://profile-nav-debug.preview.emergentagent.com").rstrip("/")

SEC_CREDS = {"username": "security", "password": "Security2024!"}
SUPER_CREDS = {"username": "superadmin", "password": "SuperAdmin2024!"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module")
def sec_headers():
    tok = _login(SEC_CREDS)
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def super_headers():
    tok = _login(SUPER_CREDS)
    return {"Authorization": f"Bearer {tok}"}


# ---- Security Analytics ----
class TestSecurityAnalytics:
    def test_analytics_default_7_days(self, sec_headers):
        r = requests.get(f"{BASE_URL}/api/security/analytics?days=7", headers=sec_headers, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert data.get("range_days") == 7
        assert isinstance(data.get("trend"), list) and len(data["trend"]) == 7
        assert isinstance(data.get("hourly"), list) and len(data["hourly"]) == 24
        assert isinstance(data.get("peak_hours"), list) and len(data["peak_hours"]) == 3
        assert "total_visits" in data
        assert "id_verified_ratio" in data
        # trend entries shape
        for d in data["trend"]:
            assert "date" in d and "total" in d

    def test_analytics_clamps_days(self, sec_headers):
        r = requests.get(f"{BASE_URL}/api/security/analytics?days=500", headers=sec_headers, timeout=20)
        assert r.status_code == 200
        assert r.json().get("range_days") == 30

    def test_analytics_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/security/analytics", timeout=15)
        assert r.status_code in (401, 403)


# ---- Incidents CRUD ----
class TestIncidents:
    created_id = None

    def test_create_incident_low_valid(self, sec_headers):
        payload = {
            "title": "TEST_incident_iter27",
            "description": "Test description for iter27",
            "severity": "high",
            "location": "Gate 1",
        }
        r = requests.post(f"{BASE_URL}/api/security/incidents", json=payload, headers=sec_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        inc = data.get("incident")
        assert inc and inc.get("id")
        assert inc.get("title") == payload["title"]
        assert inc.get("severity") == "high"
        assert inc.get("status") == "open"
        TestIncidents.created_id = inc["id"]

    def test_create_incident_invalid_severity(self, sec_headers):
        payload = {"title": "bad", "description": "bad", "severity": "nuclear"}
        r = requests.post(f"{BASE_URL}/api/security/incidents", json=payload, headers=sec_headers, timeout=15)
        assert r.status_code == 400, r.text

    def test_list_incidents(self, sec_headers):
        r = requests.get(f"{BASE_URL}/api/security/incidents", headers=sec_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert isinstance(data.get("incidents"), list)
        assert "open_count" in data and "critical_open" in data and "total" in data
        # our created one should be present
        ids = [i.get("id") for i in data["incidents"]]
        assert TestIncidents.created_id in ids

    def test_patch_incident_in_progress(self, sec_headers):
        assert TestIncidents.created_id
        r = requests.patch(
            f"{BASE_URL}/api/security/incidents/{TestIncidents.created_id}?status=in_progress",
            headers=sec_headers, timeout=15,
        )
        assert r.status_code == 200, r.text
        # verify via list
        r2 = requests.get(f"{BASE_URL}/api/security/incidents", headers=sec_headers, timeout=15)
        items = {i["id"]: i for i in r2.json()["incidents"]}
        assert items[TestIncidents.created_id]["status"] == "in_progress"

    def test_patch_incident_resolved_sets_resolved_at(self, sec_headers):
        assert TestIncidents.created_id
        r = requests.patch(
            f"{BASE_URL}/api/security/incidents/{TestIncidents.created_id}?status=resolved&resolution_notes=done",
            headers=sec_headers, timeout=15,
        )
        assert r.status_code == 200, r.text
        r2 = requests.get(f"{BASE_URL}/api/security/incidents", headers=sec_headers, timeout=15)
        item = {i["id"]: i for i in r2.json()["incidents"]}[TestIncidents.created_id]
        assert item["status"] == "resolved"
        assert item.get("resolved_at")
        assert item.get("resolution_notes") == "done"

    def test_patch_invalid_status(self, sec_headers):
        assert TestIncidents.created_id
        r = requests.patch(
            f"{BASE_URL}/api/security/incidents/{TestIncidents.created_id}?status=exploded",
            headers=sec_headers, timeout=15,
        )
        assert r.status_code == 400

    def test_delete_incident_requires_admin(self, sec_headers):
        # delete endpoint requires admin; security user should be forbidden
        assert TestIncidents.created_id
        r = requests.delete(
            f"{BASE_URL}/api/security/incidents/{TestIncidents.created_id}",
            headers=sec_headers, timeout=15,
        )
        # expected 401/403
        assert r.status_code in (401, 403), f"security user deletion should not be allowed, got {r.status_code}"

    def test_delete_incident_as_admin(self, super_headers):
        assert TestIncidents.created_id
        r = requests.delete(
            f"{BASE_URL}/api/security/incidents/{TestIncidents.created_id}",
            headers=super_headers, timeout=15,
        )
        assert r.status_code == 200, r.text
        # Verify removed
        r2 = requests.get(f"{BASE_URL}/api/security/incidents", headers=super_headers, timeout=15)
        ids = [i["id"] for i in r2.json().get("incidents", [])]
        assert TestIncidents.created_id not in ids

    def test_delete_nonexistent_returns_404(self, super_headers):
        r = requests.delete(
            f"{BASE_URL}/api/security/incidents/does-not-exist-uuid",
            headers=super_headers, timeout=15,
        )
        assert r.status_code == 404


# ---- Visitor logs (used by CSV export) ----
class TestVisitorLogs:
    def test_visitor_logs_endpoint(self, sec_headers):
        r = requests.get(f"{BASE_URL}/api/security/visitor-logs", headers=sec_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert isinstance(data.get("logs"), list)
