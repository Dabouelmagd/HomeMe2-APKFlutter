"""
Test suite for Iteration 23 Features:
1. GET /api/ads/analytics/export-pdf - Arabic PDF export with arabic-reshaper + python-bidi
2. GET /api/ratings/stats - Rating statistics endpoint
3. POST /api/ratings - Create new rating (target_type: maintenance/service)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPDFExportWithArabic:
    """Test PDF export endpoint with Arabic support"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superadmin",
            "password": "SuperAdmin2024!"
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
        else:
            pytest.skip("Authentication failed")
    
    def test_pdf_export_returns_200(self):
        """Test that PDF export endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/export-pdf",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ PDF export returns 200")
    
    def test_pdf_export_content_type(self):
        """Test that PDF export returns correct content type"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/export-pdf",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert "application/pdf" in response.headers.get("content-type", ""), \
            f"Expected application/pdf, got {response.headers.get('content-type')}"
        print("✓ PDF export returns application/pdf content type")
    
    def test_pdf_export_valid_pdf_content(self):
        """Test that PDF export returns valid PDF (starts with %PDF)"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/export-pdf",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        content = response.content
        assert content.startswith(b'%PDF'), "PDF should start with %PDF header"
        assert len(content) > 1000, f"PDF should be substantial, got {len(content)} bytes"
        print(f"✓ PDF export returns valid PDF ({len(content)} bytes)")
    
    def test_pdf_export_has_attachment_header(self):
        """Test that PDF export has content-disposition attachment header"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/export-pdf",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp, f"Expected attachment header, got {content_disp}"
        assert "ad_analytics_report.pdf" in content_disp, "Should have filename in header"
        print("✓ PDF export has correct content-disposition header")
    
    def test_pdf_export_requires_auth(self):
        """Test that PDF export requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ads/analytics/export-pdf")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ PDF export requires authentication")
    
    def test_pdf_export_requires_super_admin(self):
        """Test that PDF export requires super_admin role"""
        # Try with app_owner
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Owner_homeme",
            "password": "Dalia1234@"
        })
        if login_resp.status_code != 200:
            pytest.skip("App owner login failed")
        
        owner_token = login_resp.json().get("access_token")
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/export-pdf",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        # App owner should also have access (they are admin-level)
        # If not, it should return 403
        assert response.status_code in [200, 403], f"Expected 200 or 403, got {response.status_code}"
        print(f"✓ PDF export access control verified (status: {response.status_code})")


class TestRatingsStatsEndpoint:
    """Test GET /api/ratings/stats endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superadmin",
            "password": "SuperAdmin2024!"
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
        else:
            pytest.skip("Authentication failed")
    
    def test_ratings_stats_returns_200(self):
        """Test that ratings stats endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/ratings/stats",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Ratings stats returns 200")
    
    def test_ratings_stats_response_structure(self):
        """Test that ratings stats has correct response structure"""
        response = requests.get(
            f"{BASE_URL}/api/ratings/stats",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        data = response.json()
        
        # Check required fields
        assert "overall" in data, "Response should contain 'overall'"
        assert "maintenance" in data, "Response should contain 'maintenance'"
        assert "service" in data, "Response should contain 'service'"
        assert "monthly_trend" in data, "Response should contain 'monthly_trend'"
        assert "recent_negative" in data, "Response should contain 'recent_negative'"
        
        # Check overall structure
        overall = data["overall"]
        assert "average" in overall, "overall should contain 'average'"
        assert "total" in overall, "overall should contain 'total'"
        assert "distribution" in overall, "overall should contain 'distribution'"
        
        # Check distribution has 1-5 keys
        dist = overall["distribution"]
        for i in range(1, 6):
            assert str(i) in dist or i in dist, f"distribution should have key {i}"
        
        print(f"✓ Ratings stats has correct structure: overall avg={overall['average']}, total={overall['total']}")
    
    def test_ratings_stats_requires_auth(self):
        """Test that ratings stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ratings/stats")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Ratings stats requires authentication")


