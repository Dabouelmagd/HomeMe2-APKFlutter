"""
Test Resident Profile API Endpoints
Tests for:
- GET /api/residents/{id}/profile - Complete resident profile with all sections
- GET /api/residents/{id}/export-pdf - PDF export functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
TEST_RESIDENT_ID = "d6012878-6794-4d9a-8196-8577da883f5d"
COMPOUND_ID = "88ad3711-c9ae-45fe-a270-65f4524c071c"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed - skipping tests")


@pytest.fixture
def auth_headers(admin_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestResidentProfileEndpoint:
    """Tests for GET /api/residents/{id}/profile endpoint"""
    
    def test_get_resident_profile_success(self, auth_headers):
        """Test successful retrieval of resident profile"""
        response = requests.get(
            f"{BASE_URL}/api/residents/{TEST_RESIDENT_ID}/profile",
            headers=auth_headers
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data structure assertions
        data = response.json()
        assert "resident" in data, "Response should contain 'resident' field"
        assert "family_members" in data, "Response should contain 'family_members' field"
        assert "extra_family_members" in data, "Response should contain 'extra_family_members' field"
        assert "maintenance_requests" in data, "Response should contain 'maintenance_requests' field"
        assert "service_bookings" in data, "Response should contain 'service_bookings' field"
        assert "invoices" in data, "Response should contain 'invoices' field"
        assert "visitors" in data, "Response should contain 'visitors' field"
        assert "activities" in data, "Response should contain 'activities' field"
        assert "summary" in data, "Response should contain 'summary' field"
        
        # Resident data assertions
        resident = data["resident"]
        assert resident["id"] == TEST_RESIDENT_ID
        assert "full_name" in resident
        assert "unit_number" in resident
        assert "email" in resident
        
        # Summary assertions
        summary = data["summary"]
        assert "total_family_members" in summary
        assert "total_maintenance" in summary
        assert "open_maintenance" in summary
        assert "total_bookings" in summary
        assert "total_invoices" in summary
        assert "total_visitors" in summary
        assert "total_activities" in summary
        
        print(f"✓ Resident profile retrieved successfully for {resident.get('full_name')}")
        print(f"  - Family members: {summary.get('total_family_members')}")
        print(f"  - Maintenance requests: {summary.get('total_maintenance')}")
        print(f"  - Activities: {summary.get('total_activities')}")
    
    def test_get_resident_profile_with_sort_desc(self, auth_headers):
        """Test profile with descending sort order (newest first)"""
        response = requests.get(
            f"{BASE_URL}/api/residents/{TEST_RESIDENT_ID}/profile?sort_order=desc",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "resident" in data
        print("✓ Profile with sort_order=desc works correctly")
    
    def test_get_resident_profile_with_sort_asc(self, auth_headers):
        """Test profile with ascending sort order (oldest first)"""
        response = requests.get(
            f"{BASE_URL}/api/residents/{TEST_RESIDENT_ID}/profile?sort_order=asc",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "resident" in data
        print("✓ Profile with sort_order=asc works correctly")
    
    def test_get_resident_profile_not_found(self, auth_headers):
        """Test 404 for non-existent resident"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(
            f"{BASE_URL}/api/residents/{fake_id}/profile",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent resident returns 404 correctly")
    
    def test_get_resident_profile_unauthorized(self):
        """Test 401/403 for unauthenticated request"""
        response = requests.get(
            f"{BASE_URL}/api/residents/{TEST_RESIDENT_ID}/profile"
        )
        
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
        print(f"✓ Unauthenticated request returns {response.status_code} correctly")


class TestResidentPDFExport:
    """Tests for GET /api/residents/{id}/export-pdf endpoint"""
    
    def test_export_pdf_success(self, auth_headers):
        """Test successful PDF export"""
        response = requests.get(
            f"{BASE_URL}/api/residents/{TEST_RESIDENT_ID}/export-pdf",
            headers=auth_headers
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Content type assertion
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got {content_type}"
        
        # Content disposition assertion
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition, "Should have attachment disposition"
        assert ".pdf" in content_disposition, "Filename should have .pdf extension"
        
        # PDF content assertion
        content = response.content
        assert len(content) > 0, "PDF content should not be empty"
        assert content[:4] == b'%PDF', "Content should start with PDF magic bytes"
        
        print(f"✓ PDF exported successfully, size: {len(content)} bytes")
    
    def test_export_pdf_not_found(self, auth_headers):
        """Test 404 for non-existent resident PDF export"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(
            f"{BASE_URL}/api/residents/{fake_id}/export-pdf",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent resident PDF export returns 404 correctly")
    
    def test_export_pdf_unauthorized(self):
        """Test 401/403 for unauthenticated PDF export request"""
        response = requests.get(
            f"{BASE_URL}/api/residents/{TEST_RESIDENT_ID}/export-pdf"
        )
        
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
        print(f"✓ Unauthenticated PDF export request returns {response.status_code} correctly")


class TestResidentProfileDataIntegrity:
    """Tests for data integrity in resident profile"""
    
    def test_family_members_count_matches_summary(self, auth_headers):
        """Verify family members count matches summary"""
        response = requests.get(
            f"{BASE_URL}/api/residents/{TEST_RESIDENT_ID}/profile",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        family_members = data.get("family_members", [])
        extra_family_members = data.get("extra_family_members", [])
        total_in_lists = len(family_members) + len(extra_family_members)
        summary_count = data.get("summary", {}).get("total_family_members", 0)
        
        assert total_in_lists == summary_count, \
            f"Family members count mismatch: lists={total_in_lists}, summary={summary_count}"
        print(f"✓ Family members count matches: {summary_count}")
    
    def test_maintenance_count_matches_summary(self, auth_headers):
        """Verify maintenance requests count matches summary"""
        response = requests.get(
            f"{BASE_URL}/api/residents/{TEST_RESIDENT_ID}/profile",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        maintenance = data.get("maintenance_requests", [])
        summary_count = data.get("summary", {}).get("total_maintenance", 0)
        
        assert len(maintenance) == summary_count, \
            f"Maintenance count mismatch: list={len(maintenance)}, summary={summary_count}"
        print(f"✓ Maintenance requests count matches: {summary_count}")
    
    def test_resident_has_required_fields(self, auth_headers):
        """Verify resident object has all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/residents/{TEST_RESIDENT_ID}/profile",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        resident = response.json().get("resident", {})
        
        required_fields = ["id", "full_name", "username", "email", "role", "unit_number", "compound_id"]
        for field in required_fields:
            assert field in resident, f"Missing required field: {field}"
        
        # Verify password is not exposed
        assert "password_hash" not in resident, "Password hash should not be exposed"
        
        print(f"✓ Resident has all required fields and password is not exposed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
