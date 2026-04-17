"""
Iteration 24 Tests: Customer Satisfaction Dashboard & Super Admin Role Restriction
- GET /api/ratings/stats endpoint
- Login and role verification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_CREDS = {"username": "superadmin", "password": "SuperAdmin2024!"}
OWNER_CREDS = {"username": "Owner_homeme", "password": "Dalia1234@"}


class TestAuthentication:
    """Authentication and role tests"""
    
    def test_super_admin_login(self):
        """Test Super Admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert response.status_code == 200, f"Super Admin login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "super_admin", f"Expected super_admin role, got {data['user']['role']}"
        print(f"Super Admin login successful: {data['user']['username']}")
    
    def test_owner_login(self):
        """Test App Owner can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=OWNER_CREDS)
        assert response.status_code == 200, f"Owner login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "app_owner", f"Expected app_owner role, got {data['user']['role']}"
        print(f"Owner login successful: {data['user']['username']}")


class TestRatingsStats:
    """Tests for GET /api/ratings/stats endpoint"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get Super Admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Super Admin authentication failed")
    
    @pytest.fixture
    def owner_token(self):
        """Get Owner auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=OWNER_CREDS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Owner authentication failed")
    
    def test_ratings_stats_returns_200(self, super_admin_token):
        """Test ratings stats endpoint returns 200"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/ratings/stats", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("GET /api/ratings/stats returned 200")
    
    def test_ratings_stats_structure(self, super_admin_token):
        """Test ratings stats response has correct structure"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/ratings/stats", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Check top-level keys
        required_keys = ["overall", "maintenance", "service", "monthly_trend", "recent_negative"]
        for key in required_keys:
            assert key in data, f"Missing key: {key}"
        
        # Check overall structure
        assert "average" in data["overall"], "Missing overall.average"
        assert "total" in data["overall"], "Missing overall.total"
        assert "distribution" in data["overall"], "Missing overall.distribution"
        
        # Check distribution has 1-5 star keys
        dist = data["overall"]["distribution"]
        for star in ["1", "2", "3", "4", "5"]:
            assert star in dist, f"Missing distribution key: {star}"
        
        # Check maintenance structure
        assert "average" in data["maintenance"], "Missing maintenance.average"
        assert "total" in data["maintenance"], "Missing maintenance.total"
        
        # Check service structure
        assert "average" in data["service"], "Missing service.average"
        assert "total" in data["service"], "Missing service.total"
        
        # Check monthly_trend is a list
        assert isinstance(data["monthly_trend"], list), "monthly_trend should be a list"
        
        # Check recent_negative is a list
        assert isinstance(data["recent_negative"], list), "recent_negative should be a list"
        
        print("Ratings stats structure verified successfully")
    
    def test_ratings_stats_owner_access(self, owner_token):
        """Test Owner can also access ratings stats"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = requests.get(f"{BASE_URL}/api/ratings/stats", headers=headers)
        assert response.status_code == 200, f"Owner should have access to ratings stats: {response.text}"
        print("Owner can access ratings stats")
    
    def test_ratings_stats_requires_auth(self):
        """Test ratings stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ratings/stats")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("Ratings stats correctly requires authentication")


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
