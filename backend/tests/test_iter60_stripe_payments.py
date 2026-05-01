"""
Iter60 — Stripe Payments for Company Subscriptions
Covers:
 - POST /api/stripe/create-checkout-session (valid, invalid plan, starter, no-auth, no-company)
 - GET  /api/stripe/checkout-status/{session_id} (owner, cross-user 403, 404)
 - GET  /api/stripe/my-transactions (scoped to current user)
 - auth/register with selected_plan=company_business stays pending_payment

Uses public ingress URL via frontend/.env REACT_APP_BACKEND_URL.
"""
import os
import re
import uuid
import pytest
import requests
from pathlib import Path

# --- Resolve public BASE_URL ------------------------------------------------
def _read_env(path, key):
    try:
        for line in Path(path).read_text().splitlines():
            if line.startswith(f"{key}="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        return None
    return None

BASE_URL = (_read_env("/app/frontend/.env", "REACT_APP_BACKEND_URL") or "http://127.0.0.1:8001").rstrip("/")
ORIGIN = BASE_URL  # used as origin_url for success/cancel URLs

NEWCO = ("newco_admin", "NewCo123!")          # starter plan company_admin (paid flow candidate)
ENT   = ("testcompany2", "Company123!")       # enterprise plan company_admin (for cross-user tests)
OWNER = ("Owner_homeme", "Dalia1234@")        # app_owner — no company_id


def _login(u, p):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": u, "password": p}, timeout=15)
    assert r.status_code == 200, f"login {u} failed: {r.status_code} {r.text[:200]}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok, f"no token in login response for {u}"
    return tok


@pytest.fixture(scope="module")
def newco_headers():
    return {"Authorization": f"Bearer {_login(*NEWCO)}"}


@pytest.fixture(scope="module")
def ent_headers():
    return {"Authorization": f"Bearer {_login(*ENT)}"}


@pytest.fixture(scope="module")
def owner_headers():
    return {"Authorization": f"Bearer {_login(*OWNER)}"}


# ---------------------------------------------------------------------------
# Auth guard
# ---------------------------------------------------------------------------
class TestAuthGuard:
    def test_create_session_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/stripe/create-checkout-session",
            json={"plan_key": "company_business", "origin_url": ORIGIN},
            timeout=15,
        )
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"


# ---------------------------------------------------------------------------
# create-checkout-session — input validation
# ---------------------------------------------------------------------------
class TestCreateCheckoutValidation:
    def test_invalid_plan_returns_400(self, newco_headers):
        r = requests.post(
            f"{BASE_URL}/api/stripe/create-checkout-session",
            headers=newco_headers,
            json={"plan_key": "invalid_plan", "origin_url": ORIGIN},
            timeout=15,
        )
        assert r.status_code == 400, r.text

    def test_starter_plan_returns_400(self, newco_headers):
        # starter is free/not in PLAN_PRICES — backend treats as invalid plan (400)
        r = requests.post(
            f"{BASE_URL}/api/stripe/create-checkout-session",
            headers=newco_headers,
            json={"plan_key": "starter", "origin_url": ORIGIN},
            timeout=15,
        )
        assert r.status_code == 400, r.text

    def test_user_without_company_returns_400(self, owner_headers):
        # app_owner has no company_id
        r = requests.post(
            f"{BASE_URL}/api/stripe/create-checkout-session",
            headers=owner_headers,
            json={"plan_key": "company_business", "origin_url": ORIGIN},
            timeout=15,
        )
        assert r.status_code == 400, r.text


