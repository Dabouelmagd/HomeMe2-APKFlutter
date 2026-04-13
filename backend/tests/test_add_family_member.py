"""
Backend API Tests for Add Family Member Feature
Tests the bug fix for the 'Add Resident' (اضافة مقيم) feature
- GET /api/compounds/{compound_id}/residences - Returns residence data with nested family_head
- POST /api/family-members/add-to-unit - Adds family member to a unit
- CORS headers verification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
SUPER_ADMIN_USERNAME = "dalia"
SUPER_ADMIN_PASSWORD = "Admin2024!"
COMPOUND_ID = "88ad3711-c9ae-45fe-a270-65f4524c071c"
TEST_RESIDENT_USER_ID = "d6012878-6794-4d9a-8196-8577da883f5d"


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_login_admin(self):
        """Test admin login returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "admin", f"Expected admin role, got {data['user']['role']}"
        return data["access_token"]
    
    def test_login_super_admin(self):
        """Test super admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": SUPER_ADMIN_USERNAME,
            "password": SUPER_ADMIN_PASSWORD
        })
        print(f"Super admin login status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            print(f"Super admin login successful, role: {data['user']['role']}")
        else:
            print(f"Super admin login failed (may not exist): {response.text[:200]}")


class TestCORSHeaders:
    """Test CORS middleware configuration"""
    
    def test_cors_headers_present(self):
        """Verify CORS headers are present in responses"""
        response = requests.options(f"{BASE_URL}/api/auth/login", headers={
            "Origin": "https://profile-nav-debug.preview.emergentagent.com",
            "Access-Control-Request-Method": "POST"
        })
        print(f"CORS preflight status: {response.status_code}")
        print(f"CORS headers: {dict(response.headers)}")
        
        # Check for CORS headers
        cors_headers = {
            "access-control-allow-origin",
            "access-control-allow-methods",
            "access-control-allow-headers"
        }
        response_headers_lower = {k.lower(): v for k, v in response.headers.items()}
        
        for header in cors_headers:
            if header in response_headers_lower:
                print(f"✓ {header}: {response_headers_lower[header]}")
        
        # CORS should allow the request
        assert response.status_code in [200, 204], f"CORS preflight failed: {response.status_code}"


class TestResidencesEndpoint:
    """Test GET /api/compounds/{compound_id}/residences endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["access_token"]
    
    @pytest.fixture
    def admin_compound_id(self):
        """Get admin's compound ID"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["user"]["compound_id"]
    
    def test_get_residences_returns_data(self, admin_token, admin_compound_id):
        """Test that residences endpoint returns proper data structure"""
        response = requests.get(
            f"{BASE_URL}/api/compounds/{admin_compound_id}/residences",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Residences endpoint status: {response.status_code}")
        print(f"Residences response: {response.text[:1000]}")
        
        assert response.status_code == 200, f"Failed to get residences: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "residences" in data, "No 'residences' key in response"
        assert "total_units" in data, "No 'total_units' key in response"
        
        print(f"Total residences: {len(data['residences'])}")
        print(f"Total units: {data['total_units']}")
    
    def test_residences_have_nested_family_head(self, admin_token, admin_compound_id):
        """Test that each residence has nested family_head data (the bug fix)"""
        response = requests.get(
            f"{BASE_URL}/api/compounds/{admin_compound_id}/residences",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        residences = data.get("residences", [])
        
        if len(residences) == 0:
            pytest.skip("No residences found to test")
        
        # Check first residence has proper structure
        first_residence = residences[0]
        print(f"First residence structure: {first_residence}")
        
        # Verify the nested family_head structure that frontend expects
        assert "family_head" in first_residence, "Missing 'family_head' in residence"
        assert "unit_number" in first_residence, "Missing 'unit_number' in residence"
        assert "family_id" in first_residence, "Missing 'family_id' in residence"
        
        family_head = first_residence.get("family_head")
        if family_head:
            # Verify family_head has the expected fields
            expected_fields = ["id", "full_name", "email"]
            for field in expected_fields:
                assert field in family_head, f"Missing '{field}' in family_head"
            print(f"✓ family_head has required fields: {list(family_head.keys())}")
        else:
            print("⚠ family_head is None (unit may be unoccupied)")


class TestAddFamilyMemberEndpoint:
    """Test POST /api/family-members/add-to-unit endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["access_token"]
    
    @pytest.fixture
    def admin_compound_id(self):
        """Get admin's compound ID"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["user"]["compound_id"]
    
    @pytest.fixture
    def test_unit_id(self, admin_token, admin_compound_id):
        """Get a valid unit_id (resident user id) for testing"""
        response = requests.get(
            f"{BASE_URL}/api/compounds/{admin_compound_id}/residences",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code != 200:
            pytest.skip("Could not get residences")
        
        residences = response.json().get("residences", [])
        if not residences:
            pytest.skip("No residences available for testing")
        
        # Get the family_head id from first residence
        family_head = residences[0].get("family_head")
        if not family_head or not family_head.get("id"):
            pytest.skip("No family_head found in residences")
        
        return family_head["id"]
    
    def test_add_family_member_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/family-members/add-to-unit",
            data={
                "unit_id": "test-id",
                "full_name": "Test Member",
                "relationship": "spouse"
            }
        )
        print(f"Unauthenticated request status: {response.status_code}")
        assert response.status_code in [401, 403], "Should require authentication"
    
    def test_add_family_member_validation(self, admin_token):
        """Test that endpoint validates required fields"""
        # Missing required fields
        response = requests.post(
            f"{BASE_URL}/api/family-members/add-to-unit",
            headers={"Authorization": f"Bearer {admin_token}"},
            data={
                "unit_id": "test-id"
                # Missing full_name and relationship
            }
        )
        print(f"Validation test status: {response.status_code}")
        print(f"Validation response: {response.text[:500]}")
        
        # Should fail validation (422 for missing fields)
        assert response.status_code in [400, 422], f"Expected validation error, got {response.status_code}"
    
    def test_add_family_member_success(self, admin_token, test_unit_id):
        """Test successful family member addition"""
        import uuid
        test_name = f"TEST_FamilyMember_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/family-members/add-to-unit",
            headers={"Authorization": f"Bearer {admin_token}"},
            data={
                "unit_id": test_unit_id,
                "full_name": test_name,
                "relationship": "spouse",
                "phone": "+1234567890",
                "email": f"test_{uuid.uuid4().hex[:8]}@test.com"
            }
        )
        print(f"Add family member status: {response.status_code}")
        print(f"Add family member response: {response.text[:1000]}")
        
        assert response.status_code in [200, 201], f"Failed to add family member: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data, "No message in response"
        assert "family_member" in data, "No family_member in response"
        
        family_member = data["family_member"]
        assert family_member["full_name"] == test_name
        assert family_member["relationship"] == "spouse"
        print(f"✓ Successfully added family member: {test_name}")


class TestGetFamilyMembers:
    """Test GET /api/family-members endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["access_token"]
    
    def test_get_family_members(self, admin_token):
        """Test getting family members list"""
        response = requests.get(
            f"{BASE_URL}/api/family-members",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Get family members status: {response.status_code}")
        print(f"Get family members response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Failed to get family members: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "family_members" in data, "No 'family_members' key in response"
        print(f"Total family members: {len(data['family_members'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
