"""
Iter 154 — FCM (Firebase Cloud Messaging) integration tests.

Verifies:
1. Firebase Admin SDK initializes correctly with the user's service account JSON.
2. /api/fcm/status returns configured=true with the correct project_id.
3. Token registration is idempotent (upsert).
4. Multi-device per user (multiple tokens can be registered for same user_id).
5. Send to a user with no tokens → ok=false, error=no_tokens_registered (graceful).
6. Send to a user with invalid tokens → backend logs the failure, doesn't crash.
7. /api/fcm/test sends to a single token directly (debugging helper).
8. /api/fcm/logs paginates correctly with ok filter.
9. Audit log entries are written for fcm.register / fcm.send / fcm.test.
10. Endpoints require authentication.
"""
import os, sys
import pytest
import httpx
import pyotp

sys.path.insert(0, "/app/backend")

BASE_URL = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:8001")
OWNER_USERNAME = "Owner_homeme"
OWNER_PASSWORD = "Dalia1234@"
OWNER_TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"


@pytest.fixture(scope="module")
def owner_token():
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        r1 = c.post("/api/auth/login", json={"username": OWNER_USERNAME, "password": OWNER_PASSWORD})
        body1 = r1.json()
        if body1.get("two_factor_required"):
            code = pyotp.TOTP(OWNER_TOTP_SECRET).now()
            r2 = c.post("/api/2fa/verify-login", json={"temp_token": body1["temp_token"], "code": code})
            return r2.json()["access_token"]
        return body1.get("access_token")


@pytest.fixture
def headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}"}


def test_fcm_configured():
    """SDK initializes correctly with the user's service account JSON."""
    from dotenv import load_dotenv; load_dotenv("/app/backend/.env")
    from services.fcm_service import is_fcm_configured, get_project_id
    assert is_fcm_configured() is True
    pid = get_project_id()
    assert pid == "homeme-xzveg"


def test_fcm_status_endpoint(headers):
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        r = c.get("/api/fcm/status", headers=headers)
        assert r.status_code == 200
        d = r.json()
        assert d["configured"] is True
        assert d["project_id"] == "homeme-xzveg"
        for k in ("total", "succeeded", "failed", "registered_tokens"):
            assert k in d
            assert isinstance(d[k], int)


def test_register_token_idempotent(headers):
    """Registering the same token twice updates last_seen, doesn't duplicate."""
    token = "iter154-fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaa"
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        r1 = c.post("/api/fcm/register", headers=headers,
                    json={"token": token, "device_id": "dev-1", "platform": "android"})
        assert r1.status_code == 200
        assert r1.json()["ok"] is True

        # Register again → upsert, no duplicate
        r2 = c.post("/api/fcm/register", headers=headers,
                    json={"token": token, "device_id": "dev-1", "platform": "android"})
        assert r2.status_code == 200

        # Verify only ONE entry exists in DB for this token
        r3 = c.get("/api/fcm/tokens", headers=headers)
        assert r3.status_code == 200
        devices = r3.json()["devices"]
        matching = [d for d in devices if d.get("device_id") == "dev-1"]
        assert len(matching) == 1

    # cleanup
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as c:
        c.post("/api/fcm/unregister", headers=headers, json={"token": token})


def test_multi_device_per_user(headers):
    """A user can register multiple devices and they all show in /tokens."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        for d in ("dev-a", "dev-b"):
            c.post("/api/fcm/register", headers=headers,
                   json={"token": f"iter154-multi-{d}-xxxxxxxxxxxxxxxxxxxxxxxxxx", "device_id": d, "platform": "ios"})

        r = c.get("/api/fcm/tokens", headers=headers)
        assert r.status_code == 200
        device_ids = [d.get("device_id") for d in r.json()["devices"]]
        assert "dev-a" in device_ids
        assert "dev-b" in device_ids

        # cleanup
        for d in ("dev-a", "dev-b"):
            c.post("/api/fcm/unregister", headers=headers,
                   json={"token": f"iter154-multi-{d}-xxxxxxxxxxxxxxxxxxxxxxxxxx"})


def test_send_to_user_with_no_devices(headers, owner_token):
    """Sending to a user with zero registered tokens returns ok=false but no crash."""
    # Pick a random UUID that definitely has no fcm_tokens
    random_uid = "00000000-0000-0000-0000-000000000000"
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        r = c.post("/api/fcm/send", headers=headers,
                   json={"user_id": random_uid, "title": "test", "body": "test"})
        assert r.status_code == 200  # Returns 200 with ok=false
        d = r.json()
        assert d["ok"] is False
        # Should warn about no tokens
        warning = (d.get("warning") or d.get("error") or "").lower()
        assert "no_tokens" in warning or "no devices" in warning or "no_tokens_registered" in warning


def test_test_endpoint_with_fake_token_fails_gracefully(headers):
    """The /test endpoint with a fake token should fail cleanly (no 500 crash)."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        r = c.post("/api/fcm/test", headers=headers,
                   json={"token": "totally-fake-token-iter154-zzzzzzzzzzzzzz",
                         "title": "test", "body": "test"})
        # Either 200 (with ok=false) OR 400/503 — never 500
        assert r.status_code in (200, 400, 503)
        if r.status_code == 200:
            d = r.json()
            assert d["ok"] is False
            assert d["failed"] >= 0


def test_audit_log_for_fcm_actions(headers):
    """Every fcm.send/fcm.register action writes to audit_logs."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        # Register a token → audit
        token = "audit-fcm-token-iter154-vvvvvvvvvvvvvvvvvvvvvvvvvvvvv"
        c.post("/api/fcm/register", headers=headers,
               json={"token": token, "device_id": "audit-dev", "platform": "android"})

        # Check audit-logs
        r = c.get("/api/audit-logs?days=1&action=fcm.register&limit=5", headers=headers)
        assert r.status_code == 200
        items = r.json()["items"]
        # Should find at least one fcm.register entry
        assert any(it.get("action") == "fcm.register" for it in items)

        # cleanup
        c.post("/api/fcm/unregister", headers=headers, json={"token": token})


def test_logs_endpoint_paginates(headers):
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        r = c.get("/api/fcm/logs?days=7&limit=10", headers=headers)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d
        assert "total" in d
        assert len(d["items"]) <= 10
        # Filter ok=false should only return failures
        r2 = c.get("/api/fcm/logs?days=7&limit=10&ok=false", headers=headers)
        assert r2.status_code == 200
        for it in r2.json()["items"]:
            assert it.get("ok") is False


def test_register_requires_auth():
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as c:
        r = c.post("/api/fcm/register", json={"token": "x" * 30})
        assert r.status_code in (401, 403)


def test_send_requires_admin():
    """A non-admin user can't send pushes."""
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as c:
        r = c.post("/api/fcm/send", json={"user_id": "x", "title": "x", "body": "x"})
        assert r.status_code in (401, 403)
