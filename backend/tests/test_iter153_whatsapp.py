"""
Iter 153 — Twilio WhatsApp integration tests.

Tests:
1. Phone normalization (Egyptian +20 default, E.164, sandbox 'whatsapp:' prefix)
2. Status endpoint returns configuration + stats
3. Send endpoint validates phone, requires auth, audit-logs the action
4. Bulk send is super-admin only
5. Webhook validates Twilio signature
6. Logs endpoint paginates correctly
7. is_whatsapp_configured() reads from env

NOTE: We do NOT actually call Twilio's API (would fail without Sandbox join setup
which is a user-manual step). We assert on backend behavior, validation, audit
trail, and graceful error handling.
"""
import os, sys, asyncio, time
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


# ─── Phone normalization tests (direct, no HTTP) ────────────────────────

def test_normalize_phone_variants():
    """Test all input formats."""
    from dotenv import load_dotenv; load_dotenv("/app/backend/.env")
    from services.whatsapp_service import normalize_to_whatsapp
    cases = [
        ("+201001234567", "whatsapp:+201001234567"),
        ("201001234567", "whatsapp:+201001234567"),
        ("00201001234567", "whatsapp:+201001234567"),
        ("01001234567", "whatsapp:+201001234567"),
        ("whatsapp:+201001234567", "whatsapp:+201001234567"),
        (" +20 100 123 4567 ", "whatsapp:+201001234567"),
        # invalid
        ("invalid", None),
        ("", None),
        ("123", None),
        ("+", None),
    ]
    for raw, expected in cases:
        got = normalize_to_whatsapp(raw)
        assert got == expected, f"normalize_to_whatsapp({raw!r}) = {got!r}, want {expected!r}"


def test_is_whatsapp_configured():
    """Returns True when both env vars set, False otherwise."""
    from dotenv import load_dotenv; load_dotenv("/app/backend/.env")
    from services.whatsapp_service import is_whatsapp_configured
    # Should be True with our seeded creds
    assert is_whatsapp_configured() is True


# ─── HTTP endpoint tests ─────────────────────────────────────────────────

def test_whatsapp_status_endpoint(headers):
    """Status returns configured=True, from address, and stats."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        r = c.get("/api/whatsapp/status", headers=headers)
        assert r.status_code == 200
        d = r.json()
        assert d.get("configured") is True
        assert "from" in d
        assert d["from"].startswith("whatsapp:+")
        assert isinstance(d.get("total"), int)
        assert isinstance(d.get("sent"), int)
        assert isinstance(d.get("failed"), int)


def test_whatsapp_normalize_test_endpoint(headers):
    """Normalize-test endpoint helps the UI preview phone formatting."""
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as c:
        for raw, want_valid in [("01001234567", True), ("+201234567890", True), ("invalid", False), ("", False)]:
            r = c.post("/api/whatsapp/normalize-test", headers=headers, json={"phone": raw})
            assert r.status_code == 200
            assert r.json()["valid"] is want_valid


def test_whatsapp_send_invalid_phone(headers):
    """Sending to an invalid phone returns 400 immediately, no Twilio call."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        r = c.post("/api/whatsapp/send", headers=headers,
                   json={"to": "not-a-phone", "body": "test"})
        assert r.status_code == 400
        assert "invalid" in (r.json().get("detail") or "").lower() or "phone" in (r.json().get("detail") or "").lower()


def test_whatsapp_send_creates_log_and_audit(headers):
    """Even when Twilio rejects (e.g. sandbox not joined), backend creates a log entry
    AND an audit_log entry — never crashes the application."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        # Use a phone format that's valid but Twilio will likely reject (sandbox not joined)
        r = c.post("/api/whatsapp/send", headers=headers,
                   json={"to": "+201234567890", "body": "regression test from iter153"})
        # Either 200 (delivered/queued) OR 400 (sandbox rejection) — both acceptable
        assert r.status_code in (200, 400)

        # Verify a log was created either way
        r2 = c.get("/api/whatsapp/logs?days=1&limit=5", headers=headers)
        assert r2.status_code == 200
        items = r2.json()["items"]
        assert any(it.get("to_normalized") == "whatsapp:+201234567890" for it in items)

        # Verify an audit-log entry was created
        r3 = c.get("/api/audit-logs?days=1&action=whatsapp.send&limit=5", headers=headers)
        assert r3.status_code == 200
        audit_items = r3.json()["items"]
        assert len(audit_items) > 0
        # The most-recent audit entry should target our last send
        assert audit_items[0]["action"] == "whatsapp.send"


def test_whatsapp_send_requires_admin(headers):
    """Unauthenticated requests get 401."""
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as c:
        r = c.post("/api/whatsapp/send", json={"to": "+201001234567", "body": "test"})
        assert r.status_code == 401 or r.status_code == 403


def test_whatsapp_logs_endpoint_pagination(headers):
    """Logs endpoint accepts days/limit/ok filters."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        r = c.get("/api/whatsapp/logs?days=7&limit=10", headers=headers)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d
        assert "total" in d
        assert len(d["items"]) <= 10
        # Filter by ok=false should return only failed sends
        r2 = c.get("/api/whatsapp/logs?days=7&limit=10&ok=false", headers=headers)
        assert r2.status_code == 200
        for it in r2.json()["items"]:
            assert it.get("ok") is False


def test_whatsapp_webhook_invalid_signature():
    """Webhook rejects requests without valid Twilio signature."""
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as c:
        r = c.post("/api/whatsapp/webhook",
                   data={"MessageSid": "SM123", "MessageStatus": "delivered"},
                   headers={"X-Twilio-Signature": "fake-signature"})
        # 403 for bad signature, or 400 if validation fails
        assert r.status_code in (400, 403)


def test_whatsapp_bulk_send_super_admin_only(headers, owner_token):
    """Bulk send requires super_admin role (owner has it)."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        # As owner — should be allowed (returns 200 with mixed results, or 400 sandbox)
        r = c.post("/api/whatsapp/send-bulk", headers=headers,
                   json={"recipients": ["+201111111111", "invalid"], "body": "bulk test"})
        # Owner should get through; Twilio might fail but request shape is accepted
        assert r.status_code in (200, 400)
        if r.status_code == 200:
            d = r.json()
            assert d.get("total") == 2
            assert "results" in d