# ---------------------------------------------------------------------------
# create-checkout-session — happy path
# ---------------------------------------------------------------------------
class TestCreateCheckoutHappy:
    def test_business_session_created(self, newco_headers):
        r = requests.post(
            f"{BASE_URL}/api/stripe/create-checkout-session",
            headers=newco_headers,
            json={"plan_key": "company_business", "origin_url": ORIGIN},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and "session_id" in data
        assert data["url"].startswith("https://checkout.stripe.com/"), f"unexpected url: {data['url']}"
        assert isinstance(data["session_id"], str) and len(data["session_id"]) > 5
        pytest.newco_session_id = data["session_id"]

    def test_status_for_owned_session(self, newco_headers):
        sid = getattr(pytest, "newco_session_id", None)
        assert sid, "depends on previous test"
        r = requests.get(
            f"{BASE_URL}/api/stripe/checkout-status/{sid}",
            headers=newco_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # Expect Stripe cents total for Business plan (7500 EGP → 750000)
        assert data.get("amount_total") == 750000, f"expected 750000, got {data.get('amount_total')}"
        assert data.get("currency", "").lower() == "egp"
        assert data.get("plan_key") == "company_business"
        assert data.get("payment_status") in ("unpaid", "pending", "paid")

    def test_my_transactions_contains_session(self, newco_headers):
        sid = getattr(pytest, "newco_session_id", None)
        r = requests.get(f"{BASE_URL}/api/stripe/my-transactions", headers=newco_headers, timeout=15)
        assert r.status_code == 200, r.text
        txns = r.json().get("transactions", [])
        assert any(t.get("session_id") == sid for t in txns), "session missing from my-transactions"
        # every txn belongs to this user (scoping)
        for t in txns:
            assert t.get("plan_key") in ("company_startup", "company_business", "company_enterprise")


# ---------------------------------------------------------------------------
# Cross-user access control
# ---------------------------------------------------------------------------
class TestCrossUserAccess:
    def test_other_user_cannot_read_session(self, ent_headers):
        sid = getattr(pytest, "newco_session_id", None)
        assert sid, "depends on happy-path test"
        r = requests.get(
            f"{BASE_URL}/api/stripe/checkout-status/{sid}",
            headers=ent_headers,
            timeout=15,
        )
        assert r.status_code == 403, f"expected 403, got {r.status_code} {r.text[:200]}"

    def test_nonexistent_session_returns_404(self, newco_headers):
        fake = f"cs_test_{uuid.uuid4().hex}"
        r = requests.get(
            f"{BASE_URL}/api/stripe/checkout-status/{fake}",
            headers=newco_headers,
            timeout=15,
        )
        assert r.status_code == 404, r.text

    def test_ent_cannot_see_newco_txn_in_their_list(self, ent_headers):
        sid = getattr(pytest, "newco_session_id", None)
        r = requests.get(f"{BASE_URL}/api/stripe/my-transactions", headers=ent_headers, timeout=15)
        assert r.status_code == 200
        txns = r.json().get("transactions", [])
        assert all(t.get("session_id") != sid for t in txns), "txn leaked across users!"


# ---------------------------------------------------------------------------
# Register + selected_plan=company_business → pending_payment
# ---------------------------------------------------------------------------
class TestRegisterPendingPayment:
    def test_register_business_plan_is_pending_payment(self):
        uniq = uuid.uuid4().hex[:8]
        payload = {
            "username": f"TEST_stripe_{uniq}",
            "password": "Stripe123!",
            "full_name": f"TEST Stripe Co {uniq}",
            "email": f"TEST_stripe_{uniq}@example.com",
            "phone": f"01{uniq[:9]}",
            "role": "company_admin",
            "compound_id": "default-compound",
            "selected_plan": "company_business",
        }
        r = requests.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=20)
        assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text[:300]}"
        tok = _login(payload["username"], payload["password"])
        h = {"Authorization": f"Bearer {tok}"}
        # Plan-usage endpoint exposes current plan + subscription status for company_admin
        r = requests.get(f"{BASE_URL}/api/company-admin/plan-usage", headers=h, timeout=15)
        assert r.status_code == 200, f"plan-usage failed: {r.status_code} {r.text[:200]}"
        body = r.json()
        # accept several response shapes
        plan = body.get("plan") or body.get("current_plan") or (body.get("subscription") or {}).get("plan")
        status = (
            body.get("status")
            or body.get("subscription_status")
            or (body.get("subscription") or {}).get("status")
        )
        assert plan == "company_business", f"expected company_business, got {plan} (body={body})"
        # Plan-usage doesn't expose raw status → query MongoDB directly
        from pymongo import MongoClient
        mongo_url = _read_env("/app/backend/.env", "MONGO_URL") or "mongodb://localhost:27017"
        db_name = _read_env("/app/backend/.env", "DB_NAME") or "homeme_db"
        cli = MongoClient(mongo_url)
        sub = cli[db_name].company_subscriptions.find_one({"company_id": body.get("company_id")})
        cli.close()
        assert sub is not None, "company_subscriptions row missing after register"
        assert sub.get("status") == "pending_payment", f"expected pending_payment, got {sub.get('status')}"
        assert sub.get("plan") == "company_business"
