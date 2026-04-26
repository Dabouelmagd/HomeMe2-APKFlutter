"""Iter51 — 2FA hardening (password+TOTP), MongoDB indexes, monthly reports scheduler."""
import os
import time
import pyotp
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://profile-nav-debug.preview.emergentagent.com").rstrip("/")
OWNER = {"username": "Owner_homeme", "password": "Dalia1234@"}
COMPOUND_ID = "88ad3711-c9ae-45fe-a270-65f4524c071c"


def _login(username, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": username, "password": password}, timeout=30)
    return r


@pytest.fixture(scope="module")
def owner_token():
    r = _login(**OWNER)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    # If 2FA pending, this is unexpected; but handle for safety
    if "access_token" not in data:
        pytest.skip(f"Login did not return access_token: {data}")
    return data["access_token"]


@pytest.fixture(scope="module")
def owner_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}", "Content-Type": "application/json"}


# ---------------- 2FA hardening ----------------

class Test2FAHardening:
    def test_disable_missing_password_returns_422(self, owner_headers):
        # Setup 2FA first
        s = requests.post(f"{BASE_URL}/api/2fa/setup", headers=owner_headers, timeout=30)
        assert s.status_code == 200, s.text
        secret = s.json()["secret"]
        code = pyotp.TOTP(secret).now()
        v = requests.post(f"{BASE_URL}/api/2fa/verify-setup", headers=owner_headers, json={"token_code": code}, timeout=30)
        assert v.status_code == 200, v.text

        # Disable WITHOUT password field
        r = requests.post(f"{BASE_URL}/api/2fa/disable", headers=owner_headers,
                          json={"token_code": pyotp.TOTP(secret).now()}, timeout=30)
        assert r.status_code == 422, f"expected 422, got {r.status_code}: {r.text}"

    def test_disable_wrong_password_returns_401(self, owner_headers):
        # Re-fetch the active secret by calling status & setup is already done in previous test;
        # we keep using same secret via a quick re-setup if needed.
        # Use a fresh setup-cycle token to be safe.
        r = requests.post(f"{BASE_URL}/api/2fa/disable", headers=owner_headers,
                          json={"token_code": "000000", "password": "WRONG_PASSWORD!"}, timeout=30)
        # If 2FA already enabled (from previous test), endpoint should hit password check first
        assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text}"
        body = r.json()
        assert "كلمة المرور" in str(body) or "password" in str(body).lower()

    def test_disable_correct_password_and_totp_succeeds(self, owner_headers):
        # We need a valid TOTP. The current secret was set in test 1.
        # Easiest: do a fresh setup → verify-setup → then disable with password+TOTP.
        s = requests.post(f"{BASE_URL}/api/2fa/setup", headers=owner_headers, timeout=30)
        assert s.status_code == 200
        secret = s.json()["secret"]
        v = requests.post(f"{BASE_URL}/api/2fa/verify-setup", headers=owner_headers,
                          json={"token_code": pyotp.TOTP(secret).now()}, timeout=30)
        assert v.status_code == 200, v.text

        d = requests.post(f"{BASE_URL}/api/2fa/disable", headers=owner_headers,
                          json={"token_code": pyotp.TOTP(secret).now(), "password": OWNER["password"]}, timeout=30)
        assert d.status_code == 200, f"expected 200, got {d.status_code}: {d.text}"
        assert d.json().get("success") is True

        # Verify status
        st = requests.get(f"{BASE_URL}/api/2fa/status", headers=owner_headers, timeout=30)
        assert st.status_code == 200
        assert st.json().get("enabled") is False


# ---------------- MongoDB indexes ----------------

class TestMongoIndexes:
    """Verifies indexes by direct DB access (server-side fixture)."""

    def test_indexes_present(self):
        try:
            from pymongo import MongoClient
        except ImportError:
            pytest.skip("pymongo not installed in test env")
        # Read .env directly since MONGO_URL is in backend/.env
        env_path = "/app/backend/.env"
        env = {}
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if "=" in line and not line.strip().startswith("#"):
                        k, _, v = line.strip().partition("=")
                        env[k] = v.strip().strip('"').strip("'")
        mongo_url = env.get("MONGO_URL") or os.environ.get("MONGO_URL")
        db_name = env.get("DB_NAME") or os.environ.get("DB_NAME")
        if not mongo_url or not db_name:
            pytest.skip("MONGO_URL/DB_NAME not available")
        client = MongoClient(mongo_url)
        db = client[db_name]
        expected = {
            "resident_charges": [["resident_id", "due_date"], ["compound_id", "created_at"],
                                 ["compound_id", "due_date"], ["status"]],
            "resident_payments": [["resident_id", "payment_date"], ["compound_id", "created_at"],
                                  ["compound_id", "payment_date"]],
            "expenses": [["compound_id", "date"]],
            "users": [["compound_id", "role"], ["family_id"]],
            "audit_logs": [["timestamp"], ["user_id", "timestamp"]],
            "report_runs": [["month", "kind"]],
            "visitor_passes": [["compound_id", "created_at"]],
            "maintenance_requests": [["compound_id", "created_at"]],
            "complaints": [["compound_id", "created_at"]],
            "service_bookings": [["compound_id", "created_at"]],
            "notifications": [["recipient_ids", "created_at"]],
        }
        total = 0
        missing = []
        for coll, idx_lists in expected.items():
            info = db[coll].index_information()
            existing_keys = []
            for _, meta in info.items():
                existing_keys.append([k for k, _v in meta["key"]])
            for wanted in idx_lists:
                if wanted in existing_keys:
                    total += 1
                else:
                    missing.append(f"{coll}:{wanted}")
        assert not missing, f"Missing indexes: {missing}"
        assert total >= 18, f"expected >=18 matched, got {total}"


