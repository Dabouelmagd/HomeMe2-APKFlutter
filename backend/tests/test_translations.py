"""
Translation Management API Tests
Tests for GET/PUT/POST/DELETE endpoints for translation CRUD operations
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://profile-nav-debug.preview.emergentagent.com').rstrip('/')

class TestTranslationsAPI:
    """Translation Management API endpoint tests"""
    
    # Test key prefix for cleanup
    TEST_KEY_PREFIX = "TEST_TM_"
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        yield
        # Cleanup test keys after each test
        self._cleanup_test_keys()
    
    def _cleanup_test_keys(self):
        """Remove any test keys created during tests"""
        try:
            # Get all keys and delete test ones
            res = self.session.get(f"{BASE_URL}/api/translations", params={"search": self.TEST_KEY_PREFIX, "per_page": 100})
            if res.status_code == 200:
                data = res.json()
                for row in data.get("rows", []):
                    if row["key"].startswith(self.TEST_KEY_PREFIX):
                        self.session.delete(f"{BASE_URL}/api/translations/{row['key']}")
        except:
            pass
    
    # ==================== GET /api/translations ====================
    
    def test_get_translations_returns_200(self):
        """GET /api/translations returns 200 with paginated results"""
        response = self.session.get(f"{BASE_URL}/api/translations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "rows" in data, "Response should contain 'rows'"
        assert "total" in data, "Response should contain 'total'"
        assert "page" in data, "Response should contain 'page'"
        assert "per_page" in data, "Response should contain 'per_page'"
        assert "total_pages" in data, "Response should contain 'total_pages'"
        assert "stats" in data, "Response should contain 'stats'"
        print(f"GET /api/translations: {data['total']} total keys, page {data['page']}/{data['total_pages']}")
    
    def test_get_translations_stats_structure(self):
        """GET /api/translations returns correct stats structure"""
        response = self.session.get(f"{BASE_URL}/api/translations")
        assert response.status_code == 200
        
        stats = response.json().get("stats", {})
        assert "total_keys" in stats, "Stats should contain 'total_keys'"
        assert "en" in stats, "Stats should contain 'en' language stats"
        assert "ar" in stats, "Stats should contain 'ar' language stats"
        assert "fr" in stats, "Stats should contain 'fr' language stats"
        
        # Check language stats structure
        for lang in ["en", "ar", "fr"]:
            lang_stats = stats[lang]
            assert "total" in lang_stats, f"{lang} stats should contain 'total'"
            assert "translated" in lang_stats, f"{lang} stats should contain 'translated'"
            assert "missing" in lang_stats, f"{lang} stats should contain 'missing'"
        
        print(f"Stats: total_keys={stats['total_keys']}, en={stats['en']['translated']}/{stats['en']['total']}, ar={stats['ar']['translated']}/{stats['ar']['total']}, fr={stats['fr']['translated']}/{stats['fr']['total']}")
    
    def test_get_translations_pagination(self):
        """GET /api/translations pagination works correctly"""
        # Get page 1
        res1 = self.session.get(f"{BASE_URL}/api/translations", params={"page": 1, "per_page": 10})
        assert res1.status_code == 200
        data1 = res1.json()
        
        # Get page 2
        res2 = self.session.get(f"{BASE_URL}/api/translations", params={"page": 2, "per_page": 10})
        assert res2.status_code == 200
        data2 = res2.json()
        
        # Verify different rows
        keys1 = [r["key"] for r in data1["rows"]]
        keys2 = [r["key"] for r in data2["rows"]]
        assert keys1 != keys2, "Page 1 and Page 2 should have different keys"
        assert data1["page"] == 1
        assert data2["page"] == 2
        print(f"Pagination: Page 1 has {len(keys1)} keys, Page 2 has {len(keys2)} keys")
    
    def test_get_translations_search(self):
        """GET /api/translations search filter works"""
        # Search for a common term
        response = self.session.get(f"{BASE_URL}/api/translations", params={"search": "login", "per_page": 50})
        assert response.status_code == 200
        
        data = response.json()
        # All returned keys should contain 'login' in key or values
        for row in data["rows"]:
            search_term = "login"
            found = (search_term in row["key"].lower() or 
                    search_term in str(row.get("en", "")).lower() or
                    search_term in str(row.get("ar", "")).lower() or
                    search_term in str(row.get("fr", "")).lower())
            assert found, f"Key '{row['key']}' should contain 'login' in key or values"
        print(f"Search 'login': Found {data['total']} matching keys")
    
    def test_get_translations_filter_missing(self):
        """GET /api/translations filter_type=missing returns only incomplete keys"""
        response = self.session.get(f"{BASE_URL}/api/translations", params={"filter_type": "missing", "per_page": 50})
        assert response.status_code == 200
        
        data = response.json()
        for row in data["rows"]:
            assert len(row["missing"]) > 0, f"Key '{row['key']}' should have missing translations"
        print(f"Filter 'missing': Found {data['total']} keys with missing translations")
    
    def test_get_translations_filter_complete(self):
        """GET /api/translations filter_type=complete returns only complete keys"""
        response = self.session.get(f"{BASE_URL}/api/translations", params={"filter_type": "complete", "per_page": 50})
        assert response.status_code == 200
        
        data = response.json()
        for row in data["rows"]:
            assert len(row["missing"]) == 0, f"Key '{row['key']}' should have no missing translations"
        print(f"Filter 'complete': Found {data['total']} complete keys")
    
    # ==================== POST /api/translations/add ====================
    
    def test_add_translation_key(self):
        """POST /api/translations/add creates a new key"""
        test_key = f"{self.TEST_KEY_PREFIX}new_key_{int(time.time())}"
        payload = {
            "key": test_key,
            "en": "Test English Value",
            "ar": "قيمة اختبار عربية",
            "fr": "Valeur de test française"
        }
        
        response = self.session.post(f"{BASE_URL}/api/translations/add", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok", "Response should have status 'ok'"
        assert data.get("key") == test_key, f"Response should contain the key '{test_key}'"
        
        # Verify key was created by fetching it
        verify_res = self.session.get(f"{BASE_URL}/api/translations", params={"search": test_key})
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        found = any(r["key"] == test_key for r in verify_data["rows"])
        assert found, f"Key '{test_key}' should be found after creation"
        print(f"POST /api/translations/add: Created key '{test_key}'")
    
    def test_add_translation_key_empty_key_fails(self):
        """POST /api/translations/add with empty key returns 400"""
        payload = {"key": "", "en": "Test", "ar": "اختبار", "fr": "Test"}
        response = self.session.post(f"{BASE_URL}/api/translations/add", json=payload)
        assert response.status_code == 400, f"Expected 400 for empty key, got {response.status_code}"
        print("POST /api/translations/add with empty key: Correctly returns 400")
    
    def test_add_translation_key_partial_values(self):
        """POST /api/translations/add with partial values works"""
        test_key = f"{self.TEST_KEY_PREFIX}partial_{int(time.time())}"
        payload = {"key": test_key, "en": "English Only"}
        
        response = self.session.post(f"{BASE_URL}/api/translations/add", json=payload)
        assert response.status_code == 200
        
        # Verify the key exists with only English value
        verify_res = self.session.get(f"{BASE_URL}/api/translations", params={"search": test_key})
        verify_data = verify_res.json()
        row = next((r for r in verify_data["rows"] if r["key"] == test_key), None)
        assert row is not None, f"Key '{test_key}' should exist"
        assert row["en"] == "English Only"
        assert "ar" in row["missing"] or row["ar"] == "", "Arabic should be missing or empty"
        print(f"POST /api/translations/add with partial values: Created key '{test_key}'")
    
    # ==================== PUT /api/translations ====================
    
    def test_update_translation_value(self):
        """PUT /api/translations updates a single translation value"""
        # First create a test key
        test_key = f"{self.TEST_KEY_PREFIX}update_{int(time.time())}"
        self.session.post(f"{BASE_URL}/api/translations/add", json={"key": test_key, "en": "Original"})
        
        # Update the value
        update_payload = {"key": test_key, "lang": "en", "value": "Updated Value"}
        response = self.session.put(f"{BASE_URL}/api/translations", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok"
        assert data.get("key") == test_key
        assert data.get("lang") == "en"
        
        # Verify the update
        verify_res = self.session.get(f"{BASE_URL}/api/translations", params={"search": test_key})
        verify_data = verify_res.json()
        row = next((r for r in verify_data["rows"] if r["key"] == test_key), None)
        assert row is not None
        assert row["en"] == "Updated Value", f"Expected 'Updated Value', got '{row['en']}'"
        print(f"PUT /api/translations: Updated key '{test_key}' en value to 'Updated Value'")
    
    def test_update_translation_invalid_lang(self):
        """PUT /api/translations with invalid language returns 400"""
        payload = {"key": "some_key", "lang": "invalid_lang", "value": "test"}
        response = self.session.put(f"{BASE_URL}/api/translations", json=payload)
        assert response.status_code == 400, f"Expected 400 for invalid lang, got {response.status_code}"
        print("PUT /api/translations with invalid lang: Correctly returns 400")
    
    def test_update_translation_missing_key(self):
        """PUT /api/translations with missing key returns 400"""
        payload = {"lang": "en", "value": "test"}
        response = self.session.put(f"{BASE_URL}/api/translations", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing key, got {response.status_code}"
        print("PUT /api/translations with missing key: Correctly returns 400")
    
    # ==================== DELETE /api/translations/{key} ====================
    
    def test_delete_translation_key(self):
        """DELETE /api/translations/{key} removes key from all languages"""
        # First create a test key
        test_key = f"{self.TEST_KEY_PREFIX}delete_{int(time.time())}"
        self.session.post(f"{BASE_URL}/api/translations/add", json={
            "key": test_key, "en": "To Delete", "ar": "للحذف", "fr": "À supprimer"
        })
        
        # Delete the key
        response = self.session.delete(f"{BASE_URL}/api/translations/{test_key}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok"
        assert data.get("deleted_from") == 3, "Should be deleted from all 3 languages"
        
        # Verify deletion
        verify_res = self.session.get(f"{BASE_URL}/api/translations", params={"search": test_key})
        verify_data = verify_res.json()
        found = any(r["key"] == test_key for r in verify_data["rows"])
        assert not found, f"Key '{test_key}' should not exist after deletion"
        print(f"DELETE /api/translations/{test_key}: Successfully deleted from all languages")
    
    def test_delete_nonexistent_key(self):
        """DELETE /api/translations/{key} for nonexistent key returns 200 with deleted_from=0"""
        response = self.session.delete(f"{BASE_URL}/api/translations/nonexistent_key_12345")
        assert response.status_code == 200
        data = response.json()
        assert data.get("deleted_from") == 0, "Should report 0 deletions for nonexistent key"
        print("DELETE nonexistent key: Correctly returns deleted_from=0")
    
    # ==================== GET /api/translations/export/{lang} ====================
    
    def test_export_english_locale(self):
        """GET /api/translations/export/en returns JSON file"""
        response = self.session.get(f"{BASE_URL}/api/translations/export/en")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "application/json" in response.headers.get("content-type", "")
        
        # Verify it's valid JSON
        data = response.json()
        assert isinstance(data, dict), "Export should return a JSON object"
        assert len(data) > 0, "Export should contain translation keys"
        print(f"GET /api/translations/export/en: Exported {len(data)} keys")
    
    def test_export_arabic_locale(self):
        """GET /api/translations/export/ar returns JSON file"""
        response = self.session.get(f"{BASE_URL}/api/translations/export/ar")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"GET /api/translations/export/ar: Exported {len(data)} keys")
    
    def test_export_french_locale(self):
        """GET /api/translations/export/fr returns JSON file"""
        response = self.session.get(f"{BASE_URL}/api/translations/export/fr")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"GET /api/translations/export/fr: Exported {len(data)} keys")
    
    def test_export_invalid_lang(self):
        """GET /api/translations/export/{invalid} returns 400"""
        response = self.session.get(f"{BASE_URL}/api/translations/export/invalid")
        assert response.status_code == 400, f"Expected 400 for invalid lang, got {response.status_code}"
        print("GET /api/translations/export/invalid: Correctly returns 400")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
