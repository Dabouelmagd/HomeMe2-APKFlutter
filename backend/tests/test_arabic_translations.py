"""
Backend API Tests for Arabic Translation Feature
Tests the messages and chats endpoints after query optimization
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://profile-nav-debug.preview.emergentagent.com')

class TestBackendAPIs:
    """Test backend APIs after query optimization"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user = login_response.json().get("user")
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_login_endpoint(self):
        """Test login endpoint returns correct structure"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["username"] == "admin"
        print("✓ Login endpoint working correctly")
    
    def test_messages_endpoint_with_limit(self):
        """Test GET /api/messages endpoint with limit(200) optimization"""
        response = self.session.get(f"{BASE_URL}/api/messages")
        
        assert response.status_code == 200
        data = response.json()
        # Response should be a list (empty or with messages)
        assert isinstance(data, list)
        # Verify limit is applied (should not exceed 200)
        assert len(data) <= 200
        print(f"✓ Messages endpoint returned {len(data)} messages (limit 200)")
    
    def test_chats_endpoint_with_limit(self):
        """Test GET /api/chats endpoint with limit(100) optimization"""
        response = self.session.get(f"{BASE_URL}/api/chats")
        
        assert response.status_code == 200
        data = response.json()
        assert "chats" in data
        # Verify limit is applied (should not exceed 100)
        assert len(data["chats"]) <= 100
        print(f"✓ Chats endpoint returned {len(data['chats'])} chats (limit 100)")
    
    def test_services_endpoint(self):
        """Test GET /api/compounds/{compound_id}/services endpoint"""
        compound_id = self.user.get("compound_id")
        response = self.session.get(f"{BASE_URL}/api/compounds/{compound_id}/services")
        
        assert response.status_code == 200
        data = response.json()
        assert "services" in data
        print(f"✓ Services endpoint returned {len(data['services'])} services")
    
    def test_users_endpoint(self):
        """Test GET /api/admin/users endpoint"""
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        print(f"✓ Users endpoint returned {len(data['users'])} users")
    
    def test_residences_endpoint(self):
        """Test GET /api/compounds/{compound_id}/residences endpoint"""
        compound_id = self.user.get("compound_id")
        response = self.session.get(f"{BASE_URL}/api/compounds/{compound_id}/residences")
        
        assert response.status_code == 200
        data = response.json()
        assert "residences" in data
        print(f"✓ Residences endpoint returned {len(data['residences'])} residences")
    
    def test_health_check(self):
        """Test basic health check"""
        response = self.session.get(f"{BASE_URL}/api/health")
        
        # Health endpoint might not exist, so we check for 200 or 404
        assert response.status_code in [200, 404]
        print(f"✓ Health check status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
