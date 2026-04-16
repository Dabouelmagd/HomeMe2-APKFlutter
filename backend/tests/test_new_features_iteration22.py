"""
Test new features for iteration 22:
1. PDF Export endpoint (GET /api/ads/analytics/export-pdf)
2. CTR Alert Checker (background task every 6 hours)
3. Resident Dashboard component verification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://profile-nav-debug.preview.emergentagent.com').rstrip('/')


class TestPDFExport:
    """Test PDF export functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superadmin",
            "password": "SuperAdmin2024!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_pdf_export_returns_200(self):
        """Test that PDF export endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/export-pdf",
            headers=self.headers
        )
        assert response.status_code == 200, f"PDF export failed: {response.status_code}"
    
    def test_pdf_export_returns_pdf_content_type(self):
        """Test that PDF export returns correct content type"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/export-pdf",
            headers=self.headers
        )
        assert response.status_code == 200
        content_type = response.headers.get('content-type', '')
        assert 'application/pdf' in content_type, f"Expected PDF content type, got: {content_type}"
    
    def test_pdf_export_returns_valid_pdf(self):
        """Test that PDF export returns valid PDF content"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/export-pdf",
            headers=self.headers
        )
        assert response.status_code == 200
        # PDF files start with %PDF
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF file"
    
    def test_pdf_export_has_content_disposition(self):
        """Test that PDF export has correct content disposition header"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/export-pdf",
            headers=self.headers
        )
        assert response.status_code == 200
        content_disp = response.headers.get('content-disposition', '')
        assert 'attachment' in content_disp, f"Expected attachment disposition, got: {content_disp}"
        assert 'pdf' in content_disp.lower(), f"Expected PDF filename, got: {content_disp}"
    
    def test_pdf_export_requires_auth(self):
        """Test that PDF export requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ads/analytics/export-pdf")
        assert response.status_code in [401, 403], f"Expected 401/403, got: {response.status_code}"


class TestExistingExportFeatures:
    """Test existing export features still work"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superadmin",
            "password": "SuperAdmin2024!"
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_excel_export_works(self):
        """Test Excel export still works"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/export?format=excel",
            headers=self.headers
        )
        assert response.status_code == 200
        content_type = response.headers.get('content-type', '')
        assert 'spreadsheet' in content_type or 'excel' in content_type.lower() or 'openxml' in content_type
    
    def test_csv_export_works(self):
        """Test CSV export still works"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/export?format=csv",
            headers=self.headers
        )
        assert response.status_code == 200
        content_type = response.headers.get('content-type', '')
        assert 'csv' in content_type or 'text' in content_type


class TestCompareTab:
    """Test compare tab functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superadmin",
            "password": "SuperAdmin2024!"
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_compare_default_returns_data(self):
        """Test compare endpoint with default dates"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/compare",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "period1" in data
        assert "period2" in data
        assert "changes" in data
    
    def test_compare_custom_dates(self):
        """Test compare endpoint with custom dates"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/compare",
            headers=self.headers,
            params={
                "period1_start": "2026-04-01",
                "period1_end": "2026-04-15",
                "period2_start": "2026-03-01",
                "period2_end": "2026-03-15"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period1"]["start"] == "2026-04-01"
        assert data["period1"]["end"] == "2026-04-15"


class TestRealtimeAnalytics:
    """Test realtime analytics endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superadmin",
            "password": "SuperAdmin2024!"
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_realtime_returns_data(self):
        """Test realtime analytics endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/realtime?days=30",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "live_summary" in data
        assert "daily_series" in data
        assert "hourly_today" in data
        assert "alerts" in data


class TestFinancialAnalytics:
    """Test financial analytics endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superadmin",
            "password": "SuperAdmin2024!"
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_financial_returns_data(self):
        """Test financial analytics endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/ads/analytics/financial",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "position_revenue" in data
        assert "monthly_chart" in data


class TestWeeklyReport:
    """Test weekly report functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superadmin",
            "password": "SuperAdmin2024!"
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_send_weekly_report_endpoint_exists(self):
        """Test that send weekly report endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/ads/analytics/send-weekly-report",
            headers=self.headers
        )
        # Should return 200 or 400 (if no email configured), not 404
        assert response.status_code != 404, "Weekly report endpoint not found"


class TestResidentDashboardAPI:
    """Test resident dashboard API endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superadmin",
            "password": "SuperAdmin2024!"
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_resident_dashboard_endpoint_exists(self):
        """Test that resident dashboard endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/resident",
            headers=self.headers
        )
        # Should return 200 or some data, not 404
        assert response.status_code != 404, "Resident dashboard endpoint not found"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
