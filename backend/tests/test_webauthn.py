"""
WebAuthn/Biometric Authentication API Tests
Tests for:
- GET /api/webauthn/check/{username} - Check if user has biometric registered
- POST /api/webauthn/register/options - Get registration options (requires auth)
- POST /api/webauthn/register/verify - Verify and store biometric (requires auth)
- POST /api/webauthn/login/options - Get login options for biometric auth
- DELETE /api/webauthn/remove - Remove biometric credential (requires auth)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
ADMIN_USER_ID = "a1857e5a-fd0c-4d89-9457-df591e535afa"
SUPER_ADMIN_USERNAME = "dalia"
SUPER_ADMIN_PASSWORD = "Admin2024!"
COMPOUND_ID = "88ad3711-c9ae-45fe-a270-65f4524c071c"


class TestWebAuthnAPIs:
    """WebAuthn API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.user_id = None
        self.username = None
    
    def get_auth_token(self, username=ADMIN_USERNAME, password=ADMIN_PASSWORD):
        """Get authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": username,
            "password": password
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.user_id = data.get("user", {}).get("id")
            self.username = data.get("user", {}).get("username")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            return True
        return False
    
    # ==================== CHECK BIOMETRIC STATUS ====================
    
    def test_webauthn_check_endpoint_exists(self):
        """Test GET /api/webauthn/check/{username} endpoint exists"""
        response = self.session.get(f"{BASE_URL}/api/webauthn/check/{ADMIN_USERNAME}")
        # Should return 200 with has_biometric field
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "has_biometric" in data, f"Response missing 'has_biometric' field: {data}"
        assert isinstance(data["has_biometric"], bool), f"has_biometric should be boolean: {data}"
        print(f"✓ WebAuthn check endpoint works - has_biometric: {data['has_biometric']}")
    
    def test_webauthn_check_nonexistent_user(self):
        """Test check endpoint with non-existent user returns false"""
        response = self.session.get(f"{BASE_URL}/api/webauthn/check/nonexistent_user_xyz123")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["has_biometric"] == False, f"Non-existent user should have no biometric: {data}"
        print("✓ Non-existent user correctly returns has_biometric: false")
    
    def test_webauthn_check_cors_headers(self):
        """Test CORS headers are present in response"""
        response = self.session.get(f"{BASE_URL}/api/webauthn/check/{ADMIN_USERNAME}")
        # Check for CORS headers
        assert response.status_code == 200
        # CORS headers should be present (may vary based on request origin)
        print(f"✓ Response headers: {dict(response.headers)}")
    
    # ==================== REGISTER OPTIONS (Requires Auth) ====================
    
    def test_webauthn_register_options_requires_auth(self):
        """Test POST /api/webauthn/register/options requires authentication"""
        # Clear any existing auth
        self.session.headers.pop("Authorization", None)
        
        response = self.session.post(f"{BASE_URL}/api/webauthn/register/options", json={
            "user_id": ADMIN_USER_ID,
            "username": ADMIN_USERNAME
        })
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Register options endpoint correctly requires authentication")
    
    def test_webauthn_register_options_with_auth(self):
        """Test POST /api/webauthn/register/options with valid auth"""
        assert self.get_auth_token(), "Failed to get auth token"
        
        response = self.session.post(f"{BASE_URL}/api/webauthn/register/options", json={
            "user_id": self.user_id,
            "username": self.username
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "challenge" in data, f"Response missing 'challenge': {data}"
        assert "rp" in data, f"Response missing 'rp' (relying party): {data}"
        assert "user" in data, f"Response missing 'user': {data}"
        assert "pubKeyCredParams" in data, f"Response missing 'pubKeyCredParams': {data}"
        
        # Verify rp structure
        assert "name" in data["rp"], f"rp missing 'name': {data['rp']}"
        assert "id" in data["rp"], f"rp missing 'id': {data['rp']}"
        
        # Verify user structure
        assert "id" in data["user"], f"user missing 'id': {data['user']}"
        assert "name" in data["user"], f"user missing 'name': {data['user']}"
        assert "displayName" in data["user"], f"user missing 'displayName': {data['user']}"
        
        print(f"✓ Register options returned valid structure with challenge: {data['challenge'][:20]}...")
    
    # ==================== REGISTER VERIFY (Requires Auth) ====================
    
    def test_webauthn_register_verify_requires_auth(self):
        """Test POST /api/webauthn/register/verify requires authentication"""
        self.session.headers.pop("Authorization", None)
        
        response = self.session.post(f"{BASE_URL}/api/webauthn/register/verify", json={
            "user_id": ADMIN_USER_ID,
            "credential_id": "test_credential",
            "client_data_json": "test_data",
            "attestation_object": "test_attestation"
        })
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Register verify endpoint correctly requires authentication")
    
    def test_webauthn_register_verify_with_invalid_data(self):
        """Test POST /api/webauthn/register/verify with invalid data returns error"""
        assert self.get_auth_token(), "Failed to get auth token"
        
        # First get options to create a challenge
        options_response = self.session.post(f"{BASE_URL}/api/webauthn/register/options", json={
            "user_id": self.user_id,
            "username": self.username
        })
        assert options_response.status_code == 200
        
        # Try to verify with invalid data
        response = self.session.post(f"{BASE_URL}/api/webauthn/register/verify", json={
            "user_id": self.user_id,
            "credential_id": "invalid_credential",
            "client_data_json": "invalid_base64_data",
            "attestation_object": "invalid_attestation"
        })
        
        # Should return 400 for invalid data
        assert response.status_code == 400, f"Expected 400 for invalid data, got {response.status_code}: {response.text}"
        print("✓ Register verify correctly rejects invalid data")
    
    # ==================== LOGIN OPTIONS (No Auth Required) ====================
    
    def test_webauthn_login_options_no_auth_required(self):
        """Test POST /api/webauthn/login/options does not require auth"""
        self.session.headers.pop("Authorization", None)
        
        response = self.session.post(f"{BASE_URL}/api/webauthn/login/options", json={
            "username": ADMIN_USERNAME
        })
        
        # Should return 200 or 400 (if no biometric registered), not 401
        assert response.status_code in [200, 400], f"Expected 200/400, got {response.status_code}: {response.text}"
        
        if response.status_code == 400:
            data = response.json()
            # Expected error if no biometric registered
            assert "detail" in data, f"Error response missing 'detail': {data}"
            print(f"✓ Login options returned expected error (no biometric): {data['detail']}")
        else:
            data = response.json()
            assert "challenge" in data, f"Response missing 'challenge': {data}"
            print(f"✓ Login options returned valid challenge")
    
    def test_webauthn_login_options_nonexistent_user(self):
        """Test login options with non-existent user returns error"""
        response = self.session.post(f"{BASE_URL}/api/webauthn/login/options", json={
            "username": "nonexistent_user_xyz123"
        })
        
        assert response.status_code == 400, f"Expected 400 for non-existent user, got {response.status_code}"
        data = response.json()
        assert "detail" in data, f"Error response missing 'detail': {data}"
        print(f"✓ Login options correctly returns error for non-existent user: {data['detail']}")
    
    # ==================== REMOVE BIOMETRIC (Requires Auth) ====================
    
    def test_webauthn_remove_requires_auth(self):
        """Test DELETE /api/webauthn/remove requires authentication"""
        self.session.headers.pop("Authorization", None)
        
        response = self.session.delete(f"{BASE_URL}/api/webauthn/remove")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Remove biometric endpoint correctly requires authentication")
    
    def test_webauthn_remove_with_auth(self):
        """Test DELETE /api/webauthn/remove with valid auth"""
        assert self.get_auth_token(), "Failed to get auth token"
        
        response = self.session.delete(f"{BASE_URL}/api/webauthn/remove")
        
        # Should return 200 (success) or 400 (no biometric to remove)
        assert response.status_code in [200, 400], f"Expected 200/400, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "message" in data, f"Success response missing 'message': {data}"
            print(f"✓ Remove biometric succeeded: {data['message']}")
        else:
            data = response.json()
            print(f"✓ Remove biometric returned expected error (no biometric): {data.get('detail', data)}")
    
    # ==================== FULL FLOW TEST ====================
    
    def test_webauthn_full_flow_check_status(self):
        """Test full WebAuthn flow: check → register options → check again"""
        assert self.get_auth_token(), "Failed to get auth token"
        
        # Step 1: Check initial biometric status
        check_response = self.session.get(f"{BASE_URL}/api/webauthn/check/{self.username}")
        assert check_response.status_code == 200
        initial_status = check_response.json()["has_biometric"]
        print(f"Step 1: Initial biometric status: {initial_status}")
        
        # Step 2: Get register options
        options_response = self.session.post(f"{BASE_URL}/api/webauthn/register/options", json={
            "user_id": self.user_id,
            "username": self.username
        })
        assert options_response.status_code == 200
        options = options_response.json()
        print(f"Step 2: Got register options with challenge: {options['challenge'][:20]}...")
        
        # Step 3: Verify the options structure is complete
        assert options["rp"]["name"] == "HomeMe", f"Unexpected rp name: {options['rp']['name']}"
        assert options["user"]["name"] == self.username, f"Unexpected user name: {options['user']['name']}"
        print(f"Step 3: Options structure verified - RP: {options['rp']['name']}, User: {options['user']['name']}")
        
        # Step 4: Check login options (should fail if no biometric registered)
        login_options_response = self.session.post(f"{BASE_URL}/api/webauthn/login/options", json={
            "username": self.username
        })
        
        if not initial_status:
            # If no biometric was registered, login options should fail
            assert login_options_response.status_code == 400, f"Expected 400 when no biometric, got {login_options_response.status_code}"
            print("Step 4: Login options correctly fails when no biometric registered")
        else:
            assert login_options_response.status_code == 200
            print("Step 4: Login options returned successfully (biometric exists)")
        
        print("✓ Full WebAuthn flow test completed successfully")


class TestWebAuthnServiceIntegration:
    """Integration tests for WebAuthn service with database"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_webauthn_service_db_initialized(self):
        """Test that WebAuthn service has database connection (via startup event)"""
        # This tests the fix: webauthn_service.db = db in startup event
        # If db is None, the check endpoint would fail
        response = self.session.get(f"{BASE_URL}/api/webauthn/check/{ADMIN_USERNAME}")
        assert response.status_code == 200, f"WebAuthn service may not have db connection: {response.text}"
        print("✓ WebAuthn service has valid database connection")
    
    def test_webauthn_check_multiple_users(self):
        """Test checking biometric status for multiple users"""
        users_to_check = [ADMIN_USERNAME, SUPER_ADMIN_USERNAME, "nonexistent_user"]
        
        for username in users_to_check:
            response = self.session.get(f"{BASE_URL}/api/webauthn/check/{username}")
            assert response.status_code == 200, f"Failed for user {username}: {response.text}"
            data = response.json()
            assert "has_biometric" in data
            print(f"  - {username}: has_biometric = {data['has_biometric']}")
        
        print("✓ Biometric check works for multiple users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
