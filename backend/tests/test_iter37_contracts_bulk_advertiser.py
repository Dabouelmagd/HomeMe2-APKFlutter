"""
Iteration 37 tests:
  - Management Contracts CRUD + auto-renew + PDF download
  - Bulk Users creation (valid + invalid + duplicates)
  - Advertiser Portal: register, CRUD, mock pay, approve/reject, track impression/click
"""
import os
import base64
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

SUPER = {"username": "superadmin", "password": "SuperAdmin2024!"}


# ---------------- fixtures ----------------
@pytest.fixture(scope="session")
def super_token():
    r = requests.post(f"{API}/auth/login", json=SUPER, timeout=30)
    assert r.status_code == 200, f"super login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def super_headers(super_token):
    return {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def sample_company_and_compound(super_headers):
    """Get/create a company and a compound for contract tests. They don't have to be linked."""
    # Existing companies
    r = requests.get(f"{API}/super-admin/companies", headers=super_headers, timeout=30)
    companies = []
    if r.status_code == 200:
        d = r.json()
        companies = d.get("companies") if isinstance(d, dict) else d or []
    if not companies:
        rc = requests.post(f"{API}/super-admin/companies", headers=super_headers,
                           json={"name": f"TEST_Co_{uuid.uuid4().hex[:6]}"}, timeout=30)
        assert rc.status_code in (200, 201), rc.text
        body = rc.json()
        companies = [body.get("company") or body]
    company_id = companies[0]["id"]

    # Existing compounds
    rc = requests.get(f"{API}/super-admin/compounds", headers=super_headers, timeout=30)
    compounds = []
    if rc.status_code == 200:
        d = rc.json()
        compounds = d.get("compounds") if isinstance(d, dict) else d or []
    if not compounds:
        # create compound under this company via nested endpoint
        nested = requests.post(f"{API}/super-admin/companies/{company_id}/compounds",
                               headers=super_headers,
                               json={"name": f"TEST_Cp_{uuid.uuid4().hex[:6]}", "address": "Cairo"},
                               timeout=30)
        assert nested.status_code in (200, 201), nested.text
        body = nested.json()
        compounds = [body.get("compound") or body]
    compound_id = compounds[0]["id"]
    return company_id, compound_id


# ==================== Management Contracts ====================

class TestManagementContracts:
    def test_create_contract_with_pdf(self, super_headers, sample_company_and_compound):
        company_id, compound_id = sample_company_and_compound
        pdf_bytes = b"%PDF-1.4 fake contract content for TEST"
        pdf_b64 = base64.b64encode(pdf_bytes).decode()
        payload = {
            "company_id": company_id,
            "compound_id": compound_id,
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "commission_percent": 12.5,
            "fixed_fee": 500,
            "billing_cycle": "monthly",
            "currency": "EGP",
            "auto_renew": True,
            "renewal_period_months": 12,
            "status": "active",
            "notes": "TEST contract",
            "pdf_data_url": f"data:application/pdf;base64,{pdf_b64}",
            "pdf_filename": "test_contract.pdf",
        }
        r = requests.post(f"{API}/super-admin/management-contracts", headers=super_headers, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        c = data["contract"]
        assert c["commission_percent"] == 12.5
        assert c["billing_cycle"] == "monthly"
        assert c["pdf_filename"] == "test_contract.pdf"
        assert c["status"] == "active"
        pytest.contract_id = c["id"]

    def test_list_contracts_has_summary(self, super_headers, sample_company_and_compound):
        company_id, compound_id = sample_company_and_compound
        r = requests.get(f"{API}/super-admin/management-contracts",
                         params={"company_id": company_id, "compound_id": compound_id},
                         headers=super_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "contracts" in data and "summary" in data
        assert data["summary"]["total"] >= 1
        # pdf_data_url must be stripped from list
        assert all("pdf_data_url" not in c for c in data["contracts"])

    def test_get_contract_includes_pdf(self, super_headers):
        cid = pytest.contract_id
        r = requests.get(f"{API}/super-admin/management-contracts/{cid}", headers=super_headers, timeout=30)
        assert r.status_code == 200
        assert r.json().get("pdf_data_url", "").startswith("data:application/pdf")

    def test_download_pdf(self, super_headers):
        cid = pytest.contract_id
        r = requests.get(f"{API}/super-admin/management-contracts/{cid}/pdf", headers=super_headers, timeout=30)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content.startswith(b"%PDF")

    def test_commission_validation(self, super_headers, sample_company_and_compound):
        company_id, compound_id = sample_company_and_compound
        r = requests.post(f"{API}/super-admin/management-contracts", headers=super_headers, json={
            "company_id": company_id, "compound_id": compound_id, "commission_percent": 150,
        }, timeout=30)
        assert r.status_code == 400

    def test_pdf_size_limit(self, super_headers, sample_company_and_compound):
        company_id, compound_id = sample_company_and_compound
        big = "A" * 6_600_000
        r = requests.post(f"{API}/super-admin/management-contracts", headers=super_headers, json={
            "company_id": company_id, "compound_id": compound_id,
            "pdf_data_url": f"data:application/pdf;base64,{big}",
        }, timeout=60)
        assert r.status_code == 400

    def test_update_contract(self, super_headers):
        cid = pytest.contract_id
        r = requests.put(f"{API}/super-admin/management-contracts/{cid}", headers=super_headers, json={
            "commission_percent": 20, "notes": "updated"
        }, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["contract"]["commission_percent"] == 20
        assert r.json()["contract"]["notes"] == "updated"

    def test_expired_contract_auto_status(self, super_headers, sample_company_and_compound):
        company_id, compound_id = sample_company_and_compound
        r = requests.post(f"{API}/super-admin/management-contracts", headers=super_headers, json={
            "company_id": company_id, "compound_id": compound_id,
            "start_date": "2020-01-01", "end_date": "2020-12-31",
            "commission_percent": 5, "auto_renew": True,
        }, timeout=30)
        assert r.status_code == 200
        assert r.json()["contract"]["status"] == "expired"
        pytest.expired_id = r.json()["contract"]["id"]

    def test_process_auto_renew(self, super_headers):
        r = requests.post(f"{API}/super-admin/management-contracts/process-auto-renew",
                          headers=super_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["count"] >= 1

    def test_delete_contract(self, super_headers):
        # delete both
        for cid in [pytest.contract_id, getattr(pytest, "expired_id", None)]:
            if not cid: continue
            r = requests.delete(f"{API}/super-admin/management-contracts/{cid}", headers=super_headers, timeout=30)
            assert r.status_code == 200
        # ensure 404 after delete
        r = requests.get(f"{API}/super-admin/management-contracts/{pytest.contract_id}",
                         headers=super_headers, timeout=30)
        assert r.status_code == 404


# ==================== Bulk Users ====================

class TestBulkUsers:
    def test_bulk_mixed(self, super_headers, sample_company_and_compound):
        _, compound_id = sample_company_and_compound
        suffix = uuid.uuid4().hex[:6]
        rows = [
            # valid
            {"full_name": "Good One", "username": f"TEST_u1_{suffix}",
             "email": f"test_u1_{suffix}@t.com", "password": "pass123", "phone": "01000", "unit_number": "A1"},
            {"full_name": "Good Two", "username": f"TEST_u2_{suffix}",
             "email": f"test_u2_{suffix}@t.com", "password": "pass123"},
            # missing email
            {"full_name": "Bad", "username": f"TEST_bad_{suffix}", "password": "pass123"},
            # short password
            {"full_name": "Short Pwd", "username": f"TEST_sp_{suffix}",
             "email": f"test_sp_{suffix}@t.com", "password": "abc"},
            # duplicate within batch (same as row 0)
            {"full_name": "Dup Batch", "username": f"TEST_u1_{suffix}",
             "email": f"test_dup_{suffix}@t.com", "password": "pass123"},
        ]
        payload = {"compound_id": compound_id, "role": "resident", "rows": rows}
        r = requests.post(f"{API}/super-admin/users/bulk", headers=super_headers, json=payload, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["created_count"] == 2
        assert data["failed_count"] == 3
        # verify each failed entry has error string
        for f in data["failed"]:
            assert "error" in f and f["error"]
        pytest.bulk_username = f"TEST_u1_{suffix}"
        pytest.bulk_email = f"test_u1_{suffix}@t.com"

    def test_bulk_duplicate_against_db(self, super_headers, sample_company_and_compound):
        _, compound_id = sample_company_and_compound
        rows = [{
            "full_name": "Existing", "username": pytest.bulk_username,
            "email": pytest.bulk_email, "password": "pass123",
        }]
        r = requests.post(f"{API}/super-admin/users/bulk", headers=super_headers,
                          json={"compound_id": compound_id, "role": "resident", "rows": rows}, timeout=30)
        assert r.status_code == 200
        assert r.json()["failed_count"] == 1

    def test_bulk_empty_rejected(self, super_headers):
        r = requests.post(f"{API}/super-admin/users/bulk", headers=super_headers,
                          json={"rows": []}, timeout=30)
        assert r.status_code == 400


# ==================== Advertiser Portal ====================

ADV_SUFFIX = uuid.uuid4().hex[:6]
ADV_USERNAME = f"TEST_adv_{ADV_SUFFIX}"
ADV_PASSWORD = "AdvPass123"
ADV_EMAIL = f"test_adv_{ADV_SUFFIX}@t.com"


class TestAdvertiser:
    def test_register(self):
        r = requests.post(f"{API}/advertiser/register", json={
            "full_name": "TEST Advertiser", "company_name": "TEST Co",
            "username": ADV_USERNAME, "email": ADV_EMAIL,
            "password": ADV_PASSWORD, "phone": "01010101010",
        }, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert data["user"]["role"] == "advertiser"

    def test_register_duplicate(self):
        r = requests.post(f"{API}/advertiser/register", json={
            "full_name": "Dup", "username": ADV_USERNAME,
            "email": ADV_EMAIL, "password": ADV_PASSWORD,
        }, timeout=30)
        assert r.status_code == 400

    def test_login_advertiser(self):
        r = requests.post(f"{API}/auth/login",
                          json={"username": ADV_USERNAME, "password": ADV_PASSWORD}, timeout=30)
        assert r.status_code == 200, r.text
        pytest.adv_token = r.json()["access_token"]

    def test_create_ad(self):
        h = {"Authorization": f"Bearer {pytest.adv_token}", "Content-Type": "application/json"}
        r = requests.post(f"{API}/advertiser/ads", headers=h, json={
            "title": "TEST Ad", "body": "hello", "duration_days": 7, "budget": 100,
            "link_url": "https://example.com",
        }, timeout=30)
        assert r.status_code == 200, r.text
        ad = r.json()["ad"]
        assert ad["status"] == "awaiting_payment"
        assert ad["payment_status"] == "unpaid"
        assert ad["amount_due"] > 0
        pytest.ad_id = ad["id"]

    def test_list_my_ads(self):
        h = {"Authorization": f"Bearer {pytest.adv_token}"}
        r = requests.get(f"{API}/advertiser/ads", headers=h, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "ads" in data and "summary" in data
        assert data["summary"]["total"] >= 1

    def test_update_ad_before_approval(self):
        h = {"Authorization": f"Bearer {pytest.adv_token}", "Content-Type": "application/json"}
        r = requests.put(f"{API}/advertiser/ads/{pytest.ad_id}", headers=h,
                         json={"title": "TEST Ad Updated"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["ad"]["title"] == "TEST Ad Updated"

    def test_mock_pay(self):
        h = {"Authorization": f"Bearer {pytest.adv_token}"}
        r = requests.post(f"{API}/advertiser/ads/{pytest.ad_id}/pay", headers=h, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert data["mock"] is True
        assert "client_secret" in data

    def test_ad_status_after_pay(self):
        h = {"Authorization": f"Bearer {pytest.adv_token}"}
        r = requests.get(f"{API}/advertiser/ads/{pytest.ad_id}", headers=h, timeout=30)
        assert r.status_code == 200
        ad = r.json()
        assert ad["payment_status"] == "paid"
        assert ad["status"] == "pending_approval"

    def test_cannot_update_after_pending_approval(self):
        h = {"Authorization": f"Bearer {pytest.adv_token}", "Content-Type": "application/json"}
        r = requests.put(f"{API}/advertiser/ads/{pytest.ad_id}", headers=h,
                         json={"title": "blocked"}, timeout=30)
        assert r.status_code == 400

    def test_track_impression_public(self):
        r = requests.post(f"{API}/advertiser-ads/{pytest.ad_id}/track-impression", timeout=30)
        assert r.status_code == 200
        assert r.json()["success"] is True

    def test_track_click_public(self):
        r = requests.post(f"{API}/advertiser-ads/{pytest.ad_id}/track-click", timeout=30)
        assert r.status_code == 200

    def test_stats(self):
        h = {"Authorization": f"Bearer {pytest.adv_token}"}
        r = requests.get(f"{API}/advertiser/ads/{pytest.ad_id}/stats", headers=h, timeout=30)
        assert r.status_code == 200
        s = r.json()
        assert s["impressions"] >= 1
        assert s["clicks"] >= 1
        assert s["ctr_percent"] >= 0

    def test_sa_list_pending(self, super_headers):
        r = requests.get(f"{API}/super-admin/advertiser-ads",
                         params={"status": "pending_approval"}, headers=super_headers, timeout=30)
        assert r.status_code == 200
        ids = [a["id"] for a in r.json()["ads"]]
        assert pytest.ad_id in ids

    def test_sa_approve(self, super_headers):
        r = requests.post(f"{API}/super-admin/advertiser-ads/{pytest.ad_id}/approve",
                          headers=super_headers, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["success"] is True
        # Create another ad for rejection test via new advertiser session
        h = {"Authorization": f"Bearer {pytest.adv_token}", "Content-Type": "application/json"}
        r2 = requests.post(f"{API}/advertiser/ads", headers=h, json={
            "title": "TEST reject ad", "body": "x", "duration_days": 3,
        }, timeout=30)
        assert r2.status_code == 200
        pytest.reject_ad_id = r2.json()["ad"]["id"]
        requests.post(f"{API}/advertiser/ads/{pytest.reject_ad_id}/pay", headers=h, timeout=30)

    def test_sa_reject(self, super_headers):
        r = requests.post(f"{API}/super-admin/advertiser-ads/{pytest.reject_ad_id}/reject",
                          headers=super_headers, json={"reason": "TEST reason"}, timeout=30)
        assert r.status_code == 200, r.text
        # verify status
        h = {"Authorization": f"Bearer {pytest.adv_token}"}
        g = requests.get(f"{API}/advertiser/ads/{pytest.reject_ad_id}", headers=h, timeout=30)
        assert g.json()["status"] == "rejected"
        assert g.json()["rejection_reason"] == "TEST reason"

    def test_cannot_delete_approved(self):
        h = {"Authorization": f"Bearer {pytest.adv_token}"}
        r = requests.delete(f"{API}/advertiser/ads/{pytest.ad_id}", headers=h, timeout=30)
        assert r.status_code == 400  # approved ads cannot be deleted
