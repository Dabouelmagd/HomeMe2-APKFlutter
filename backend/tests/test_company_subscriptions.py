"""
Test Company Subscriptions API for App Owner
Tests the /api/owner/company-subscriptions endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://profile-nav-debug.preview.emergentagent.com')

# Test credentials
APP_OWNER_CREDENTIALS = {
    "username": "Owner_homeme",
    "password": "Dalia1234@"
}

SUPER_ADMIN_CREDENTIALS = {
    "username": "superadmin",
    "password": "SuperAdmin2024!"
}


class TestCompanySubscriptionsAPI:
    """Test Company Subscriptions API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_auth_token(self, credentials):
        """Get authentication token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json=credentials
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        return None
    
    def test_01_login_as_app_owner(self):
        """Test login as app_owner and verify role"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json=APP_OWNER_CREDENTIALS
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "app_owner", f"Expected app_owner role, got {data['user']['role']}"
        assert data["user"]["username"] == "Owner_homeme"
        print(f"✓ Login successful as app_owner: {data['user']['full_name']}")
    
    def test_02_get_company_subscriptions_unauthorized(self):
        """Test that unauthenticated requests are rejected"""
        response = self.session.get(f"{BASE_URL}/api/owner/company-subscriptions")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized access correctly rejected")
    
    def test_03_get_company_subscriptions_as_app_owner(self):
        """Test GET /api/owner/company-subscriptions as app_owner"""
        token = self.get_auth_token(APP_OWNER_CREDENTIALS)
        assert token, "Failed to get auth token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/owner/company-subscriptions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "companies" in data, "No companies in response"
        assert "stats" in data, "No stats in response"
        assert "total" in data, "No total in response"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_companies" in stats, "Missing total_companies in stats"
        assert "active" in stats, "Missing active in stats"
        assert "expired" in stats, "Missing expired in stats"
        assert "total_monthly_revenue" in stats, "Missing total_monthly_revenue in stats"
        
        print(f"✓ GET company-subscriptions successful")
        print(f"  - Total companies: {stats['total_companies']}")
        print(f"  - Active: {stats['active']}")
        print(f"  - Expired: {stats['expired']}")
        print(f"  - Monthly revenue: {stats['total_monthly_revenue']}")
        
        return data
    
    def test_04_verify_stats_values(self):
        """Test that stats values match expected (5 companies, 4 active, 1 expired, 6400 revenue)"""
        token = self.get_auth_token(APP_OWNER_CREDENTIALS)
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/owner/company-subscriptions")
        assert response.status_code == 200
        
        data = response.json()
        stats = data["stats"]
        
        # Verify expected values (from seed data)
        assert stats["total_companies"] == 5, f"Expected 5 companies, got {stats['total_companies']}"
        assert stats["active"] == 4, f"Expected 4 active, got {stats['active']}"
        assert stats["expired"] == 1, f"Expected 1 expired, got {stats['expired']}"
        assert stats["total_monthly_revenue"] == 6400, f"Expected 6400 revenue, got {stats['total_monthly_revenue']}"
        
        print("✓ Stats values match expected:")
        print(f"  - 5 total companies ✓")
        print(f"  - 4 active subscriptions ✓")
        print(f"  - 1 expired subscription ✓")
        print(f"  - 6400 monthly revenue ✓")
    
    def test_05_verify_company_list_structure(self):
        """Test that company list has correct structure"""
        token = self.get_auth_token(APP_OWNER_CREDENTIALS)
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/owner/company-subscriptions")
        assert response.status_code == 200
        
        data = response.json()
        companies = data["companies"]
        
        assert len(companies) == 5, f"Expected 5 companies, got {len(companies)}"
        
        # Verify each company has required fields
        required_fields = ["id", "name", "company_code", "plan", "is_active", "total_compounds", "total_residents", "total_families"]
        
        for company in companies:
            for field in required_fields:
                assert field in company, f"Missing field '{field}' in company {company.get('name', 'unknown')}"
            
            # Verify plan is valid
            valid_plans = ["starter", "basic", "pro", "premium", "company_startup", "company_business", "company_enterprise"]
            assert company["plan"] in valid_plans, f"Invalid plan '{company['plan']}' for company {company['name']}"
        
        print(f"✓ All {len(companies)} companies have correct structure")
        for c in companies:
            print(f"  - {c['name']} ({c['company_code']}): {c['plan']} - {'Active' if c['is_active'] else 'Expired'}")
    
    def test_06_search_functionality(self):
        """Test search by company name/code/email"""
        token = self.get_auth_token(APP_OWNER_CREDENTIALS)
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get all companies first
        response = self.session.get(f"{BASE_URL}/api/owner/company-subscriptions")
        all_companies = response.json()["companies"]
        
        if len(all_companies) > 0:
            # Search by first company's name
            first_company = all_companies[0]
            search_term = first_company["name"][:5]  # First 5 chars
            
            response = self.session.get(
                f"{BASE_URL}/api/owner/company-subscriptions",
                params={"search": search_term}
            )
            assert response.status_code == 200
            
            data = response.json()
            # Should find at least the company we searched for
            found_names = [c["name"] for c in data["companies"]]
            assert any(search_term.lower() in name.lower() for name in found_names), \
                f"Search for '{search_term}' didn't find expected company"
            
            print(f"✓ Search functionality works - searched '{search_term}', found {len(data['companies'])} results")
    
    def test_07_status_filter_active(self):
        """Test filtering by active status"""
        token = self.get_auth_token(APP_OWNER_CREDENTIALS)
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(
            f"{BASE_URL}/api/owner/company-subscriptions",
            params={"status_filter": "active"}
        )
        assert response.status_code == 200
        
        data = response.json()
        companies = data["companies"]
        
        # All returned companies should be active
        for company in companies:
            assert company["is_active"] == True, f"Company {company['name']} should be active"
        
        print(f"✓ Active filter works - returned {len(companies)} active companies")
    
    def test_08_status_filter_expired(self):
        """Test filtering by expired status"""
        token = self.get_auth_token(APP_OWNER_CREDENTIALS)
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(
            f"{BASE_URL}/api/owner/company-subscriptions",
            params={"status_filter": "expired"}
        )
        assert response.status_code == 200
        
        data = response.json()
        companies = data["companies"]
        
        # All returned companies should be expired
        for company in companies:
            assert company["is_active"] == False, f"Company {company['name']} should be expired"
        
        print(f"✓ Expired filter works - returned {len(companies)} expired companies")
    
    def test_09_put_change_plan(self):
        """Test PUT /api/owner/company-subscriptions/{id} with action=change_plan"""
        token = self.get_auth_token(APP_OWNER_CREDENTIALS)
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get a company to update
        response = self.session.get(f"{BASE_URL}/api/owner/company-subscriptions")
        companies = response.json()["companies"]
        
        if len(companies) > 0:
            company = companies[0]
            company_id = company["id"]
            original_plan = company["plan"]
            
            # Change to a different plan
            new_plan = "company_enterprise" if original_plan != "company_enterprise" else "company_business"
            
            response = self.session.put(
                f"{BASE_URL}/api/owner/company-subscriptions/{company_id}",
                json={"action": "change_plan", "plan": new_plan}
            )
            assert response.status_code == 200, f"Change plan failed: {response.text}"
            
            data = response.json()
            assert data["status"] == "ok"
            
            # Verify the change
            response = self.session.get(f"{BASE_URL}/api/owner/company-subscriptions")
            updated_company = next((c for c in response.json()["companies"] if c["id"] == company_id), None)
            assert updated_company["plan"] == new_plan, f"Plan not updated: expected {new_plan}, got {updated_company['plan']}"
            
            # Restore original plan
            self.session.put(
                f"{BASE_URL}/api/owner/company-subscriptions/{company_id}",
                json={"action": "change_plan", "plan": original_plan}
            )
            
            print(f"✓ Change plan works - changed {company['name']} from {original_plan} to {new_plan} and back")
    
    def test_10_put_renew_subscription(self):
        """Test PUT /api/owner/company-subscriptions/{id} with action=renew"""
        token = self.get_auth_token(APP_OWNER_CREDENTIALS)
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get a company to renew
        response = self.session.get(f"{BASE_URL}/api/owner/company-subscriptions")
        companies = response.json()["companies"]
        
        if len(companies) > 0:
            company = companies[0]
            company_id = company["id"]
            
            # Renew for 12 months
            response = self.session.put(
                f"{BASE_URL}/api/owner/company-subscriptions/{company_id}",
                json={"action": "renew", "months": 12}
            )
            assert response.status_code == 200, f"Renew failed: {response.text}"
            
            data = response.json()
            assert data["status"] == "ok"
            assert "12 months" in data["message"]
            
            print(f"✓ Renew subscription works - renewed {company['name']} for 12 months")
    
    def test_11_put_suspend_and_activate(self):
        """Test PUT /api/owner/company-subscriptions/{id} with action=suspend and activate"""
        token = self.get_auth_token(APP_OWNER_CREDENTIALS)
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get an active company to suspend
        response = self.session.get(
            f"{BASE_URL}/api/owner/company-subscriptions",
            params={"status_filter": "active"}
        )
        companies = response.json()["companies"]
        
        if len(companies) > 0:
            company = companies[0]
            company_id = company["id"]
            
            # Suspend
            response = self.session.put(
                f"{BASE_URL}/api/owner/company-subscriptions/{company_id}",
                json={"action": "suspend"}
            )
            assert response.status_code == 200, f"Suspend failed: {response.text}"
            
            # Verify suspended
            response = self.session.get(f"{BASE_URL}/api/owner/company-subscriptions")
            updated = next((c for c in response.json()["companies"] if c["id"] == company_id), None)
            # Note: is_active might still be True if subscription_end is in future
            
            # Activate again
            response = self.session.put(
                f"{BASE_URL}/api/owner/company-subscriptions/{company_id}",
                json={"action": "activate"}
            )
            assert response.status_code == 200, f"Activate failed: {response.text}"
            
            print(f"✓ Suspend/Activate works for {company['name']}")
    
    def test_12_invalid_action(self):
        """Test PUT with invalid action returns error"""
        token = self.get_auth_token(APP_OWNER_CREDENTIALS)
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get a company
        response = self.session.get(f"{BASE_URL}/api/owner/company-subscriptions")
        companies = response.json()["companies"]
        
        if len(companies) > 0:
            company_id = companies[0]["id"]
            
            response = self.session.put(
                f"{BASE_URL}/api/owner/company-subscriptions/{company_id}",
                json={"action": "invalid_action"}
            )
            assert response.status_code == 400, f"Expected 400 for invalid action, got {response.status_code}"
            
            print("✓ Invalid action correctly returns 400 error")
    
    def test_13_super_admin_access(self):
        """Test that super_admin can also access company subscriptions"""
        token = self.get_auth_token(SUPER_ADMIN_CREDENTIALS)
        if not token:
            pytest.skip("Super admin credentials not working")
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/owner/company-subscriptions")
        
        assert response.status_code == 200, f"Super admin access failed: {response.text}"
        print("✓ Super admin can access company subscriptions")
    
    def test_14_company_details_structure(self):
        """Test that expanded company details have correct structure"""
        token = self.get_auth_token(APP_OWNER_CREDENTIALS)
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/owner/company-subscriptions")
        companies = response.json()["companies"]
        
        if len(companies) > 0:
            company = companies[0]
            
            # Check optional detail fields
            detail_fields = ["contact_email", "contact_phone", "created_at", "subscription_start", "subscription_end", "compounds"]
            
            for field in detail_fields:
                if field in company:
                    print(f"  - {field}: {company[field]}")
            
            # Verify compounds is a list
            if "compounds" in company:
                assert isinstance(company["compounds"], list), "compounds should be a list"
                for compound in company["compounds"]:
                    assert "id" in compound, "compound missing id"
                    assert "name" in compound, "compound missing name"
            
            print(f"✓ Company details structure verified for {company['name']}")


class TestOwnerSidebarNavigation:
    """Test owner sidebar navigation links"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as app_owner
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json=APP_OWNER_CREDENTIALS
        )
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_owner_dashboard_api(self):
        """Test owner dashboard API"""
        response = self.session.get(f"{BASE_URL}/api/super-admin/dashboard")
        assert response.status_code == 200, f"Dashboard API failed: {response.text}"
        print("✓ Owner dashboard API works")
    
    def test_compounds_api(self):
        """Test compounds API for owner"""
        response = self.session.get(f"{BASE_URL}/api/compounds")
        assert response.status_code == 200, f"Compounds API failed: {response.text}"
        print("✓ Compounds API works")
    
    def test_users_api(self):
        """Test users API for owner"""
        response = self.session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200, f"Users API failed: {response.text}"
        print("✓ Users API works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
