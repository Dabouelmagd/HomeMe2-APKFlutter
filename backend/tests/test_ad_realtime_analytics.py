"""
Test Ad Realtime Analytics and Financial Endpoints
Tests the new /api/ads/analytics/realtime and /api/ads/analytics/financial endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdRealtimeAnalytics:
    """Tests for GET /api/ads/analytics/realtime endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as app_owner"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as app_owner
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Owner_homeme",
            "password": "Dalia1234@"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_realtime_analytics_returns_200(self):
        """Test that realtime analytics endpoint returns 200"""
        response = self.session.get(f"{BASE_URL}/api/ads/analytics/realtime?days=30")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_realtime_analytics_has_live_summary(self):
        """Test that response contains live_summary with required fields"""
        response = self.session.get(f"{BASE_URL}/api/ads/analytics/realtime?days=30")
        data = response.json()
        
        assert "live_summary" in data, "Response missing live_summary"
        ls = data["live_summary"]
        
        # Check required fields
        required_fields = ["total_ads", "active_ads", "total_views", "total_clicks", 
                          "today_clicks", "avg_ctr", "total_events_period", "last_updated"]
        for field in required_fields:
            assert field in ls, f"live_summary missing field: {field}"
    
    def test_realtime_analytics_has_daily_series(self):
        """Test that response contains daily_series array"""
        response = self.session.get(f"{BASE_URL}/api/ads/analytics/realtime?days=30")
        data = response.json()
        
        assert "daily_series" in data, "Response missing daily_series"
        assert isinstance(data["daily_series"], list), "daily_series should be a list"
        assert len(data["daily_series"]) <= 30, "daily_series should have at most 30 entries"
        
        if len(data["daily_series"]) > 0:
            entry = data["daily_series"][0]
            assert "date" in entry, "daily_series entry missing date"
            assert "clicks" in entry, "daily_series entry missing clicks"
            assert "views" in entry, "daily_series entry missing views"
            assert "ctr" in entry, "daily_series entry missing ctr"
    
    def test_realtime_analytics_has_hourly_today(self):
        """Test that response contains hourly_today array with 24 hours"""
        response = self.session.get(f"{BASE_URL}/api/ads/analytics/realtime?days=30")
        data = response.json()
        
        assert "hourly_today" in data, "Response missing hourly_today"
        assert isinstance(data["hourly_today"], list), "hourly_today should be a list"
        assert len(data["hourly_today"]) == 24, f"hourly_today should have 24 entries, got {len(data['hourly_today'])}"
        
        if len(data["hourly_today"]) > 0:
            entry = data["hourly_today"][0]
            assert "hour" in entry, "hourly_today entry missing hour"
            assert "clicks" in entry, "hourly_today entry missing clicks"
    
    def test_realtime_analytics_has_alerts(self):
        """Test that response contains alerts array"""
        response = self.session.get(f"{BASE_URL}/api/ads/analytics/realtime?days=30")
        data = response.json()
        
        assert "alerts" in data, "Response missing alerts"
        assert isinstance(data["alerts"], list), "alerts should be a list"
    
    def test_realtime_analytics_has_alert_counts(self):
        """Test that response contains alert_counts with required fields"""
        response = self.session.get(f"{BASE_URL}/api/ads/analytics/realtime?days=30")
        data = response.json()
        
        assert "alert_counts" in data, "Response missing alert_counts"
        ac = data["alert_counts"]
        
        required_fields = ["high_ctr", "good_ctr", "no_clicks"]
        for field in required_fields:
            assert field in ac, f"alert_counts missing field: {field}"
    
    def test_realtime_analytics_days_parameter(self):
        """Test that days parameter affects daily_series length"""
        response_7 = self.session.get(f"{BASE_URL}/api/ads/analytics/realtime?days=7")
        response_30 = self.session.get(f"{BASE_URL}/api/ads/analytics/realtime?days=30")
        
        data_7 = response_7.json()
        data_30 = response_30.json()
        
        # 7 days should have at most 7 entries
        assert len(data_7["daily_series"]) <= 7, f"Expected at most 7 entries, got {len(data_7['daily_series'])}"
        # 30 days should have at most 30 entries
        assert len(data_30["daily_series"]) <= 30, f"Expected at most 30 entries, got {len(data_30['daily_series'])}"


