"""
Test suite for Ads API routing fix verification
Tests the fix for PUT /api/ads/ad-settings routing conflict with PUT /api/ads/{ad_id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdsRouting:
    """Test ads API endpoints - verifying routing fix"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with authentication"""
        self.base_url = BASE_URL
        self.token = None
        self.test_ad_id = None
        
        # Login as super admin
        login_response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"username": "superadmin", "password": "SuperAdmin2024!"}
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
        
        yield
        
        # Cleanup: delete test ad if created
        if self.test_ad_id and self.token:
            requests.delete(
                f"{self.base_url}/api/ads/{self.test_ad_id}",
                headers={"Authorization": f"Bearer {self.token}"}
            )
    
    def get_headers(self):
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    # ==================== Authentication Tests ====================
    
    def test_login_super_admin(self):
        """Test super admin login returns access_token"""
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"username": "superadmin", "password": "SuperAdmin2024!"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data.get("user", {}).get("role") in ["super_admin", "app_owner"], "User is not super_admin"
        print(f"✓ Super admin login successful, role: {data.get('user', {}).get('role')}")
    
    def test_login_app_owner(self):
        """Test app owner login returns access_token"""
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"username": "Owner_homeme", "password": "Dalia1234@"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"✓ App owner login successful, role: {data.get('user', {}).get('role')}")
    
    # ==================== Ad Settings Tests (CRITICAL - routing fix) ====================
    
    def test_get_ad_settings(self):
        """GET /api/ads/ad-settings should return ad settings (not 400)"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{self.base_url}/api/ads/ad-settings",
            headers=self.get_headers()
        )
        
        # This was returning 400 before the fix due to routing conflict
        assert response.status_code == 200, f"GET ad-settings failed with {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "positions" in data, "Missing 'positions' in response"
        assert "adsense_publisher_id" in data, "Missing 'adsense_publisher_id' in response"
        assert "adsense_global_enabled" in data, "Missing 'adsense_global_enabled' in response"
        
        # Verify positions structure
        positions = data.get("positions", {})
        expected_positions = ["banner", "sidebar", "dashboard", "inline"]
        for pos in expected_positions:
            assert pos in positions, f"Missing position '{pos}' in settings"
        
        print(f"✓ GET /api/ads/ad-settings returned 200 with positions: {list(positions.keys())}")
        print(f"  AdSense publisher ID: {data.get('adsense_publisher_id')}")
        print(f"  AdSense global enabled: {data.get('adsense_global_enabled')}")
    
    def test_put_ad_settings(self):
        """PUT /api/ads/ad-settings should update settings (not return 400)"""
        if not self.token:
            pytest.skip("No auth token available")
        
        # First get current settings
        get_response = requests.get(
            f"{self.base_url}/api/ads/ad-settings",
            headers=self.get_headers()
        )
        assert get_response.status_code == 200, "Failed to get current settings"
        current = get_response.json()
        
        # Toggle adsense_global_enabled
        new_value = not current.get("adsense_global_enabled", True)
        
        response = requests.put(
            f"{self.base_url}/api/ads/ad-settings",
            headers=self.get_headers(),
            json={"adsense_global_enabled": new_value}
        )
        
        # This was returning 400 before the fix
        assert response.status_code == 200, f"PUT ad-settings failed with {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "No message in response"
        
        # Verify the change was applied
        verify_response = requests.get(
            f"{self.base_url}/api/ads/ad-settings",
            headers=self.get_headers()
        )
        verify_data = verify_response.json()
        assert verify_data.get("adsense_global_enabled") == new_value, "Setting was not updated"
        
        # Restore original value
        requests.put(
            f"{self.base_url}/api/ads/ad-settings",
            headers=self.get_headers(),
            json={"adsense_global_enabled": current.get("adsense_global_enabled", True)}
        )
        
        print(f"✓ PUT /api/ads/ad-settings returned 200, toggled adsense_global_enabled to {new_value}")
    
    def test_put_ad_settings_positions(self):
        """PUT /api/ads/ad-settings should update position settings"""
        if not self.token:
            pytest.skip("No auth token available")
        
        # Update positions
        new_positions = {
            "banner": {"mode": "internal_first", "adsense_enabled": True, "internal_enabled": True},
            "sidebar": {"mode": "internal_only", "adsense_enabled": False, "internal_enabled": True},
            "dashboard": {"mode": "internal_only", "adsense_enabled": False, "internal_enabled": True},
            "inline": {"mode": "internal_first", "adsense_enabled": True, "internal_enabled": True}
        }
        
        response = requests.put(
            f"{self.base_url}/api/ads/ad-settings",
            headers=self.get_headers(),
            json={"positions": new_positions}
        )
        
        assert response.status_code == 200, f"PUT ad-settings positions failed: {response.text}"
        
        # Verify
        verify_response = requests.get(
            f"{self.base_url}/api/ads/ad-settings",
            headers=self.get_headers()
        )
        verify_data = verify_response.json()
        assert "positions" in verify_data, "Positions not in response"
        
        print(f"✓ PUT /api/ads/ad-settings positions update successful")
    
    # ==================== Active Ads Tests ====================
    
    def test_get_active_ads(self):
        """GET /api/ads/active should return active ads"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{self.base_url}/api/ads/active",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"GET active ads failed: {response.text}"
        
        data = response.json()
        assert "ads" in data, "Missing 'ads' in response"
        assert isinstance(data["ads"], list), "ads should be a list"
        
        print(f"✓ GET /api/ads/active returned {len(data['ads'])} active ads")
    
    def test_get_active_ads_by_position(self):
        """GET /api/ads/active?position=banner should filter by position"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{self.base_url}/api/ads/active?position=banner",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"GET active ads by position failed: {response.text}"
        
        data = response.json()
        assert "ads" in data, "Missing 'ads' in response"
        
        # All returned ads should have position=banner
        for ad in data["ads"]:
            assert ad.get("position") == "banner", f"Ad has wrong position: {ad.get('position')}"
        
        print(f"✓ GET /api/ads/active?position=banner returned {len(data['ads'])} banner ads")
    
    # ==================== Analytics Tests ====================
    
    def test_get_ad_analytics(self):
        """GET /api/ads/analytics should return analytics data"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{self.base_url}/api/ads/analytics",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"GET analytics failed: {response.text}"
        
        data = response.json()
        assert "summary" in data, "Missing 'summary' in response"
        assert "all_ads" in data, "Missing 'all_ads' in response"
        
        summary = data.get("summary", {})
        expected_fields = ["total_ads", "active_ads", "total_clicks", "total_views", "avg_ctr", "total_revenue", "gift_ads"]
        for field in expected_fields:
            assert field in summary, f"Missing '{field}' in summary"
        
        print(f"✓ GET /api/ads/analytics returned summary: {summary}")
    
    # ==================== CRUD Tests ====================
    
    def test_create_ad(self):
        """POST /api/ads should create a new ad"""
        if not self.token:
            pytest.skip("No auth token available")
        
        ad_data = {
            "title": "TEST_Ad_Routing_Fix",
            "description": "Test ad for routing fix verification",
            "position": "banner",
            "dimensions": "728x90",
            "is_active": True,
            "is_gift": True,
            "ad_value": 0
        }
        
        response = requests.post(
            f"{self.base_url}/api/ads",
            headers=self.get_headers(),
            json=ad_data
        )
        
        assert response.status_code == 200, f"POST /api/ads failed: {response.text}"
        
        data = response.json()
        assert "ad" in data, "Missing 'ad' in response"
        assert data["ad"].get("title") == ad_data["title"], "Title mismatch"
        assert data["ad"].get("position") == ad_data["position"], "Position mismatch"
        
        self.test_ad_id = data["ad"].get("id")
        print(f"✓ POST /api/ads created ad with id: {self.test_ad_id}")
        
        return self.test_ad_id
    
    def test_get_all_ads(self):
        """GET /api/ads should return all ads (super admin only)"""
        if not self.token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{self.base_url}/api/ads",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"GET /api/ads failed: {response.text}"
        
        data = response.json()
        assert "ads" in data, "Missing 'ads' in response"
        assert "stats" in data, "Missing 'stats' in response"
        
        print(f"✓ GET /api/ads returned {len(data['ads'])} ads with stats: {data['stats']}")
    
    def test_update_ad_by_id(self):
        """PUT /api/ads/{ad_id} should update an ad (not conflict with ad-settings)"""
        if not self.token:
            pytest.skip("No auth token available")
        
        # First create an ad
        ad_data = {
            "title": "TEST_Ad_Update_Test",
            "description": "Test ad for update verification",
            "position": "sidebar",
            "is_active": True,
            "is_gift": True
        }
        
        create_response = requests.post(
            f"{self.base_url}/api/ads",
            headers=self.get_headers(),
            json=ad_data
        )
        
        assert create_response.status_code == 200, f"Failed to create test ad: {create_response.text}"
        ad_id = create_response.json()["ad"]["id"]
        self.test_ad_id = ad_id
        
        # Now update the ad
        update_data = {
            "title": "TEST_Ad_Update_Test_UPDATED",
            "description": "Updated description"
        }
        
        response = requests.put(
            f"{self.base_url}/api/ads/{ad_id}",
            headers=self.get_headers(),
            json=update_data
        )
        
        # This should work and not conflict with ad-settings route
        assert response.status_code == 200, f"PUT /api/ads/{ad_id} failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "No message in response"
        
        print(f"✓ PUT /api/ads/{ad_id} updated ad successfully")
    
    def test_toggle_ad(self):
        """PUT /api/ads/{ad_id}/toggle should toggle ad status"""
        if not self.token:
            pytest.skip("No auth token available")
        
        # First create an ad
        ad_data = {
            "title": "TEST_Ad_Toggle_Test",
            "position": "inline",
            "is_active": True,
            "is_gift": True
        }
        
        create_response = requests.post(
            f"{self.base_url}/api/ads",
            headers=self.get_headers(),
            json=ad_data
        )
        
        assert create_response.status_code == 200, f"Failed to create test ad: {create_response.text}"
        ad_id = create_response.json()["ad"]["id"]
        self.test_ad_id = ad_id
        
        # Toggle the ad
        response = requests.put(
            f"{self.base_url}/api/ads/{ad_id}/toggle",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"PUT /api/ads/{ad_id}/toggle failed: {response.text}"
        
        data = response.json()
        assert "is_active" in data, "No is_active in response"
        assert data["is_active"] == False, "Ad should be deactivated"
        
        print(f"✓ PUT /api/ads/{ad_id}/toggle toggled ad to inactive")
    
    def test_delete_ad(self):
        """DELETE /api/ads/{ad_id} should delete an ad"""
        if not self.token:
            pytest.skip("No auth token available")
        
        # First create an ad
        ad_data = {
            "title": "TEST_Ad_Delete_Test",
            "position": "dashboard",
            "is_active": True,
            "is_gift": True
        }
        
        create_response = requests.post(
            f"{self.base_url}/api/ads",
            headers=self.get_headers(),
            json=ad_data
        )
        
        assert create_response.status_code == 200, f"Failed to create test ad: {create_response.text}"
        ad_id = create_response.json()["ad"]["id"]
        
        # Delete the ad
        response = requests.delete(
            f"{self.base_url}/api/ads/{ad_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"DELETE /api/ads/{ad_id} failed: {response.text}"
        
        # Verify deletion
        get_response = requests.get(
            f"{self.base_url}/api/ads",
            headers=self.get_headers()
        )
        ads = get_response.json().get("ads", [])
        ad_ids = [a.get("id") for a in ads]
        assert ad_id not in ad_ids, "Ad was not deleted"
        
        print(f"✓ DELETE /api/ads/{ad_id} deleted ad successfully")
        self.test_ad_id = None  # Already deleted
    
    def test_track_ad_click(self):
        """POST /api/ads/{ad_id}/click should track click"""
        if not self.token:
            pytest.skip("No auth token available")
        
        # First create an ad
        ad_data = {
            "title": "TEST_Ad_Click_Test",
            "position": "banner",
            "is_active": True,
            "is_gift": True
        }
        
        create_response = requests.post(
            f"{self.base_url}/api/ads",
            headers=self.get_headers(),
            json=ad_data
        )
        
        assert create_response.status_code == 200, f"Failed to create test ad: {create_response.text}"
        ad_id = create_response.json()["ad"]["id"]
        self.test_ad_id = ad_id
        
        # Track click
        response = requests.post(
            f"{self.base_url}/api/ads/{ad_id}/click",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"POST /api/ads/{ad_id}/click failed: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Click tracking failed"
        
        print(f"✓ POST /api/ads/{ad_id}/click tracked click successfully")


# Cleanup function to remove test ads
def cleanup_test_ads():
    """Remove all TEST_ prefixed ads"""
    base_url = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
    
    login_response = requests.post(
        f"{base_url}/api/auth/login",
        json={"username": "superadmin", "password": "SuperAdmin2024!"}
    )
    
    if login_response.status_code != 200:
        return
    
    token = login_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get all ads
    ads_response = requests.get(f"{base_url}/api/ads", headers=headers)
    if ads_response.status_code == 200:
        ads = ads_response.json().get("ads", [])
        for ad in ads:
            if ad.get("title", "").startswith("TEST_"):
                requests.delete(f"{base_url}/api/ads/{ad['id']}", headers=headers)
                print(f"Cleaned up test ad: {ad['title']}")


if __name__ == "__main__":
    cleanup_test_ads()
