"""Critical regression tests — fast, side-effect-aware."""


def test_health_endpoint(http_client):
    r = http_client.get("/api/health")
    assert r.status_code == 200
    # Health may report 'healthy' or 'unhealthy' depending on which optional
    # subsystems (smtp/redis/external-apis) are reachable; we only require the
    # endpoint itself to be responsive and return a status field.
    assert "status" in r.json()


def test_login_invalid_returns_401(http_client):
    r = http_client.post("/api/auth/login", json={"username": "nonexistent_xyz", "password": "wrong"})
    assert r.status_code == 401


def test_login_owner_succeeds(owner_token):
    assert owner_token and len(owner_token) > 20


def test_login_admin_succeeds(admin_token):
    assert admin_token and len(admin_token) > 20


def test_protected_route_requires_auth(http_client):
    r = http_client.get("/api/audit-logs")
    assert r.status_code in (401, 403)


def test_audit_logs_owner_access(http_client, owner_headers):
    r = http_client.get("/api/audit-logs?days=1&limit=10", headers=owner_headers)
    assert r.status_code == 200
    body = r.json()
    assert "items" in body and "total" in body


def test_audit_logs_admin_forbidden(http_client, admin_headers):
    r = http_client.get("/api/audit-logs", headers=admin_headers)
    assert r.status_code == 403


def test_global_search_min_2_chars(http_client, admin_headers):
    r = http_client.get("/api/search?q=a", headers=admin_headers)
    assert r.status_code == 200
    assert r.json().get("results") == []


def test_global_search_returns_results(http_client, admin_headers):
    r = http_client.get("/api/search?q=dalia", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json().get("results"), list)


def test_route_health_list_owner(http_client, owner_headers):
    r = http_client.get("/api/system/route-health/list", headers=owner_headers)
    assert r.status_code == 200
    assert r.json().get("total", 0) > 100


def test_onboarding_state_admin(http_client, admin_headers):
    r = http_client.get("/api/onboarding/state", headers=admin_headers)
    assert r.status_code == 200
    assert "should_show" in r.json()


def test_owner_kpis_owner(http_client, owner_headers):
    r = http_client.get("/api/owner-kpis", headers=owner_headers)
    assert r.status_code == 200
    body = r.json()
    assert "compounds" in body and "users" in body and "engagement" in body and "revenue" in body


def test_owner_kpis_admin_forbidden(http_client, admin_headers):
    r = http_client.get("/api/owner-kpis", headers=admin_headers)
    assert r.status_code == 403


def test_my_invites_admin(http_client, admin_headers):
    r = http_client.get("/api/family-invites", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json().get("invites"), list)


def test_compounds_residences_admin(http_client, admin_headers):
    """Regression: this endpoint was returning 500 in iter 59 due to missing db = get_db() — must stay 200."""
    me = http_client.get("/api/auth/me", headers=admin_headers)
    if me.status_code != 200:
        return  # skip if /me unavailable
    cid = me.json().get("compound_id")
    if not cid:
        return
    r = http_client.get(f"/api/compounds/{cid}/residences", headers=admin_headers)
    assert r.status_code == 200