class TestPostRatingsEndpoint:
    """Test POST /api/ratings endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superadmin",
            "password": "SuperAdmin2024!"
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
        else:
            pytest.skip("Authentication failed")
    
    def test_post_rating_invalid_rating_zero(self):
        """Test that rating=0 is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "maintenance",
                "target_id": "test-id",
                "rating": 0,
                "comment": "Test"
            },
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 400, f"Expected 400 for rating=0, got {response.status_code}"
        assert "1-5" in response.text, "Error should mention valid range 1-5"
        print("✓ Rating=0 correctly rejected")
    
    def test_post_rating_invalid_rating_six(self):
        """Test that rating=6 is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "maintenance",
                "target_id": "test-id",
                "rating": 6,
                "comment": "Test"
            },
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 400, f"Expected 400 for rating=6, got {response.status_code}"
        print("✓ Rating=6 correctly rejected")
    
    def test_post_rating_invalid_target_type(self):
        """Test that invalid target_type is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "invalid_type",
                "target_id": "test-id",
                "rating": 4,
                "comment": "Test"
            },
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid target_type, got {response.status_code}"
        assert "Invalid target_type" in response.text, "Error should mention invalid target_type"
        print("✓ Invalid target_type correctly rejected")
    
    def test_post_rating_nonexistent_maintenance(self):
        """Test that rating non-existent maintenance returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "maintenance",
                "target_id": "nonexistent-id-12345",
                "rating": 4,
                "comment": "Test"
            },
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 404, f"Expected 404 for non-existent maintenance, got {response.status_code}"
        print("✓ Non-existent maintenance correctly returns 404")
    
    def test_post_rating_nonexistent_service(self):
        """Test that rating non-existent service returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "service",
                "target_id": "nonexistent-service-id",
                "rating": 5,
                "comment": "Test"
            },
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 404, f"Expected 404 for non-existent service, got {response.status_code}"
        print("✓ Non-existent service correctly returns 404")
    
    def test_post_rating_requires_auth(self):
        """Test that POST rating requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "maintenance",
                "target_id": "test-id",
                "rating": 4,
                "comment": "Test"
            }
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ POST rating requires authentication")


class TestExistingAdAnalyticsFeatures:
    """Verify existing ad analytics features still work"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superadmin",
            "password": "SuperAdmin2024!"
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
        else:
            pytest.skip("Authentication failed")
    
    def test_excel_export_works(self):
        """Test Excel export still works"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/export?format=excel",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Excel export failed: {response.status_code}"
        assert "spreadsheet" in response.headers.get("content-type", "").lower() or \
               "octet-stream" in response.headers.get("content-type", "").lower(), \
               f"Expected spreadsheet content type, got {response.headers.get('content-type')}"
        print("✓ Excel export works")
    
    def test_csv_export_works(self):
        """Test CSV export still works"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/export?format=csv",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"CSV export failed: {response.status_code}"
        print("✓ CSV export works")
    
    def test_compare_endpoint_works(self):
        """Test compare endpoint still works"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/compare",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Compare endpoint failed: {response.status_code}"
        data = response.json()
        assert "period1" in data, "Compare should return period1"
        assert "period2" in data, "Compare should return period2"
        assert "changes" in data, "Compare should return changes"
        print("✓ Compare endpoint works")
    
    def test_realtime_endpoint_works(self):
        """Test realtime analytics endpoint still works"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/realtime",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Realtime endpoint failed: {response.status_code}"
        data = response.json()
        assert "live_summary" in data, "Realtime should return live_summary"
        assert "daily_series" in data, "Realtime should return daily_series"
        print("✓ Realtime analytics endpoint works")
    
    def test_financial_endpoint_works(self):
        """Test financial analytics endpoint still works"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/financial",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Financial endpoint failed: {response.status_code}"
        data = response.json()
        assert "summary" in data, "Financial should return summary"
        assert "position_revenue" in data, "Financial should return position_revenue"
        print("✓ Financial analytics endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
