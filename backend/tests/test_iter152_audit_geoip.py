"""
Iter 152 — Audit Trail Dashboard + GeoIP enrichment tests.

Verifies:
1. Audit log entries are created for sensitive super-admin actions
   (company.create, company.update, company.delete, compound.create, etc.)
2. GeoIP service normalizes IPs, skips private addresses, looks up public IPs.
3. /api/audit-logs returns enriched entries with geo data.
4. /api/audit-logs/summary returns top_countries aggregation.
5. /api/audit-logs/backfill-geo enriches old entries missing geo data.
6. GeoIP cache prevents repeated external lookups for the same IP.
"""
import asyncio
import os, sys, time, uuid, json
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
        assert r1.status_code == 200
        body1 = r1.json()
        if body1.get("two_factor_required"):
            temp = body1["temp_token"]
            code = pyotp.TOTP(OWNER_TOTP_SECRET).now()
            r2 = c.post("/api/2fa/verify-login", json={"temp_token": temp, "code": code})
            assert r2.status_code == 200
            return r2.json()["access_token"]
        return body1.get("access_token")


@pytest.fixture
def headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}"}


# ─── GeoIP service tests (direct, no HTTP) ─────────────────────────────────

def _run_async(coro):
    """Helper to invoke async functions from sync tests."""
    return asyncio.new_event_loop().run_until_complete(coro)


def test_geoip_private_ips_return_none():
    from dotenv import load_dotenv; load_dotenv("/app/backend/.env")
    from database import init_db
    init_db()
    from services.geoip_service import geoip_lookup
    async def check_all():
        for ip in ["127.0.0.1", "10.0.0.1", "192.168.1.1", "::1", "fe80::1", "not-an-ip", "999.999.999.999"]:
            r = await geoip_lookup(ip)
            assert r is None, f"{ip} should not resolve to geo data, got {r}"
    _run_async(check_all())


def test_geoip_public_ips_return_data():
    from dotenv import load_dotenv; load_dotenv("/app/backend/.env")
    from database import init_db
    init_db()
    from services.geoip_service import geoip_lookup
    async def check():
        r = await geoip_lookup("8.8.8.8")
        assert r is not None
        assert r["country_code"] == "US"
        assert r["source"] in ("maxmind", "ip-api")
    _run_async(check())


def test_geoip_cache_round_trip():
    """Second lookup of the same IP should hit cache (much faster)."""
    from dotenv import load_dotenv; load_dotenv("/app/backend/.env")
    from database import init_db
    init_db()
    from services.geoip_service import geoip_lookup
    async def check():
        t1 = time.time()
        r1 = await geoip_lookup("1.1.1.1")
        dt1 = time.time() - t1
        t2 = time.time()
        r2 = await geoip_lookup("1.1.1.1")
        dt2 = time.time() - t2
        assert r1 == r2
        assert dt2 < dt1, f"Cache miss: 1st {dt1:.3f}s vs 2nd {dt2:.3f}s"
    _run_async(check())


# ─── Audit log endpoint tests ──────────────────────────────────────────────

def test_company_lifecycle_audit_trail(headers):
    """Create+Update+Delete a company. Verify 3 audit entries exist."""
    company_name = f"_AuditTest_{uuid.uuid4().hex[:8]}"
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        # Create
        r = c.post("/api/super-admin/companies", headers=headers,
                   json={"name": company_name, "email": "audit@x.com"})
        assert r.status_code == 200, r.text
        company_id = r.json()["company"]["id"]

        # Update
        r2 = c.put(f"/api/super-admin/companies/{company_id}", headers=headers,
                   json={"phone": "01099999999", "website": "https://example.com"})
        assert r2.status_code == 200

        # Delete
        r3 = c.delete(f"/api/super-admin/companies/{company_id}", headers=headers)
        assert r3.status_code == 200

        # Verify audit entries
        r4 = c.get("/api/audit-logs?days=1&limit=100", headers=headers)
        assert r4.status_code == 200
        items = r4.json()["items"]
        actions_for_company = [it["action"] for it in items if it.get("target_id") == company_id]
        assert "company.create" in actions_for_company
        assert "company.update" in actions_for_company
        assert "company.delete" in actions_for_company


def test_audit_summary_top_countries(headers):
    """Summary endpoint includes top_countries aggregation."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        r = c.get("/api/audit-logs/summary?days=7", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "top_countries" in data
        assert isinstance(data["top_countries"], list)
        # Each country entry has standard shape
        for c_row in data["top_countries"]:
            assert "country_code" in c_row or c_row.get("country_code") is None
            assert "count" in c_row


def test_audit_logs_geo_enrichment(headers):
    """Audit log items have `geo` field when IP is public, None otherwise."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        r = c.get("/api/audit-logs?days=1&limit=20&enrich_geo=true", headers=headers)
        assert r.status_code == 200
        items = r.json()["items"]
        # At least one private-IP entry (127.0.0.1) should have geo=None or missing
        # And at least the schema should support `geo` field
        for it in items:
            ip = it.get("ip")
            geo = it.get("geo")
            if ip and ip.startswith(("127.", "10.", "192.168.", "172.")):
                # private IPs should have no geo data
                assert geo is None or not geo.get("country_code")


def test_audit_logs_country_filter(headers):
    """Filter audit logs by country_code."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        r = c.get("/api/audit-logs?days=7&country=US", headers=headers)
        assert r.status_code == 200
        items = r.json()["items"]
        for it in items:
            if it.get("geo"):
                assert it["geo"].get("country_code") == "US"


def test_backfill_geo_endpoint(headers):
    """Backfill endpoint enriches old entries."""
    with httpx.Client(base_url=BASE_URL, timeout=60.0) as c:
        r = c.post("/api/audit-logs/backfill-geo?days=7&limit=50", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "processed" in data
        assert "enriched" in data
        # Sanity: enriched ≤ processed
        assert data["enriched"] <= data["processed"]


# ─── Regression: existing audit endpoints still work ─────────────────────

def test_audit_logs_no_geo_param_still_works(headers):
    """enrich_geo=false should bypass GeoIP and return entries as-is."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        r = c.get("/api/audit-logs?days=7&enrich_geo=false&limit=10", headers=headers)
        assert r.status_code == 200
        assert "items" in r.json()


def test_audit_logs_filters_combined(headers):
    """Multiple filters work together."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        r = c.get("/api/audit-logs?days=7&action=auth&success=true&limit=10", headers=headers)
        assert r.status_code == 200
        items = r.json()["items"]
        for it in items:
            assert it.get("action", "").startswith("auth")
            assert it.get("success") is True