# ---------------- Monthly scheduler ----------------

class TestMonthlyScheduler:
    def test_status_endpoint_shape(self, owner_headers):
        r = requests.get(f"{BASE_URL}/api/reports/scheduler/status", headers=owner_headers, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "total_runs" in body and "last_run_at" in body and "recent" in body
        assert isinstance(body["recent"], list)

    def test_run_invalid_month_returns_400(self, owner_headers):
        r = requests.post(f"{BASE_URL}/api/reports/run-monthly-now", headers=owner_headers,
                          json={"month": "not-a-month"}, timeout=30)
        assert r.status_code == 400, r.text

    def test_run_valid_month_queues_and_records(self, owner_headers):
        # Use unique month label to ensure fresh entries (avoid previous test data)
        # Using year 2031 with month derived from current minute to be unique
        import datetime as _dt
        now = _dt.datetime.utcnow()
        target_month = f"2031-{(now.minute % 12) + 1:02d}"
        # Pre count
        before = requests.get(f"{BASE_URL}/api/reports/scheduler/status", headers=owner_headers, timeout=30).json()
        before_total = before.get("total_runs", 0)

        r = requests.post(f"{BASE_URL}/api/reports/run-monthly-now", headers=owner_headers,
                          json={"month": target_month}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("queued") is True

        # Wait for background task to fully complete (total_runs stable for 3 consecutive polls)
        last_total = before_total
        stable = 0
        after = before
        for _ in range(60):
            time.sleep(2)
            after = requests.get(f"{BASE_URL}/api/reports/scheduler/status", headers=owner_headers, timeout=30).json()
            t = after.get("total_runs", 0)
            if t == last_total and t > before_total:
                stable += 1
                if stable >= 3:
                    break
            else:
                stable = 0
            last_total = t
        else:
            pytest.fail(f"Run did not stabilize in 120s. Final total={last_total}, before={before_total}")

        # Stash month for idempotency test
        TestMonthlyScheduler._target_month = target_month
        TestMonthlyScheduler._after_total = after["total_runs"]

        recent = after.get("recent", [])
        # Recent endpoint returns last 40, so target month may be there
        month_entries = [item for item in recent if item.get("month") == target_month]
        assert month_entries, f"No entries recorded for month {target_month} in recent[]"
        kinds = {item.get("kind") for item in month_entries}
        assert kinds & {"summary", "statement"}, f"expected summary/statement kinds, got {kinds}"

    def test_idempotent_rerun_does_not_duplicate(self, owner_headers):
        target_month = getattr(TestMonthlyScheduler, "_target_month", None)
        if not target_month:
            pytest.skip("prior test did not set target month")
        before_total = getattr(TestMonthlyScheduler, "_after_total", 0)

        r = requests.post(f"{BASE_URL}/api/reports/run-monthly-now", headers=owner_headers,
                          json={"month": target_month}, timeout=30)
        assert r.status_code == 200

        # Wait for run to complete (should be fast since idempotent skip)
        time.sleep(15)
        after = requests.get(f"{BASE_URL}/api/reports/scheduler/status", headers=owner_headers, timeout=30).json()
        diff = after["total_runs"] - before_total
        assert diff <= 1, f"idempotency broken: {diff} new rows for same month {target_month}"

    def test_non_admin_gets_403_on_run(self):
        # Use security role (non-admin)
        r = _login("security", "Security2024!")
        if r.status_code != 200 or "access_token" not in r.json():
            pytest.skip("security login unavailable")
        h = {"Authorization": f"Bearer {r.json()['access_token']}", "Content-Type": "application/json"}
        rr = requests.post(f"{BASE_URL}/api/reports/run-monthly-now", headers=h,
                           json={"month": "2030-12"}, timeout=30)
        assert rr.status_code == 403, rr.text
        rs = requests.get(f"{BASE_URL}/api/reports/scheduler/status", headers=h, timeout=30)
        assert rs.status_code == 403, rs.text


# ---------------- Regression ----------------

class TestRegression:
    def test_compounds_services_bookings_visitors_audit(self, owner_headers):
        for path, expected in [
            (f"/api/compounds/{COMPOUND_ID}/services", 200),
            (f"/api/compounds/{COMPOUND_ID}/bookings", 200),
            ("/api/audit-logs", 200),
            (f"/api/visitor-passes/compound?compound_id={COMPOUND_ID}", 200),
        ]:
            r = requests.get(f"{BASE_URL}{path}", headers=owner_headers, timeout=30)
            assert r.status_code == expected, f"{path} => {r.status_code} {r.text[:200]}"

    def test_2fa_setup_endpoint_still_responsive(self, owner_headers):
        r = requests.post(f"{BASE_URL}/api/2fa/setup", headers=owner_headers, timeout=30)
        assert r.status_code == 200
        assert "secret" in r.json() and "qr_code" in r.json()
        # cleanup: don't enable, leave as unverified setup which doesn't enable 2FA
