"""
Iter 156 — Testimonials moderation badge in sidebar.

Verifies:
- GET /api/sidebar/badges as app_owner returns `testimonials_pending` integer field
- `total` includes testimonials_pending
- Submitting a new testimonial increases the count by 1
- Moderating (publishing) decreases the count by 1
- /api/testimonials/published only returns published (not pending/rejected)
- Non-owner admin (company_admin) gets testimonials_pending=0
- Regression: existing badge fields unchanged

Cleanup: deletes any TEST_ prefixed testimonials at the end.
"""
import os
import sys
import time
import pytest
import httpx
import pyotp

sys.path.insert(0, "/app/backend")

BASE_URL = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:8001")
OWNER_USERNAME = "Owner_homeme"
OWNER_PASSWORD = "Dalia1234@"
OWNER_TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"

COMPANY_USERNAME = "testcompany2"
COMPANY_PASSWORD = "Company123!"


def _login_owner_2fa(c: httpx.Client) -> str:
    r1 = c.post("/api/auth/login", json={"username": OWNER_USERNAME, "password": OWNER_PASSWORD})
    assert r1.status_code == 200, r1.text
    body = r1.json()
    if body.get("two_factor_required"):
        code = pyotp.TOTP(OWNER_TOTP_SECRET).now()
        r2 = c.post("/api/2fa/verify-login", json={"temp_token": body["temp_token"], "code": code})
        assert r2.status_code == 200, r2.text
        return r2.json()["access_token"]
    if body.get("two_factor_setup_required"):
        st = body["setup_token"]
        r2 = c.post("/api/2fa/setup-enroll", json={"setup_token": st})
        assert r2.status_code == 200
        secret = r2.json()["secret"]
        code = pyotp.TOTP(secret).now()
        r3 = c.post("/api/2fa/verify-enroll", json={"setup_token": st, "token_code": code})
        assert r3.status_code == 200
        return r3.json()["access_token"]
    # plain login
    return body.get("token") or body.get("access_token")


@pytest.fixture(scope="module")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        yield c


