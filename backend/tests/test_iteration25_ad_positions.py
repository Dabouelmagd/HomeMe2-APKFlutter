"""
Iteration 25 Tests: Ad Positions across 12 locations
Tests for InternalAdBanner integration in Login, Layout, App, Services, Notifications
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://profile-nav-debug.preview.emergentagent.com')

# Test credentials
OWNER_CREDS = {"username": "Owner_homeme", "password": "Dalia1234@"}
SUPER_ADMIN_CREDS = {"username": "superadmin", "password": "SuperAdmin2024!"}


@pytest.fixture(scope="module")
def owner_token():
    """Get owner authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=OWNER_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Owner authentication failed")


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Super admin authentication failed")


class TestAdsAPISlotStats:
    """Test GET /api/ads returns correct slot_stats with all 12 positions"""
    
    def test_ads_endpoint_returns_12_positions(self, owner_token):
        """Verify GET /api/ads returns slot_stats with all 12 ad positions"""
        response = requests.get(
            f"{BASE_URL}/api/ads",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats structure
        assert "stats" in data
        stats = data["stats"]
        
        # Verify slot_stats exists
        assert "slot_stats" in stats
        slot_stats = stats["slot_stats"]
        
        # All 12 positions must be present
        expected_positions = [
            "homepage_hero", "homepage_mid", "homepage_footer",
            "banner", "sidebar", "dashboard", "inline",
            "login_page", "popup", "notification", "splash", "services_page"
        ]
        
        for pos in expected_positions:
            assert pos in slot_stats, f"Position '{pos}' missing from slot_stats"
            assert "max_slots" in slot_stats[pos], f"max_slots missing for {pos}"
            assert "booked" in slot_stats[pos], f"booked missing for {pos}"
            assert "available" in slot_stats[pos], f"available missing for {pos}"
        
        print(f"✓ All 12 positions present in slot_stats")
    
    def test_slot_stats_max_slots_values(self, owner_token):
        """Verify MAX_SLOTS values are correct for each position"""
        response = requests.get(
            f"{BASE_URL}/api/ads",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        slot_stats = response.json()["stats"]["slot_stats"]
        
        expected_max_slots = {
            "homepage_hero": 3, "homepage_mid": 2, "homepage_footer": 2,
            "banner": 5, "sidebar": 3, "dashboard": 2, "inline": 4,
            "login_page": 2, "popup": 1, "notification": 2, "splash": 1, "services_page": 3
        }
        
        for pos, expected_max in expected_max_slots.items():
            actual_max = slot_stats[pos]["max_slots"]
            assert actual_max == expected_max, f"{pos}: expected max_slots={expected_max}, got {actual_max}"
        
        print(f"✓ All MAX_SLOTS values correct")
    
    def test_total_slots_equals_30(self, owner_token):
        """Verify total_slots equals 30 (sum of all max_slots)"""
        response = requests.get(
            f"{BASE_URL}/api/ads",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        stats = response.json()["stats"]
        
        assert stats["total_slots"] == 30, f"Expected total_slots=30, got {stats['total_slots']}"
        print(f"✓ total_slots = 30")
    
    def test_available_slots_calculation(self, owner_token):
        """Verify available = max_slots - booked for each position"""
        response = requests.get(
            f"{BASE_URL}/api/ads",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        slot_stats = response.json()["stats"]["slot_stats"]
        
        for pos, data in slot_stats.items():
            expected_available = data["max_slots"] - data["booked"]
            assert data["available"] == expected_available, \
                f"{pos}: available should be {expected_available}, got {data['available']}"
        
        print(f"✓ Available slots calculated correctly for all positions")


class TestActiveAdsEndpoint:
    """Test GET /api/ads/active for different positions"""
    
    def test_active_ads_login_page_position(self, owner_token):
        """Test fetching active ads for login_page position"""
        response = requests.get(
            f"{BASE_URL}/api/ads/active?position=login_page",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "ads" in data
        print(f"✓ GET /api/ads/active?position=login_page returns {len(data['ads'])} ads")
    
    def test_active_ads_popup_position(self, owner_token):
        """Test fetching active ads for popup position"""
        response = requests.get(
            f"{BASE_URL}/api/ads/active?position=popup",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "ads" in data
        print(f"✓ GET /api/ads/active?position=popup returns {len(data['ads'])} ads")
    
    def test_active_ads_splash_position(self, owner_token):
        """Test fetching active ads for splash position"""
        response = requests.get(
            f"{BASE_URL}/api/ads/active?position=splash",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "ads" in data
        print(f"✓ GET /api/ads/active?position=splash returns {len(data['ads'])} ads")
    
    def test_active_ads_services_page_position(self, owner_token):
        """Test fetching active ads for services_page position"""
        response = requests.get(
            f"{BASE_URL}/api/ads/active?position=services_page",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "ads" in data
        print(f"✓ GET /api/ads/active?position=services_page returns {len(data['ads'])} ads")
    
    def test_active_ads_notification_position(self, owner_token):
        """Test fetching active ads for notification position"""
        response = requests.get(
            f"{BASE_URL}/api/ads/active?position=notification",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "ads" in data
        print(f"✓ GET /api/ads/active?position=notification returns {len(data['ads'])} ads")


class TestSuperAdminPanelAdsTab:
    """Test SuperAdminPanel ads tab shows 12 position cards"""
    
    def test_super_admin_can_access_ads(self, super_admin_token):
        """Verify super admin can access ads endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/ads",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "ads" in data
        assert "stats" in data
        print(f"✓ Super admin can access /api/ads")
    
    def test_owner_can_access_ads(self, owner_token):
        """Verify owner can access ads endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/ads",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "ads" in data
        assert "stats" in data
        print(f"✓ Owner can access /api/ads")


class TestAdCreationWithNewPositions:
    """Test ad creation with new position options"""
    
    def test_create_ad_with_login_page_position(self, owner_token):
        """Test creating an ad with login_page position"""
        ad_data = {
            "title": "TEST_Login Page Ad",
            "image_url": "https://example.com/test.jpg",
            "link_url": "https://example.com",
            "description": "Test ad for login page",
            "position": "login_page",
            "is_active": True
        }
        response = requests.post(
            f"{BASE_URL}/api/ads",
            json=ad_data,
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "ad" in data
        assert data["ad"]["position"] == "login_page"
        
        # Cleanup - delete the test ad
        ad_id = data["ad"]["id"]
        requests.delete(f"{BASE_URL}/api/ads/{ad_id}", headers={"Authorization": f"Bearer {owner_token}"})
        print(f"✓ Created and deleted test ad with login_page position")
    
    def test_create_ad_with_services_page_position(self, owner_token):
        """Test creating an ad with services_page position"""
        ad_data = {
            "title": "TEST_Services Page Ad",
            "image_url": "https://example.com/test.jpg",
            "link_url": "https://example.com",
            "description": "Test ad for services page",
            "position": "services_page",
            "is_active": True
        }
        response = requests.post(
            f"{BASE_URL}/api/ads",
            json=ad_data,
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "ad" in data
        assert data["ad"]["position"] == "services_page"
        
        # Cleanup
        ad_id = data["ad"]["id"]
        requests.delete(f"{BASE_URL}/api/ads/{ad_id}", headers={"Authorization": f"Bearer {owner_token}"})
        print(f"✓ Created and deleted test ad with services_page position")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
