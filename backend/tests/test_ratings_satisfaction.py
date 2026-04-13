"""
Test suite for Ratings & Satisfaction System
Tests:
- POST /api/ratings - Submit rating for maintenance/service
- GET /api/ratings/target/{type}/{id} - Get ratings for specific target
- GET /api/ratings/stats - Get compound-wide statistics (admin only)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRatingsSystem:
    """Test suite for Ratings & Satisfaction endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_token = None
        self.resident_token = None
        self.test_maintenance_id = None
        
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("access_token")
            return self.admin_token
        pytest.skip("Admin authentication failed")
        
    def get_resident_token(self):
        """Get resident authentication token"""
        if self.resident_token:
            return self.resident_token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "resident1",
            "password": "resident123"
        })
        if response.status_code == 200:
            self.resident_token = response.json().get("access_token")
            return self.resident_token
        # Fallback to admin if resident doesn't exist
        return self.get_admin_token()
    
    def create_maintenance_request(self, token):
        """Create a maintenance request for testing ratings"""
        response = requests.post(
            f"{BASE_URL}/api/maintenance/requests",
            data={
                "title": f"TEST_Rating_Request_{uuid.uuid4().hex[:8]}",
                "description": "Test maintenance request for rating testing",
                "category": "plumbing",
                "priority": "medium"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code in [200, 201]:
            return response.json().get("id")
        return None

    # ==================== POST /api/ratings Tests ====================
    
    def test_submit_rating_success(self):
        """Test submitting a valid rating for maintenance request"""
        token = self.get_admin_token()
        
        # First create a maintenance request
        maintenance_id = self.create_maintenance_request(token)
        if not maintenance_id:
            pytest.skip("Could not create maintenance request for testing")
        
        # Submit rating
        response = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "maintenance",
                "target_id": maintenance_id,
                "rating": 5,
                "comment": "Excellent service! Very satisfied."
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "rating_id" in data, "Response should contain rating_id"
        assert "message" in data, "Response should contain message"
        print(f"✓ Rating submitted successfully: {data}")
        
    def test_submit_rating_invalid_range(self):
        """Test that rating outside 1-5 range is rejected"""
        token = self.get_admin_token()
        
        # Create maintenance request
        maintenance_id = self.create_maintenance_request(token)
        if not maintenance_id:
            pytest.skip("Could not create maintenance request for testing")
        
        # Try rating of 0 (invalid)
        response = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "maintenance",
                "target_id": maintenance_id,
                "rating": 0,
                "comment": "Invalid rating"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400, f"Expected 400 for rating=0, got {response.status_code}"
        
        # Try rating of 6 (invalid)
        response = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "maintenance",
                "target_id": maintenance_id,
                "rating": 6,
                "comment": "Invalid rating"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400, f"Expected 400 for rating=6, got {response.status_code}"
        print("✓ Invalid rating range correctly rejected")
        
    def test_submit_rating_nonexistent_target(self):
        """Test rating a non-existent maintenance request"""
        token = self.get_admin_token()
        
        response = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "maintenance",
                "target_id": "nonexistent-id-12345",
                "rating": 4,
                "comment": "Test"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent target, got {response.status_code}"
        print("✓ Non-existent target correctly returns 404")
        
    def test_submit_rating_invalid_target_type(self):
        """Test rating with invalid target_type"""
        token = self.get_admin_token()
        
        response = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "invalid_type",
                "target_id": "some-id",
                "rating": 4,
                "comment": "Test"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid target_type, got {response.status_code}"
        print("✓ Invalid target_type correctly rejected")
        
    def test_duplicate_rating_updates(self):
        """Test that duplicate rating updates instead of creating new"""
        token = self.get_admin_token()
        
        # Create maintenance request
        maintenance_id = self.create_maintenance_request(token)
        if not maintenance_id:
            pytest.skip("Could not create maintenance request for testing")
        
        # Submit first rating
        response1 = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "maintenance",
                "target_id": maintenance_id,
                "rating": 3,
                "comment": "Initial rating"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == 200
        rating_id_1 = response1.json().get("rating_id")
        
        # Submit second rating (should update)
        response2 = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "maintenance",
                "target_id": maintenance_id,
                "rating": 5,
                "comment": "Updated rating"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response2.status_code == 200
        rating_id_2 = response2.json().get("rating_id")
        
        # Should be same rating_id (updated, not new)
        assert rating_id_1 == rating_id_2, "Duplicate rating should update existing, not create new"
        print(f"✓ Duplicate rating correctly updates existing: {rating_id_1}")
        
    def test_submit_rating_unauthorized(self):
        """Test that unauthenticated request is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "maintenance",
                "target_id": "some-id",
                "rating": 4,
                "comment": "Test"
            }
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthorized, got {response.status_code}"
        print("✓ Unauthorized request correctly rejected")

    # ==================== GET /api/ratings/target/{type}/{id} Tests ====================
    
    def test_get_target_ratings(self):
        """Test getting ratings for a specific target"""
        token = self.get_admin_token()
        
        # Create maintenance request and rate it
        maintenance_id = self.create_maintenance_request(token)
        if not maintenance_id:
            pytest.skip("Could not create maintenance request for testing")
        
        # Submit rating
        requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "maintenance",
                "target_id": maintenance_id,
                "rating": 4,
                "comment": "Good service"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Get ratings for target
        response = requests.get(
            f"{BASE_URL}/api/ratings/target/maintenance/{maintenance_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Validate response structure
        assert "ratings" in data, "Response should contain 'ratings' list"
        assert "average" in data, "Response should contain 'average'"
        assert "count" in data, "Response should contain 'count'"
        
        # Validate data
        assert isinstance(data["ratings"], list), "ratings should be a list"
        assert data["count"] >= 1, "Should have at least 1 rating"
        assert 1 <= data["average"] <= 5, "Average should be between 1 and 5"
        
        print(f"✓ Target ratings retrieved: count={data['count']}, average={data['average']}")
        
    def test_get_target_ratings_empty(self):
        """Test getting ratings for target with no ratings"""
        token = self.get_admin_token()
        
        # Create new maintenance request (no ratings yet)
        maintenance_id = self.create_maintenance_request(token)
        if not maintenance_id:
            pytest.skip("Could not create maintenance request for testing")
        
        # Get ratings (should be empty)
        response = requests.get(
            f"{BASE_URL}/api/ratings/target/maintenance/{maintenance_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0, "New target should have 0 ratings"
        assert data["average"] == 0, "Average should be 0 for no ratings"
        print("✓ Empty ratings correctly returned for new target")

    # ==================== GET /api/ratings/stats Tests ====================
    
    def test_get_rating_stats_admin(self):
        """Test getting compound-wide rating statistics (admin only)"""
        token = self.get_admin_token()
        
        response = requests.get(
            f"{BASE_URL}/api/ratings/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        required_fields = [
            "overall_average", "total_ratings", "maintenance_avg", 
            "service_avg", "rating_distribution", "monthly_trend", "recent_ratings"
        ]
        for field in required_fields:
            assert field in data, f"Response should contain '{field}'"
        
        # Validate data types
        assert isinstance(data["overall_average"], (int, float)), "overall_average should be numeric"
        assert isinstance(data["total_ratings"], int), "total_ratings should be int"
        assert isinstance(data["rating_distribution"], dict), "rating_distribution should be dict"
        assert isinstance(data["monthly_trend"], list), "monthly_trend should be list"
        assert isinstance(data["recent_ratings"], list), "recent_ratings should be list"
        
        # Validate rating_distribution has all keys 1-5
        for i in range(1, 6):
            assert i in data["rating_distribution"] or str(i) in data["rating_distribution"], \
                f"rating_distribution should have key {i}"
        
        print(f"✓ Rating stats retrieved: total={data['total_ratings']}, avg={data['overall_average']}")
        print(f"  - Maintenance avg: {data['maintenance_avg']}, Service avg: {data['service_avg']}")
        print(f"  - Distribution: {data['rating_distribution']}")
        
    def test_get_rating_stats_non_admin(self):
        """Test that non-admin cannot access rating stats"""
        # Try to get resident token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "resident1",
            "password": "resident123"
        })
        
        if response.status_code != 200:
            pytest.skip("Resident user not available for testing")
            
        resident_token = response.json().get("access_token")
        
        response = requests.get(
            f"{BASE_URL}/api/ratings/stats",
            headers={"Authorization": f"Bearer {resident_token}"}
        )
        
        # Should be forbidden for non-admin
        assert response.status_code in [401, 403], f"Expected 401/403 for non-admin, got {response.status_code}"
        print("✓ Non-admin correctly denied access to stats")
        
    def test_rating_stats_with_data(self):
        """Test rating stats returns correct calculations"""
        token = self.get_admin_token()
        
        # Create and rate multiple maintenance requests
        ratings_to_create = [5, 4, 3, 5, 4]  # Average should be 4.2
        
        for rating_value in ratings_to_create:
            maintenance_id = self.create_maintenance_request(token)
            if maintenance_id:
                requests.post(
                    f"{BASE_URL}/api/ratings",
                    json={
                        "target_type": "maintenance",
                        "target_id": maintenance_id,
                        "rating": rating_value,
                        "comment": f"Test rating {rating_value}"
                    },
                    headers={"Authorization": f"Bearer {token}"}
                )
        
        # Get stats
        response = requests.get(
            f"{BASE_URL}/api/ratings/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have ratings now
        assert data["total_ratings"] >= len(ratings_to_create), \
            f"Should have at least {len(ratings_to_create)} ratings"
        
        # Overall average should be reasonable
        assert 1 <= data["overall_average"] <= 5, "Average should be between 1 and 5"
        
        print(f"✓ Stats with data: {data['total_ratings']} total ratings, avg={data['overall_average']}")


class TestRatingsIntegration:
    """Integration tests for ratings with maintenance system"""
    
    def get_admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    def test_full_rating_workflow(self):
        """Test complete workflow: create request -> rate -> verify stats"""
        token = self.get_admin_token()
        
        # Step 1: Create maintenance request
        create_response = requests.post(
            f"{BASE_URL}/api/maintenance/requests",
            data={
                "title": f"TEST_FullWorkflow_{uuid.uuid4().hex[:8]}",
                "description": "Full workflow test",
                "category": "electrical",
                "priority": "high"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if create_response.status_code not in [200, 201]:
            pytest.skip("Could not create maintenance request")
            
        maintenance_id = create_response.json().get("id")
        assert maintenance_id, "Maintenance request should have ID"
        print(f"✓ Step 1: Created maintenance request {maintenance_id}")
        
        # Step 2: Submit rating
        rating_response = requests.post(
            f"{BASE_URL}/api/ratings",
            json={
                "target_type": "maintenance",
                "target_id": maintenance_id,
                "rating": 5,
                "comment": "Excellent work on electrical issue!"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert rating_response.status_code == 200
        rating_id = rating_response.json().get("rating_id")
        print(f"✓ Step 2: Submitted rating {rating_id}")
        
        # Step 3: Verify rating appears in target ratings
        target_response = requests.get(
            f"{BASE_URL}/api/ratings/target/maintenance/{maintenance_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert target_response.status_code == 200
        target_data = target_response.json()
        assert target_data["count"] >= 1
        assert target_data["average"] == 5.0
        print(f"✓ Step 3: Verified target ratings (count={target_data['count']}, avg={target_data['average']})")
        
        # Step 4: Verify rating appears in stats
        stats_response = requests.get(
            f"{BASE_URL}/api/ratings/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert stats_response.status_code == 200
        stats_data = stats_response.json()
        assert stats_data["total_ratings"] >= 1
        print(f"✓ Step 4: Verified stats (total={stats_data['total_ratings']})")
        
        print("✓ Full rating workflow completed successfully!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