@pytest.fixture(scope="module")
def owner_headers(client):
    tok = _login_owner_2fa(client)
    assert tok
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def company_headers(client):
    r = client.post("/api/auth/login", json={"username": COMPANY_USERNAME, "password": COMPANY_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"company_admin login failed: {r.status_code} {r.text}")
    body = r.json()
    # If company_admin also has 2FA, skip — not our concern here
    if body.get("two_factor_required") or body.get("two_factor_setup_required"):
        pytest.skip("company_admin requires 2FA; skipping non-owner badge isolation test")
    tok = body.get("token") or body.get("access_token")
    if not tok:
        pytest.skip("no token returned for company_admin")
    return {"Authorization": f"Bearer {tok}"}


# --- Tests -----------------------------------------------------------------

def test_owner_badges_includes_testimonials_pending(client, owner_headers):
    r = client.get("/api/sidebar/badges", headers=owner_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "testimonials_pending" in data, f"missing testimonials_pending in {data}"
    assert isinstance(data["testimonials_pending"], int)
    # Regression: legacy fields preserved
    for k in ("messages_unread", "payment_proofs_pending", "negative_ratings_7d", "total"):
        assert k in data, f"regression: missing legacy field {k}"
    # total includes testimonials_pending
    expected = (
        data["messages_unread"]
        + data["payment_proofs_pending"]
        + data["negative_ratings_7d"]
        + data["testimonials_pending"]
    )
    assert data["total"] == expected, f"total mismatch: {data['total']} != {expected}"


def test_submit_testimonial_increments_badge(client, owner_headers):
    # Baseline
    base = client.get("/api/sidebar/badges", headers=owner_headers).json()["testimonials_pending"]

    # Public submit (no auth)
    payload = {
        "name": "TEST_Iter156 Reviewer",
        "role": "ساكن",
        "stars": 5,
        "comment": "TEST_iter156 — هذه شهادة اختبار للتحقق من البادج (auto-generated).",
    }
    r = client.post("/api/testimonials/submit", json=payload)
    assert r.status_code == 200, r.text
    tid = r.json()["testimonial_id"]
    assert tid

    # Verify count went up by exactly 1
    new_val = client.get("/api/sidebar/badges", headers=owner_headers).json()["testimonials_pending"]
    assert new_val == base + 1, f"expected {base + 1}, got {new_val}"

    # Stash id on the module for the next test
    pytest.iter156_pending_id = tid


def test_publish_testimonial_decrements_badge(client, owner_headers):
    tid = getattr(pytest, "iter156_pending_id", None)
    if not tid:
        pytest.skip("no testimonial id from previous test")
    base = client.get("/api/sidebar/badges", headers=owner_headers).json()["testimonials_pending"]

    r = client.put(
        f"/api/owner/testimonials/{tid}",
        headers=owner_headers,
        json={"status": "published"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "published"

    new_val = client.get("/api/sidebar/badges", headers=owner_headers).json()["testimonials_pending"]
    assert new_val == base - 1, f"expected {base - 1}, got {new_val}"

    # Verify it now shows in the public carousel
    pub = client.get("/api/testimonials/published?limit=50").json()["testimonials"]
    ids = [t["id"] for t in pub]
    assert tid in ids, f"published testimonial {tid} missing from /testimonials/published"


def test_published_endpoint_only_returns_published(client, owner_headers):
    # Create a pending and a rejected; verify neither appears in /published.
    p1 = client.post("/api/testimonials/submit", json={
        "name": "TEST_Iter156 Pending Only",
        "role": "ساكن",
        "stars": 4,
        "comment": "TEST_iter156 — pending must NOT appear in published list.",
    }).json()["testimonial_id"]

    p2 = client.post("/api/testimonials/submit", json={
        "name": "TEST_Iter156 To Reject",
        "role": "ساكن",
        "stars": 3,
        "comment": "TEST_iter156 — will be rejected; must NOT appear in published.",
    }).json()["testimonial_id"]

    rj = client.put(f"/api/owner/testimonials/{p2}", headers=owner_headers,
                    json={"status": "rejected", "admin_note": "TEST_iter156 reject"})
    assert rj.status_code == 200

    pub = client.get("/api/testimonials/published?limit=50").json()["testimonials"]
    ids = [t["id"] for t in pub]
    assert p1 not in ids, "pending testimonial leaked into /published"
    assert p2 not in ids, "rejected testimonial leaked into /published"
    for t in pub:
        # Defensive: any leaked status would fail here
        assert t.get("status", "published") == "published" or "status" not in t


def test_non_owner_does_not_see_testimonials_pending(client, company_headers):
    """company_admin should get testimonials_pending=0 (not the owner's global count)."""
    r = client.get("/api/sidebar/badges", headers=company_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "testimonials_pending" in data
    assert data["testimonials_pending"] == 0, (
        f"company_admin leaked global testimonials count: {data['testimonials_pending']}"
    )


def test_auto_ban_not_triggered_by_public_submit(client):
    """Regression: /testimonials/submit is anonymous and must not trigger iter146 auto-ban."""
    # Submit twice rapidly to mimic a real user filling the form
    for i in range(2):
        r = client.post("/api/testimonials/submit", json={
            "name": f"TEST_Iter156 AutoBan Probe {i}",
            "role": "ساكن",
            "stars": 5,
            "comment": f"TEST_iter156 — auto-ban probe #{i}, must succeed without auth.",
        })
        assert r.status_code == 200, f"submit {i} blocked: {r.status_code} {r.text}"
        time.sleep(0.1)


# --- Cleanup ---------------------------------------------------------------

def test_zz_cleanup_test_testimonials(client, owner_headers):
    """Delete every TEST_ prefixed testimonial we created."""
    r = client.get("/api/owner/testimonials?limit=500", headers=owner_headers)
    assert r.status_code == 200
    items = r.json()["testimonials"]
    deleted = 0
    for t in items:
        if (t.get("name") or "").startswith("TEST_"):
            d = client.delete(f"/api/owner/testimonials/{t['id']}", headers=owner_headers)
            if d.status_code == 200:
                deleted += 1
    print(f"\n[iter156 cleanup] deleted {deleted} TEST_ testimonials")