class TestAdFinancialAnalytics:
    """Tests for GET /api/ads/analytics/financial endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as app_owner"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as app_owner
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Owner_homeme",
            "password": "Dalia1234@"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_financial_analytics_returns_200(self):
        """Test that financial analytics endpoint returns 200"""
        response = self.session.get(f"{BASE_URL}/api/ads/analytics/financial")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_financial_analytics_has_summary(self):
        """Test that response contains summary with required fields"""
        response = self.session.get(f"{BASE_URL}/api/ads/analytics/financial")
        data = response.json()
        
        assert "summary" in data, "Response missing summary"
        s = data["summary"]
        
        required_fields = ["total_revenue", "paid_ads_count", "gift_ads_count", "avg_ad_value",
                          "cost_per_click", "cost_per_view", "current_month_revenue", 
                          "previous_month_revenue", "growth_percent", "projected_monthly", "projected_yearly"]
        for field in required_fields:
            assert field in s, f"summary missing field: {field}"
    
    def test_financial_analytics_has_position_revenue(self):
        """Test that response contains position_revenue array"""
        response = self.session.get(f"{BASE_URL}/api/ads/analytics/financial")
        data = response.json()
        
        assert "position_revenue" in data, "Response missing position_revenue"
        assert isinstance(data["position_revenue"], list), "position_revenue should be a list"
        
        if len(data["position_revenue"]) > 0:
            entry = data["position_revenue"][0]
            assert "position" in entry, "position_revenue entry missing position"
            assert "revenue" in entry, "position_revenue entry missing revenue"
            assert "count" in entry, "position_revenue entry missing count"
            assert "cpc" in entry, "position_revenue entry missing cpc"
    
    def test_financial_analytics_has_monthly_chart(self):
        """Test that response contains monthly_chart array"""
        response = self.session.get(f"{BASE_URL}/api/ads/analytics/financial")
        data = response.json()
        
        assert "monthly_chart" in data, "Response missing monthly_chart"
        assert isinstance(data["monthly_chart"], list), "monthly_chart should be a list"
        
        if len(data["monthly_chart"]) > 0:
            entry = data["monthly_chart"][0]
            assert "month" in entry, "monthly_chart entry missing month"
            assert "revenue" in entry, "monthly_chart entry missing revenue"
            assert "count" in entry, "monthly_chart entry missing count"
    
    def test_financial_analytics_has_top_earners(self):
        """Test that response contains top_earners array"""
        response = self.session.get(f"{BASE_URL}/api/ads/analytics/financial")
        data = response.json()
        
        assert "top_earners" in data, "Response missing top_earners"
        assert isinstance(data["top_earners"], list), "top_earners should be a list"
        assert len(data["top_earners"]) <= 10, "top_earners should have at most 10 entries"
        
        if len(data["top_earners"]) > 0:
            entry = data["top_earners"][0]
            assert "id" in entry, "top_earners entry missing id"
            assert "title" in entry, "top_earners entry missing title"
            assert "ad_value" in entry, "top_earners entry missing ad_value"
            assert "cpc" in entry, "top_earners entry missing cpc"
    
    def test_financial_analytics_has_breakdown(self):
        """Test that response contains breakdown with required fields"""
        response = self.session.get(f"{BASE_URL}/api/ads/analytics/financial")
        data = response.json()
        
        assert "breakdown" in data, "Response missing breakdown"
        b = data["breakdown"]
        
        required_fields = ["paid_revenue", "gift_value", "active_revenue", "inactive_revenue"]
        for field in required_fields:
            assert field in b, f"breakdown missing field: {field}"


class TestExistingAdEndpoints:
    """Tests to verify existing ad endpoints still work"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as app_owner"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as app_owner
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Owner_homeme",
            "password": "Dalia1234@"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_ads_returns_200(self):
        """Test GET /api/ads returns 200"""
        response = self.session.get(f"{BASE_URL}/api/ads")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "ads" in data, "Response missing ads"
        assert "stats" in data, "Response missing stats"
    
    def test_get_ads_analytics_returns_200(self):
        """Test GET /api/ads/analytics returns 200"""
        response = self.session.get(f"{BASE_URL}/api/ads/analytics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "summary" in data, "Response missing summary"
        assert "all_ads" in data, "Response missing all_ads"
    
    def test_get_ad_settings_returns_200(self):
        """Test GET /api/ads/ad-settings returns 200"""
        response = self.session.get(f"{BASE_URL}/api/ads/ad-settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "positions" in data, "Response missing positions"
    
    def test_put_ad_settings_returns_200(self):
        """Test PUT /api/ads/ad-settings returns 200"""
        response = self.session.put(f"{BASE_URL}/api/ads/ad-settings", json={
            "adsense_global_enabled": True
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


class TestAuthorizationRequired:
    """Tests to verify endpoints require authentication"""
    
    def test_realtime_analytics_requires_auth(self):
        """Test that realtime analytics requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ads/analytics/realtime?days=30")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_financial_analytics_requires_auth(self):
        """Test that financial analytics requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ads/analytics/financial")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
