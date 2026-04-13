"""
Test suite for refactored route modules in HomeMe backend.
Tests all endpoints from the 8 extracted route modules:
- finance.py: Financial management (balance-sheet, obligations, unit-charges)
- ratings.py: Rating statistics
- contracts.py: Contract management
- complaints.py: Complaints and suggestions
- superadmin.py: Super admin dashboard and user management
- exports.py: Excel export
- facilities.py: Facility management
- monitoring.py: Health check and monitoring stats
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_CREDS = {"username": "admin", "password": "admin123"}
SUPERADMIN_CREDS = {"username": "superadmin", "password": "SuperAdmin2024!"}
RESIDENT_CREDS = {"username": "resident1", "password": "resident123"}


class TestAuthentication:
    """Test login functionality for different user roles"""
    
    def test_admin_login(self):
        """Test admin login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data.get("user", {}).get("role") in ["admin", "super_admin", "company_admin"], f"Unexpected role: {data.get('user', {}).get('role')}"
        print(f"✓ Admin login successful, role: {data.get('user', {}).get('role')}")
    
    def test_superadmin_login(self):
        """Test super admin login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPERADMIN_CREDS)
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data.get("user", {}).get("role") == "super_admin", f"Expected super_admin role, got: {data.get('user', {}).get('role')}"
        print(f"✓ Super admin login successful")


class TestHealthAndMonitoring:
    """Test health check and monitoring endpoints from monitoring.py"""
    
    def test_health_check(self):
        """GET /api/health - No auth required"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert "status" in data, "No status in health response"
        print(f"✓ Health check passed: {data.get('status')}")
    
    def test_monitoring_stats_admin(self):
        """GET /api/monitoring/stats - Admin only"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("access_token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/monitoring/stats", headers=headers)
        assert response.status_code == 200, f"Monitoring stats failed: {response.text}"
        data = response.json()
        # Should have system stats
        print(f"✓ Monitoring stats returned successfully")


class TestFinancialRoutes:
    """Test financial endpoints from finance.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if login_resp.status_code == 200:
            self.token = login_resp.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate as admin")
    
    def test_balance_sheet(self):
        """GET /api/financial/balance-sheet - Returns revenue, expenses, net_balance"""
        response = requests.get(f"{BASE_URL}/api/financial/balance-sheet", headers=self.headers)
        assert response.status_code == 200, f"Balance sheet failed: {response.text}"
        data = response.json()
        
        # Verify required fields
        assert "total_revenue" in data, "Missing total_revenue"
        assert "total_expenses" in data, "Missing total_expenses"
        assert "net_balance" in data, "Missing net_balance"
        
        # Verify data types
        assert isinstance(data["total_revenue"], (int, float)), "total_revenue should be numeric"
        assert isinstance(data["total_expenses"], (int, float)), "total_expenses should be numeric"
        assert isinstance(data["net_balance"], (int, float)), "net_balance should be numeric"
        
        print(f"✓ Balance sheet: revenue={data['total_revenue']}, expenses={data['total_expenses']}, net={data['net_balance']}")
    
    def test_obligations(self):
        """GET /api/financial/obligations - Returns obligations list"""
        response = requests.get(f"{BASE_URL}/api/financial/obligations", headers=self.headers)
        assert response.status_code == 200, f"Obligations failed: {response.text}"
        data = response.json()
        
        assert "obligations" in data, "Missing obligations key"
        assert isinstance(data["obligations"], list), "obligations should be a list"
        print(f"✓ Obligations returned: {len(data['obligations'])} items")
    
    def test_unit_charges(self):
        """GET /api/financial/unit-charges - Returns charges with summary"""
        response = requests.get(f"{BASE_URL}/api/financial/unit-charges", headers=self.headers)
        assert response.status_code == 200, f"Unit charges failed: {response.text}"
        data = response.json()
        
        assert "charges" in data, "Missing charges key"
        assert "summary" in data, "Missing summary key"
        assert isinstance(data["charges"], list), "charges should be a list"
        
        # Verify summary structure
        summary = data["summary"]
        assert "total" in summary, "Missing total in summary"
        assert "paid" in summary, "Missing paid in summary"
        assert "unpaid" in summary, "Missing unpaid in summary"
        
        print(f"✓ Unit charges: {summary.get('total')} total, {summary.get('paid')} paid, {summary.get('unpaid')} unpaid")


class TestRatingsRoutes:
    """Test ratings endpoints from ratings.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if login_resp.status_code == 200:
            self.token = login_resp.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate as admin")
    
    def test_rating_stats(self):
        """GET /api/ratings/stats - Returns rating statistics"""
        response = requests.get(f"{BASE_URL}/api/ratings/stats", headers=self.headers)
        assert response.status_code == 200, f"Rating stats failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "overall" in data, "Missing overall stats"
        assert "maintenance" in data, "Missing maintenance stats"
        assert "service" in data, "Missing service stats"
        
        print(f"✓ Rating stats: overall avg={data.get('overall', {}).get('average', 0)}")


class TestContractsRoutes:
    """Test contracts endpoints from contracts.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if login_resp.status_code == 200:
            self.token = login_resp.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate as admin")
    
    def test_get_contracts(self):
        """GET /api/contracts - Returns contracts with summary"""
        response = requests.get(f"{BASE_URL}/api/contracts", headers=self.headers)
        assert response.status_code == 200, f"Contracts failed: {response.text}"
        data = response.json()
        
        assert "contracts" in data, "Missing contracts key"
        assert "summary" in data, "Missing summary key"
        assert isinstance(data["contracts"], list), "contracts should be a list"
        
        # Verify summary structure
        summary = data["summary"]
        assert "total" in summary, "Missing total in summary"
        assert "active" in summary, "Missing active in summary"
        
        print(f"✓ Contracts: {summary.get('total')} total, {summary.get('active')} active")


