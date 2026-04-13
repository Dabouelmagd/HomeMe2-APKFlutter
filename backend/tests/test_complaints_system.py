"""
Test suite for Complaints & Suggestions System
Tests: POST /api/complaints, GET /api/complaints, PUT /api/complaints/{id}/respond
Features: Create complaint/suggestion/inquiry, filter by type/status, admin respond
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestComplaintsSystem:
    """Complaints & Suggestions System API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        self.resident_token = None
        self.created_complaint_ids = []
        
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("access_token")
            return self.admin_token
        pytest.skip(f"Admin login failed: {response.status_code}")
        
    def get_resident_token(self):
        """Get resident authentication token"""
        if self.resident_token:
            return self.resident_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "resident1",
            "password": "resident123"
        })
        if response.status_code == 200:
            self.resident_token = response.json().get("access_token")
            return self.resident_token
        pytest.skip(f"Resident login failed: {response.status_code}")
        
    def auth_headers(self, token):
        """Return authorization headers"""
        return {"Authorization": f"Bearer {token}"}
    
    # ==================== POST /api/complaints Tests ====================
    
    def test_create_complaint_with_all_fields(self):
        """Test creating a complaint with all fields"""
        token = self.get_admin_token()
        
        payload = {
            "type": "complaint",
            "category": "maintenance",
            "title": "TEST_مشكلة في المصعد",
            "description": "المصعد لا يعمل بشكل صحيح في الطابق الثالث",
            "priority": "high",
            "unit_number": "A101"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/complaints",
            json=payload,
            headers=self.auth_headers(token)
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "complaint_id" in data, "Response should contain complaint_id"
        assert "message" in data, "Response should contain message"
        self.created_complaint_ids.append(data["complaint_id"])
        print(f"SUCCESS: Created complaint with ID: {data['complaint_id']}")
        
    def test_create_suggestion(self):
        """Test creating a suggestion (type=suggestion)"""
        token = self.get_admin_token()
        
        payload = {
            "type": "suggestion",
            "category": "general",
            "title": "TEST_اقتراح تحسين الإضاءة",
            "description": "اقترح تحسين الإضاءة في المناطق المشتركة",
            "priority": "normal",
            "unit_number": "B202"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/complaints",
            json=payload,
            headers=self.auth_headers(token)
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "complaint_id" in data
        self.created_complaint_ids.append(data["complaint_id"])
        print(f"SUCCESS: Created suggestion with ID: {data['complaint_id']}")
        
    def test_create_inquiry(self):
        """Test creating an inquiry (type=inquiry)"""
        token = self.get_admin_token()
        
        payload = {
            "type": "inquiry",
            "category": "financial",
            "title": "TEST_استفسار عن الرسوم",
            "description": "أريد معرفة تفاصيل رسوم الصيانة الشهرية",
            "priority": "low",
            "unit_number": "C303"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/complaints",
            json=payload,
            headers=self.auth_headers(token)
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "complaint_id" in data
        self.created_complaint_ids.append(data["complaint_id"])
        print(f"SUCCESS: Created inquiry with ID: {data['complaint_id']}")
        
    def test_create_complaint_urgent_priority(self):
        """Test creating a complaint with urgent priority"""
        token = self.get_admin_token()
        
        payload = {
            "type": "complaint",
            "category": "security",
            "title": "TEST_مشكلة أمنية عاجلة",
            "description": "باب المدخل الرئيسي لا يغلق بشكل صحيح",
            "priority": "urgent",
            "unit_number": "D404"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/complaints",
            json=payload,
            headers=self.auth_headers(token)
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "complaint_id" in data
        self.created_complaint_ids.append(data["complaint_id"])
        print(f"SUCCESS: Created urgent complaint with ID: {data['complaint_id']}")
        
    def test_create_complaint_missing_title(self):
        """Test creating a complaint without required title field"""
        token = self.get_admin_token()
        
        payload = {
            "type": "complaint",
            "category": "general",
            "description": "Description without title"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/complaints",
            json=payload,
            headers=self.auth_headers(token)
        )
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 for missing title, got {response.status_code}"
        print("SUCCESS: Missing title returns 422 validation error")
        
    # ==================== GET /api/complaints Tests ====================
    
    def test_get_complaints_list_with_summary(self):
        """Test getting complaints list with summary stats"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/complaints",
            headers=self.auth_headers(token)
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "complaints" in data, "Response should contain 'complaints' array"
        assert "summary" in data, "Response should contain 'summary' object"
        
        # Verify summary structure
        summary = data["summary"]
        assert "total" in summary, "Summary should contain 'total'"
        assert "open" in summary, "Summary should contain 'open'"
        assert "in_progress" in summary, "Summary should contain 'in_progress'"
        assert "resolved" in summary, "Summary should contain 'resolved'"
        
        print(f"SUCCESS: Got {len(data['complaints'])} complaints")
        print(f"Summary: total={summary['total']}, open={summary['open']}, in_progress={summary['in_progress']}, resolved={summary['resolved']}")
        
    def test_filter_complaints_by_type_complaint(self):
        """Test filtering complaints by type=complaint"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/complaints?type=complaint",
            headers=self.auth_headers(token)
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify all returned items are complaints
        for complaint in data["complaints"]:
            assert complaint.get("type") == "complaint", f"Expected type 'complaint', got '{complaint.get('type')}'"
        
        print(f"SUCCESS: Filtered by type=complaint, got {len(data['complaints'])} complaints")
        
    def test_filter_complaints_by_type_suggestion(self):
        """Test filtering complaints by type=suggestion"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/complaints?type=suggestion",
            headers=self.auth_headers(token)
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify all returned items are suggestions
        for complaint in data["complaints"]:
            assert complaint.get("type") == "suggestion", f"Expected type 'suggestion', got '{complaint.get('type')}'"
        
        print(f"SUCCESS: Filtered by type=suggestion, got {len(data['complaints'])} suggestions")
        
    def test_filter_complaints_by_status_open(self):
        """Test filtering complaints by status=open"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/complaints?status=open",
            headers=self.auth_headers(token)
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify all returned items have status=open
        for complaint in data["complaints"]:
            assert complaint.get("status") == "open", f"Expected status 'open', got '{complaint.get('status')}'"
        
        print(f"SUCCESS: Filtered by status=open, got {len(data['complaints'])} open complaints")
        
    def test_filter_complaints_by_status_in_progress(self):
        """Test filtering complaints by status=in_progress"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/complaints?status=in_progress",
            headers=self.auth_headers(token)
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify all returned items have status=in_progress
        for complaint in data["complaints"]:
            assert complaint.get("status") == "in_progress", f"Expected status 'in_progress', got '{complaint.get('status')}'"
        
        print(f"SUCCESS: Filtered by status=in_progress, got {len(data['complaints'])} in-progress complaints")
        
    def test_filter_complaints_combined_type_and_status(self):
        """Test filtering complaints by both type and status"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/complaints?type=complaint&status=open",
            headers=self.auth_headers(token)
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify all returned items match both filters
        for complaint in data["complaints"]:
            assert complaint.get("type") == "complaint", f"Expected type 'complaint', got '{complaint.get('type')}'"
            assert complaint.get("status") == "open", f"Expected status 'open', got '{complaint.get('status')}'"
        
        print(f"SUCCESS: Filtered by type=complaint&status=open, got {len(data['complaints'])} complaints")
        
    # ==================== PUT /api/complaints/{id}/respond Tests ====================
    
    def test_admin_respond_to_complaint_change_status(self):
        """Test admin responding to a complaint and changing status"""
        token = self.get_admin_token()
        
        # First, create a complaint to respond to
        create_payload = {
            "type": "complaint",
            "category": "maintenance",
            "title": "TEST_شكوى للرد عليها",
            "description": "شكوى تحتاج رد من الإدارة",
            "priority": "normal",
            "unit_number": "E505"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/complaints",
            json=create_payload,
            headers=self.auth_headers(token)
        )
        
        assert create_response.status_code == 200, f"Failed to create complaint: {create_response.text}"
        complaint_id = create_response.json()["complaint_id"]
        self.created_complaint_ids.append(complaint_id)
        
        # Now respond to the complaint
        response_text = "شكرا لتواصلكم، سيتم معالجة المشكلة خلال 24 ساعة"
        
        respond_response = self.session.put(
            f"{BASE_URL}/api/complaints/{complaint_id}/respond?status=in_progress&response={requests.utils.quote(response_text)}",
            headers=self.auth_headers(token)
        )
        
        assert respond_response.status_code == 200, f"Expected 200, got {respond_response.status_code}: {respond_response.text}"
        
        # Verify the complaint was updated
        get_response = self.session.get(
            f"{BASE_URL}/api/complaints",
            headers=self.auth_headers(token)
        )
        
        complaints = get_response.json()["complaints"]
        updated_complaint = next((c for c in complaints if c["id"] == complaint_id), None)
        
        assert updated_complaint is not None, "Complaint not found after update"
        assert updated_complaint["status"] == "in_progress", f"Expected status 'in_progress', got '{updated_complaint['status']}'"
        assert updated_complaint["admin_response"] == response_text, "Admin response not saved correctly"
        
        print(f"SUCCESS: Admin responded to complaint {complaint_id}, status changed to in_progress")
        
    def test_admin_resolve_complaint(self):
        """Test admin resolving a complaint"""
        token = self.get_admin_token()
        
        # First, create a complaint
        create_payload = {
            "type": "complaint",
            "category": "cleaning",
            "title": "TEST_شكوى للحل",
            "description": "شكوى سيتم حلها",
            "priority": "normal",
            "unit_number": "F606"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/complaints",
            json=create_payload,
            headers=self.auth_headers(token)
        )
        
        assert create_response.status_code == 200
        complaint_id = create_response.json()["complaint_id"]
        self.created_complaint_ids.append(complaint_id)
        
        # Resolve the complaint
        response_text = "تم حل المشكلة بنجاح"
        
        respond_response = self.session.put(
            f"{BASE_URL}/api/complaints/{complaint_id}/respond?status=resolved&response={requests.utils.quote(response_text)}",
            headers=self.auth_headers(token)
        )
        
        assert respond_response.status_code == 200, f"Expected 200, got {respond_response.status_code}: {respond_response.text}"
        
        # Verify the complaint was resolved
        get_response = self.session.get(
            f"{BASE_URL}/api/complaints",
            headers=self.auth_headers(token)
        )
        
        complaints = get_response.json()["complaints"]
        resolved_complaint = next((c for c in complaints if c["id"] == complaint_id), None)
        
        assert resolved_complaint is not None, "Complaint not found after resolve"
        assert resolved_complaint["status"] == "resolved", f"Expected status 'resolved', got '{resolved_complaint['status']}'"
        
        print(f"SUCCESS: Admin resolved complaint {complaint_id}")
        
    def test_admin_close_complaint(self):
        """Test admin closing a complaint"""
        token = self.get_admin_token()
        
        # First, create a complaint
        create_payload = {
            "type": "inquiry",
            "category": "general",
            "title": "TEST_استفسار للإغلاق",
            "description": "استفسار سيتم إغلاقه",
            "priority": "low",
            "unit_number": "G707"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/complaints",
            json=create_payload,
            headers=self.auth_headers(token)
        )
        
        assert create_response.status_code == 200
        complaint_id = create_response.json()["complaint_id"]
        self.created_complaint_ids.append(complaint_id)
        
        # Close the complaint
        response_text = "تم الإجابة على الاستفسار"
        
        respond_response = self.session.put(
            f"{BASE_URL}/api/complaints/{complaint_id}/respond?status=closed&response={requests.utils.quote(response_text)}",
            headers=self.auth_headers(token)
        )
        
        assert respond_response.status_code == 200, f"Expected 200, got {respond_response.status_code}: {respond_response.text}"
        print(f"SUCCESS: Admin closed complaint {complaint_id}")
        
    def test_respond_to_nonexistent_complaint(self):
        """Test responding to a non-existent complaint returns 404"""
        token = self.get_admin_token()
        
        fake_id = "nonexistent-complaint-id-12345"
        
        respond_response = self.session.put(
            f"{BASE_URL}/api/complaints/{fake_id}/respond?status=in_progress&response=test",
            headers=self.auth_headers(token)
        )
        
        assert respond_response.status_code == 404, f"Expected 404 for non-existent complaint, got {respond_response.status_code}"
        print("SUCCESS: Non-existent complaint returns 404")
        
    # ==================== Complaint Data Validation Tests ====================
    
    def test_complaint_has_required_fields(self):
        """Test that complaints have all required fields in response"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/complaints",
            headers=self.auth_headers(token)
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["complaints"]) > 0:
            complaint = data["complaints"][0]
            required_fields = ["id", "type", "category", "title", "description", "priority", "status", "created_at"]
            
            for field in required_fields:
                assert field in complaint, f"Complaint missing required field: {field}"
            
            print(f"SUCCESS: Complaint has all required fields: {required_fields}")
        else:
            print("SKIP: No complaints to validate fields")
            
    def test_complaint_status_values(self):
        """Test that complaint status values are valid"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/complaints",
            headers=self.auth_headers(token)
        )
        
        assert response.status_code == 200
        data = response.json()
        
        valid_statuses = ["open", "in_progress", "resolved", "closed"]
        
        for complaint in data["complaints"]:
            status = complaint.get("status")
            assert status in valid_statuses, f"Invalid status '{status}', expected one of {valid_statuses}"
        
        print(f"SUCCESS: All complaints have valid status values")
        
    def test_complaint_type_values(self):
        """Test that complaint type values are valid"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/complaints",
            headers=self.auth_headers(token)
        )
        
        assert response.status_code == 200
        data = response.json()
        
        valid_types = ["complaint", "suggestion", "inquiry"]
        
        for complaint in data["complaints"]:
            complaint_type = complaint.get("type")
            assert complaint_type in valid_types, f"Invalid type '{complaint_type}', expected one of {valid_types}"
        
        print(f"SUCCESS: All complaints have valid type values")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
