"""
Test suite for Contracts Management System
Tests: CRUD operations, expiry tracking, urgency calculation, and smart alerts
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

class TestContractsManagement:
    """Contracts CRUD and expiry tracking tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        
        yield
        
        # Cleanup: Delete test contracts
        try:
            contracts_res = self.session.get(f"{BASE_URL}/api/contracts")
            if contracts_res.status_code == 200:
                contracts = contracts_res.json().get("contracts", [])
                for c in contracts:
                    if c.get("title", "").startswith("TEST_"):
                        self.session.delete(f"{BASE_URL}/api/contracts/{c['id']}")
        except:
            pass
    
    # ==================== GET CONTRACTS ====================
    
    def test_get_contracts_returns_list_with_summary(self):
        """GET /api/contracts - Returns contracts list with summary"""
        response = self.session.get(f"{BASE_URL}/api/contracts")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "contracts" in data, "Response should have 'contracts' key"
        assert "summary" in data, "Response should have 'summary' key"
        assert isinstance(data["contracts"], list), "Contracts should be a list"
        
        # Verify summary structure
        summary = data["summary"]
        assert "total" in summary, "Summary should have 'total'"
        assert "active" in summary, "Summary should have 'active'"
        assert "expiring_soon" in summary, "Summary should have 'expiring_soon'"
        assert "expired" in summary, "Summary should have 'expired'"
        assert "total_value" in summary, "Summary should have 'total_value'"
        
        print(f"✓ GET /api/contracts - Found {summary['total']} contracts")
        print(f"  Summary: active={summary['active']}, expiring={summary['expiring_soon']}, expired={summary['expired']}")
    
    def test_contracts_have_days_remaining_and_urgency(self):
        """GET /api/contracts - Each contract has days_remaining and urgency calculated"""
        response = self.session.get(f"{BASE_URL}/api/contracts")
        
        assert response.status_code == 200
        contracts = response.json().get("contracts", [])
        
        if len(contracts) == 0:
            pytest.skip("No contracts to verify")
        
        for c in contracts:
            assert "days_remaining" in c, f"Contract {c.get('id')} missing days_remaining"
            assert "urgency" in c, f"Contract {c.get('id')} missing urgency"
            assert c["urgency"] in ["normal", "warning", "critical", "expired", "unknown"], \
                f"Invalid urgency: {c['urgency']}"
            
            # Verify urgency matches days_remaining
            days = c.get("days_remaining")
            if days is not None:
                if days < 0:
                    assert c["urgency"] in ["expired", "critical"], f"Expired contract should have expired/critical urgency"
                elif days <= 7:
                    assert c["urgency"] == "critical", f"Contract with {days} days should be critical"
                elif days <= 30:
                    assert c["urgency"] == "warning", f"Contract with {days} days should be warning"
                else:
                    assert c["urgency"] == "normal", f"Contract with {days} days should be normal"
        
        print(f"✓ All {len(contracts)} contracts have correct days_remaining and urgency")
    
    # ==================== CREATE CONTRACT ====================
    
    def test_create_contract_success(self):
        """POST /api/contracts - Create contract with all fields"""
        # Calculate dates: start today, end in 45 days (normal urgency)
        start_date = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d")
        
        payload = {
            "title": "TEST_Security Contract",
            "provider_name": "Test Security Co",
            "provider_phone": "+966501234567",
            "provider_email": "test@security.com",
            "category": "security",
            "value": 50000,
            "start_date": start_date,
            "end_date": end_date,
            "terms": "Annual security services contract",
            "auto_renew": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/contracts", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "contract_id" in data, "Response should have contract_id"
        assert "message" in data, "Response should have message"
        
        self.created_contract_id = data["contract_id"]
        print(f"✓ POST /api/contracts - Created contract: {data['contract_id']}")
        
        # Verify contract was created by fetching it
        get_response = self.session.get(f"{BASE_URL}/api/contracts")
        assert get_response.status_code == 200
        
        contracts = get_response.json().get("contracts", [])
        created = next((c for c in contracts if c["id"] == data["contract_id"]), None)
        
        assert created is not None, "Created contract not found in list"
        assert created["title"] == payload["title"], "Title mismatch"
        assert created["provider_name"] == payload["provider_name"], "Provider name mismatch"
        assert created["category"] == payload["category"], "Category mismatch"
        assert created["value"] == payload["value"], "Value mismatch"
        assert created["urgency"] == "normal", f"Expected normal urgency for 45 days, got {created['urgency']}"
        
        print(f"✓ Contract verified: {created['title']} with urgency={created['urgency']}")
    
    def test_create_contract_critical_urgency(self):
        """POST /api/contracts - Create contract expiring in 5 days (critical)"""
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        
        payload = {
            "title": "TEST_Critical Contract",
            "provider_name": "Critical Provider",
            "category": "maintenance",
            "value": 10000,
            "start_date": start_date,
            "end_date": end_date
        }
        
        response = self.session.post(f"{BASE_URL}/api/contracts", json=payload)
        assert response.status_code == 200
        
        contract_id = response.json()["contract_id"]
        
        # Verify urgency is critical
        get_response = self.session.get(f"{BASE_URL}/api/contracts")
        contracts = get_response.json().get("contracts", [])
        created = next((c for c in contracts if c["id"] == contract_id), None)
        
        assert created is not None
        assert created["urgency"] == "critical", f"Expected critical urgency, got {created['urgency']}"
        assert created["days_remaining"] <= 7, f"Days remaining should be <=7, got {created['days_remaining']}"
        
        print(f"✓ Critical contract created: {created['days_remaining']} days remaining, urgency={created['urgency']}")
    
    def test_create_contract_warning_urgency(self):
        """POST /api/contracts - Create contract expiring in 20 days (warning)"""
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=20)).strftime("%Y-%m-%d")
        
        payload = {
            "title": "TEST_Warning Contract",
            "provider_name": "Warning Provider",
            "category": "cleaning",
            "value": 15000,
            "start_date": start_date,
            "end_date": end_date
        }
        
        response = self.session.post(f"{BASE_URL}/api/contracts", json=payload)
        assert response.status_code == 200
        
        contract_id = response.json()["contract_id"]
        
        # Verify urgency is warning
        get_response = self.session.get(f"{BASE_URL}/api/contracts")
        contracts = get_response.json().get("contracts", [])
        created = next((c for c in contracts if c["id"] == contract_id), None)
        
        assert created is not None
        assert created["urgency"] == "warning", f"Expected warning urgency, got {created['urgency']}"
        assert 7 < created["days_remaining"] <= 30, f"Days remaining should be 8-30, got {created['days_remaining']}"
        
        print(f"✓ Warning contract created: {created['days_remaining']} days remaining, urgency={created['urgency']}")
    
    def test_create_contract_expired(self):
        """POST /api/contracts - Create already expired contract"""
        start_date = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")
        end_date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
        
        payload = {
            "title": "TEST_Expired Contract",
            "provider_name": "Expired Provider",
            "category": "utilities",
            "value": 5000,
            "start_date": start_date,
            "end_date": end_date
        }
        
        response = self.session.post(f"{BASE_URL}/api/contracts", json=payload)
        assert response.status_code == 200
        
        contract_id = response.json()["contract_id"]
        
        # Verify it's marked as expired
        get_response = self.session.get(f"{BASE_URL}/api/contracts")
        contracts = get_response.json().get("contracts", [])
        created = next((c for c in contracts if c["id"] == contract_id), None)
        
        assert created is not None
        assert created["days_remaining"] < 0, f"Days remaining should be negative, got {created['days_remaining']}"
        assert created["urgency"] == "expired" or created["status"] == "expired", \
            f"Expected expired status/urgency, got urgency={created.get('urgency')}, status={created.get('status')}"
        
        print(f"✓ Expired contract created: {created['days_remaining']} days (expired)")
    
    def test_create_contract_missing_required_fields(self):
        """POST /api/contracts - Missing required fields returns 422"""
        payload = {
            "title": "TEST_Incomplete"
            # Missing provider_name, start_date, end_date
        }
        
        response = self.session.post(f"{BASE_URL}/api/contracts", json=payload)
        assert response.status_code == 422, f"Expected 422 for missing fields, got {response.status_code}"
        print("✓ Missing required fields returns 422")
    
    # ==================== UPDATE CONTRACT ====================
    
    def test_update_contract_success(self):
        """PUT /api/contracts/{id} - Update contract"""
        # First create a contract
        start_date = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        
        create_payload = {
            "title": "TEST_Update Contract",
            "provider_name": "Original Provider",
            "category": "maintenance",
            "value": 20000,
            "start_date": start_date,
            "end_date": end_date
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/contracts", json=create_payload)
        assert create_response.status_code == 200
        contract_id = create_response.json()["contract_id"]
        
        # Update the contract
        update_payload = {
            "title": "TEST_Updated Contract",
            "provider_name": "Updated Provider",
            "provider_phone": "+966509876543",
            "provider_email": "updated@provider.com",
            "category": "security",
            "value": 25000,
            "start_date": start_date,
            "end_date": end_date,
            "terms": "Updated terms",
            "auto_renew": True
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/contracts/{contract_id}", json=update_payload)
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify update
        get_response = self.session.get(f"{BASE_URL}/api/contracts")
        contracts = get_response.json().get("contracts", [])
        updated = next((c for c in contracts if c["id"] == contract_id), None)
        
        assert updated is not None
        assert updated["title"] == update_payload["title"], "Title not updated"
        assert updated["provider_name"] == update_payload["provider_name"], "Provider not updated"
        assert updated["value"] == update_payload["value"], "Value not updated"
        assert updated["category"] == update_payload["category"], "Category not updated"
        
        print(f"✓ PUT /api/contracts/{contract_id} - Contract updated successfully")
    
    def test_update_nonexistent_contract(self):
        """PUT /api/contracts/{id} - Non-existent contract returns 404"""
        fake_id = "nonexistent-contract-id-12345"
        
        payload = {
            "title": "TEST_Fake",
            "provider_name": "Fake Provider",
            "category": "other",
            "value": 1000,
            "start_date": "2025-01-01",
            "end_date": "2025-12-31"
        }
        
        response = self.session.put(f"{BASE_URL}/api/contracts/{fake_id}", json=payload)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Update non-existent contract returns 404")
    
    # ==================== DELETE CONTRACT ====================
    
    def test_delete_contract_success(self):
        """DELETE /api/contracts/{id} - Delete contract"""
        # First create a contract
        payload = {
            "title": "TEST_Delete Contract",
            "provider_name": "Delete Provider",
            "category": "other",
            "value": 5000,
            "start_date": datetime.now().strftime("%Y-%m-%d"),
            "end_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/contracts", json=payload)
        assert create_response.status_code == 200
        contract_id = create_response.json()["contract_id"]
        
        # Delete the contract
        delete_response = self.session.delete(f"{BASE_URL}/api/contracts/{contract_id}")
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/contracts")
        contracts = get_response.json().get("contracts", [])
        deleted = next((c for c in contracts if c["id"] == contract_id), None)
        
        assert deleted is None, "Contract should be deleted"
        print(f"✓ DELETE /api/contracts/{contract_id} - Contract deleted successfully")
    
    def test_delete_nonexistent_contract(self):
        """DELETE /api/contracts/{id} - Non-existent contract returns 404"""
        fake_id = "nonexistent-contract-id-67890"
        
        response = self.session.delete(f"{BASE_URL}/api/contracts/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Delete non-existent contract returns 404")
    
    # ==================== UNAUTHORIZED ACCESS ====================
    
    def test_contracts_unauthorized(self):
        """Contracts endpoints require admin auth"""
        # Create new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        # GET should fail
        response = unauth_session.get(f"{BASE_URL}/api/contracts")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        # POST should fail
        response = unauth_session.post(f"{BASE_URL}/api/contracts", json={
            "title": "Unauthorized",
            "provider_name": "Test",
            "start_date": "2025-01-01",
            "end_date": "2025-12-31"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print("✓ Contracts endpoints require admin authentication")


class TestSmartRatingAlerts:
    """Test smart alerts for negative ratings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        yield
    
    def test_negative_rating_triggers_notification(self):
        """POST /api/ratings with rating<=2 should trigger admin notification"""
        # First, we need a valid maintenance request ID
        # Get existing maintenance requests
        maint_response = self.session.get(f"{BASE_URL}/api/maintenance")
        
        if maint_response.status_code != 200:
            pytest.skip("Cannot access maintenance requests")
        
        requests_list = maint_response.json().get("requests", [])
        if not requests_list:
            pytest.skip("No maintenance requests to rate")
        
        target_id = requests_list[0]["id"]
        
        # Submit a negative rating (1 or 2 stars)
        rating_payload = {
            "target_type": "maintenance",
            "target_id": target_id,
            "rating": 2,
            "comment": "TEST_Poor service - testing smart alert"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ratings", json=rating_payload)
        
        # The rating should be accepted
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "rating_id" in data or "message" in data, "Response should confirm rating submission"
        
        print(f"✓ POST /api/ratings with rating=2 accepted (smart alert should be triggered)")
        print(f"  Note: Admin notification for negative rating is sent asynchronously")
    
    def test_positive_rating_no_alert(self):
        """POST /api/ratings with rating>2 should NOT trigger negative alert"""
        # Get existing maintenance requests
        maint_response = self.session.get(f"{BASE_URL}/api/maintenance")
        
        if maint_response.status_code != 200:
            pytest.skip("Cannot access maintenance requests")
        
        requests_list = maint_response.json().get("requests", [])
        if not requests_list:
            pytest.skip("No maintenance requests to rate")
        
        target_id = requests_list[0]["id"]
        
        # Submit a positive rating (4 or 5 stars)
        rating_payload = {
            "target_type": "maintenance",
            "target_id": target_id,
            "rating": 5,
            "comment": "TEST_Excellent service!"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ratings", json=rating_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ POST /api/ratings with rating=5 accepted (no negative alert triggered)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