class TestComplaintsRoutes:
    """Test complaints endpoints from complaints.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if login_resp.status_code == 200:
            self.token = login_resp.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate as admin")
    
    def test_get_complaints(self):
        """GET /api/complaints - Returns complaints with summary"""
        response = requests.get(f"{BASE_URL}/api/complaints", headers=self.headers)
        assert response.status_code == 200, f"Complaints failed: {response.text}"
        data = response.json()
        
        assert "complaints" in data, "Missing complaints key"
        assert "summary" in data, "Missing summary key"
        assert isinstance(data["complaints"], list), "complaints should be a list"
        
        # Verify summary structure
        summary = data["summary"]
        assert "total" in summary, "Missing total in summary"
        assert "open" in summary, "Missing open in summary"
        
        print(f"✓ Complaints: {summary.get('total')} total, {summary.get('open')} open")


class TestSuperAdminRoutes:
    """Test super admin endpoints from superadmin.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get super admin token for authenticated requests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=SUPERADMIN_CREDS)
        if login_resp.status_code == 200:
            self.token = login_resp.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate as super admin")
    
    def test_super_admin_dashboard(self):
        """GET /api/super-admin/dashboard - Returns stats (compounds, users, revenue)"""
        response = requests.get(f"{BASE_URL}/api/super-admin/dashboard", headers=self.headers)
        assert response.status_code == 200, f"Super admin dashboard failed: {response.text}"
        data = response.json()
        
        assert "stats" in data, "Missing stats key"
        stats = data["stats"]
        
        # Verify required stats
        assert "total_compounds" in stats, "Missing total_compounds"
        assert "total_users" in stats, "Missing total_users"
        assert "total_revenue" in stats, "Missing total_revenue"
        
        print(f"✓ Super admin dashboard: {stats.get('total_compounds')} compounds, {stats.get('total_users')} users, revenue={stats.get('total_revenue')}")
    
    def test_super_admin_users(self):
        """GET /api/super-admin/users - Returns user list"""
        response = requests.get(f"{BASE_URL}/api/super-admin/users", headers=self.headers)
        assert response.status_code == 200, f"Super admin users failed: {response.text}"
        data = response.json()
        
        assert "users" in data, "Missing users key"
        assert isinstance(data["users"], list), "users should be a list"
        
        print(f"✓ Super admin users: {len(data['users'])} users returned")


class TestFacilitiesRoutes:
    """Test facilities endpoints from facilities.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if login_resp.status_code == 200:
            self.token = login_resp.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate as admin")
    
    def test_get_facilities(self):
        """GET /api/facilities - Returns facilities list"""
        response = requests.get(f"{BASE_URL}/api/facilities", headers=self.headers)
        assert response.status_code == 200, f"Facilities failed: {response.text}"
        data = response.json()
        
        assert "facilities" in data, "Missing facilities key"
        assert isinstance(data["facilities"], list), "facilities should be a list"
        
        print(f"✓ Facilities: {len(data['facilities'])} facilities returned")


class TestExportsRoutes:
    """Test export endpoints from exports.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if login_resp.status_code == 200:
            self.token = login_resp.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate as admin")
    
    def test_export_excel(self):
        """GET /api/financial/export-excel - Returns 200 with excel content"""
        response = requests.get(f"{BASE_URL}/api/financial/export-excel", headers=self.headers)
        assert response.status_code == 200, f"Export excel failed: {response.text}"
        
        # Verify content type is Excel
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "excel" in content_type.lower() or "octet-stream" in content_type, f"Unexpected content type: {content_type}"
        
        # Verify we got some content
        assert len(response.content) > 0, "Empty excel file returned"
        
        print(f"✓ Export excel: {len(response.content)} bytes returned")


class TestAdminRoleChange:
    """Test admin role change endpoint from superadmin.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if login_resp.status_code == 200:
            self.token = login_resp.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
            self.user_data = login_resp.json().get("user", {})
        else:
            pytest.skip("Could not authenticate as admin")
    
    def test_admin_role_change_invalid_role(self):
        """PUT /api/admin/users/{user_id}/role - Invalid role returns 400"""
        # Try to change to an invalid role
        test_user_id = "d6012878-6794-4d9a-8196-8577da883f5d"  # Test resident from credentials
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{test_user_id}/role",
            params={"role": "super_admin"},  # Admin can't assign super_admin
            headers=self.headers
        )
        # Should fail because admin can only assign manager, security, resident
        assert response.status_code == 400, f"Expected 400 for invalid role, got {response.status_code}: {response.text}"
        print(f"✓ Admin role change correctly rejects invalid role")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
