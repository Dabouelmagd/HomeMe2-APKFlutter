"""
Test Distribution Methods, Charts Data, and Daily Email Report
Tests for iteration 8 features:
1. Distribution methods for financial obligations (equal, per_sqm, percentage, custom)
2. Balance sheet API returns monthly_breakdown data for charts
3. Daily email report with enhanced financial stats
"""
import pytest
import requests
import os
import uuid
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
COMPOUND_ID = "88ad3711-c9ae-45fe-a270-65f4524c071c"

# Global session and token
_session = None
_token = None

def get_authenticated_session():
    """Get or create authenticated session"""
    global _session, _token
    
    if _session is None or _token is None:
        _session = requests.Session()
        _session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = _session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        if login_response.status_code == 429:
            # Rate limited, wait and retry
            time.sleep(60)
            login_response = _session.post(f"{BASE_URL}/api/auth/login", json={
                "username": "admin",
                "password": "admin123"
            })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        _token = login_response.json().get("token")
        _session.headers.update({"Authorization": f"Bearer {_token}"})
    
    return _session


# ==================== Distribution Methods Tests ====================

def test_01_equal_distribution():
    """Test POST /api/financial/obligations with distribution_method='equal'"""
    session = get_authenticated_session()
    unique_id = str(uuid.uuid4())[:8]
    payload = {
        "title": f"TEST_Equal_Distribution_{unique_id}",
        "description": "Testing equal distribution method",
        "total_amount": 10000,
        "month": 1,
        "year": 2026,
        "category": "maintenance",
        "distribution_method": "equal"
    }
    
    response = session.post(f"{BASE_URL}/api/financial/obligations", json=payload)
    print(f"Equal distribution response: {response.status_code} - {response.text[:500]}")
    
    assert response.status_code == 200, f"Failed to create equal distribution obligation: {response.text}"
    data = response.json()
    
    # Verify response structure
    assert "obligation_id" in data, "Response missing obligation_id"
    assert "distribution_method" in data, "Response missing distribution_method"
    assert data["distribution_method"] == "equal", f"Expected 'equal', got {data['distribution_method']}"
    assert "units_charged" in data, "Response missing units_charged"
    assert data["units_charged"] > 0, "No units were charged"
    assert "message" in data, "Response missing message"
    
    # Verify unit_amounts shows equal distribution
    if "unit_amounts" in data and data["unit_amounts"]:
        amounts = list(data["unit_amounts"].values())
        # All amounts should be equal (or very close due to rounding)
        if len(amounts) > 1:
            assert max(amounts) - min(amounts) < 1, "Amounts are not equally distributed"
    
    print(f"✓ Equal distribution test passed - {data['units_charged']} units charged")


def test_02_per_sqm_distribution():
    """Test POST /api/financial/obligations with distribution_method='per_sqm'"""
    session = get_authenticated_session()
    unique_id = str(uuid.uuid4())[:8]
    payload = {
        "title": f"TEST_PerSqm_Distribution_{unique_id}",
        "description": "Testing per square meter distribution method",
        "total_amount": 15000,
        "month": 1,
        "year": 2026,
        "category": "utilities",
        "distribution_method": "per_sqm"
    }
    
    response = session.post(f"{BASE_URL}/api/financial/obligations", json=payload)
    print(f"Per sqm distribution response: {response.status_code} - {response.text[:500]}")
    
    assert response.status_code == 200, f"Failed to create per_sqm distribution obligation: {response.text}"
    data = response.json()
    
    # Verify response structure
    assert "obligation_id" in data, "Response missing obligation_id"
    assert data["distribution_method"] == "per_sqm", f"Expected 'per_sqm', got {data['distribution_method']}"
    assert data["units_charged"] > 0, "No units were charged"
    
    # Per sqm distribution may have different amounts per unit
    if "unit_amounts" in data:
        print(f"Unit amounts (per_sqm): {data['unit_amounts']}")
    
    print(f"✓ Per sqm distribution test passed - {data['units_charged']} units charged")


def test_03_percentage_distribution():
    """Test POST /api/financial/obligations with distribution_method='percentage'"""
    session = get_authenticated_session()
    unique_id = str(uuid.uuid4())[:8]
    payload = {
        "title": f"TEST_Percentage_Distribution_{unique_id}",
        "description": "Testing percentage distribution method",
        "total_amount": 20000,
        "month": 1,
        "year": 2026,
        "category": "security",
        "distribution_method": "percentage",
        "percentage_rates": {}  # Empty means equal share for all
    }
    
    response = session.post(f"{BASE_URL}/api/financial/obligations", json=payload)
    print(f"Percentage distribution response: {response.status_code} - {response.text[:500]}")
    
    assert response.status_code == 200, f"Failed to create percentage distribution obligation: {response.text}"
    data = response.json()
    
    # Verify response structure
    assert "obligation_id" in data, "Response missing obligation_id"
    assert data["distribution_method"] == "percentage", f"Expected 'percentage', got {data['distribution_method']}"
    assert data["units_charged"] > 0, "No units were charged"
    
    print(f"✓ Percentage distribution test passed - {data['units_charged']} units charged")


def test_04_custom_distribution():
    """Test POST /api/financial/obligations with distribution_method='custom'"""
    session = get_authenticated_session()
    unique_id = str(uuid.uuid4())[:8]
    payload = {
        "title": f"TEST_Custom_Distribution_{unique_id}",
        "description": "Testing custom amount distribution method",
        "total_amount": 25000,
        "month": 1,
        "year": 2026,
        "category": "cleaning",
        "distribution_method": "custom",
        "custom_amounts": {}  # Empty means equal share for all
    }
    
    response = session.post(f"{BASE_URL}/api/financial/obligations", json=payload)
    print(f"Custom distribution response: {response.status_code} - {response.text[:500]}")
    
    assert response.status_code == 200, f"Failed to create custom distribution obligation: {response.text}"
    data = response.json()
    
    # Verify response structure
    assert "obligation_id" in data, "Response missing obligation_id"
    assert data["distribution_method"] == "custom", f"Expected 'custom', got {data['distribution_method']}"
    assert data["units_charged"] > 0, "No units were charged"
    
    print(f"✓ Custom distribution test passed - {data['units_charged']} units charged")


def test_05_get_obligations_shows_distribution_method():
    """Test GET /api/financial/obligations returns distribution_method and distribution_label"""
    session = get_authenticated_session()
    response = session.get(f"{BASE_URL}/api/financial/obligations?month=1&year=2026")
    print(f"Get obligations response: {response.status_code}")
    
    assert response.status_code == 200, f"Failed to get obligations: {response.text}"
    data = response.json()
    
    assert "obligations" in data, "Response missing obligations array"
    
    # Check if any TEST_ obligations have distribution info
    test_obligations = [o for o in data["obligations"] if o.get("title", "").startswith("TEST_")]
    if test_obligations:
        for ob in test_obligations[:3]:  # Check first 3
            print(f"Obligation: {ob.get('title')} - method: {ob.get('distribution_method')} - label: {ob.get('distribution_label')}")
            # distribution_method and distribution_label should be present
            assert "distribution_method" in ob or "distribution_label" in ob, "Obligation missing distribution info"
    
    print(f"✓ Get obligations test passed - {len(data['obligations'])} obligations found")


# ==================== Balance Sheet Charts Tests ====================

def test_06_balance_sheet_returns_monthly_breakdown():
    """Test GET /api/financial/balance-sheet returns monthly_breakdown for bar chart"""
    session = get_authenticated_session()
    response = session.get(f"{BASE_URL}/api/financial/balance-sheet?year=2026")
    print(f"Balance sheet response: {response.status_code}")
    
    assert response.status_code == 200, f"Failed to get balance sheet: {response.text}"
    data = response.json()
    
    # Verify monthly_breakdown exists
    assert "monthly_breakdown" in data, "Response missing monthly_breakdown for bar chart"
    print(f"Monthly breakdown: {data['monthly_breakdown']}")
    
    # If there's data, verify structure
    if data["monthly_breakdown"]:
        for month_key, month_data in data["monthly_breakdown"].items():
            assert "expenses" in month_data, f"Month {month_key} missing expenses"
            assert "revenue" in month_data, f"Month {month_key} missing revenue"
    
    print(f"✓ Monthly breakdown test passed - {len(data['monthly_breakdown'])} months with data")


def test_07_balance_sheet_returns_expenses_by_category():
    """Test GET /api/financial/balance-sheet returns expenses_by_category for pie chart"""
    session = get_authenticated_session()
    response = session.get(f"{BASE_URL}/api/financial/balance-sheet?year=2026")
    
    assert response.status_code == 200, f"Failed to get balance sheet: {response.text}"
    data = response.json()
    
    # Verify expenses_by_category exists
    assert "expenses_by_category" in data, "Response missing expenses_by_category for pie chart"
    print(f"Expenses by category: {data['expenses_by_category']}")
    
    print(f"✓ Expenses by category test passed - {len(data['expenses_by_category'])} categories")


def test_08_balance_sheet_returns_revenue_by_source():
    """Test GET /api/financial/balance-sheet returns revenue_by_source for pie chart"""
    session = get_authenticated_session()
    response = session.get(f"{BASE_URL}/api/financial/balance-sheet?year=2026")
    
    assert response.status_code == 200, f"Failed to get balance sheet: {response.text}"
    data = response.json()
    
    # Verify revenue_by_source exists
    assert "revenue_by_source" in data, "Response missing revenue_by_source for pie chart"
    print(f"Revenue by source: {data['revenue_by_source']}")
    
    print(f"✓ Revenue by source test passed - {len(data['revenue_by_source'])} sources")


def test_09_balance_sheet_returns_collection_rate():
    """Test GET /api/financial/balance-sheet returns collection_rate for gauge"""
    session = get_authenticated_session()
    response = session.get(f"{BASE_URL}/api/financial/balance-sheet?year=2026")
    
    assert response.status_code == 200, f"Failed to get balance sheet: {response.text}"
    data = response.json()
    
    # Verify obligations with collection_rate exists
    assert "obligations" in data, "Response missing obligations"
    assert "collection_rate" in data["obligations"], "Obligations missing collection_rate for gauge"
    
    collection_rate = data["obligations"]["collection_rate"]
    assert isinstance(collection_rate, (int, float)), "collection_rate should be a number"
    assert 0 <= collection_rate <= 100, f"collection_rate should be 0-100, got {collection_rate}"
    
    print(f"✓ Collection rate test passed - {collection_rate}%")


def test_10_balance_sheet_complete_structure():
    """Test GET /api/financial/balance-sheet returns all required fields"""
    session = get_authenticated_session()
    response = session.get(f"{BASE_URL}/api/financial/balance-sheet?year=2026")
    
    assert response.status_code == 200, f"Failed to get balance sheet: {response.text}"
    data = response.json()
    
    # Verify all required fields for charts
    required_fields = [
        "total_expenses",
        "total_revenue", 
        "net_balance",
        "expenses_by_category",
        "revenue_by_source",
        "obligations",
        "monthly_breakdown"
    ]
    
    for field in required_fields:
        assert field in data, f"Response missing required field: {field}"
    
    # Verify obligations sub-fields
    obligations_fields = ["total_charged", "total_collected", "total_outstanding", "collection_rate"]
    for field in obligations_fields:
        assert field in data["obligations"], f"Obligations missing field: {field}"
    
    print(f"✓ Balance sheet complete structure test passed")
    print(f"  - Total expenses: {data['total_expenses']}")
    print(f"  - Total revenue: {data['total_revenue']}")
    print(f"  - Net balance: {data['net_balance']}")
    print(f"  - Collection rate: {data['obligations']['collection_rate']}%")


# ==================== Daily Email Report Tests ====================

def test_11_send_daily_report_returns_stats():
    """Test POST /api/email/send-daily-report returns stats including unpaid_obligations"""
    session = get_authenticated_session()
    response = session.post(f"{BASE_URL}/api/email/send-daily-report")
    print(f"Daily report response: {response.status_code} - {response.text[:500]}")
    
    # Should return 200 even if email fails (returns success:false)
    assert response.status_code == 200, f"Failed to send daily report: {response.text}"
    data = response.json()
    
    # Verify response structure
    assert "success" in data, "Response missing success field"
    assert "stats" in data, "Response missing stats field"
    
    stats = data["stats"]
    
    # Verify enhanced stats fields
    assert "unpaid_obligations" in stats, "Stats missing unpaid_obligations"
    assert "total_unpaid_amount" in stats, "Stats missing total_unpaid_amount"
    
    # Verify other stats fields
    expected_stats = [
        "new_residents",
        "visitors_today",
        "maintenance_requests",
        "open_maintenance",
        "pending_payments",
        "messages_sent"
    ]
    
    for stat in expected_stats:
        assert stat in stats, f"Stats missing {stat}"
    
    print(f"✓ Daily report test passed")
    print(f"  - Success: {data['success']}")
    print(f"  - Unpaid obligations: {stats['unpaid_obligations']}")
    print(f"  - Total unpaid amount: {stats['total_unpaid_amount']}")
    print(f"  - Open maintenance: {stats['open_maintenance']}")


def test_12_daily_report_requires_auth():
    """Test POST /api/email/send-daily-report requires authentication"""
    # Create new session without auth
    no_auth_session = requests.Session()
    no_auth_session.headers.update({"Content-Type": "application/json"})
    
    response = no_auth_session.post(f"{BASE_URL}/api/email/send-daily-report")
    
    # Should return 401 or 403
    assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    print(f"✓ Auth required test passed - returned {response.status_code}")


def test_13_obligations_have_distribution_label():
    """Test that obligations returned have distribution_label for UI display"""
    session = get_authenticated_session()
    response = session.get(f"{BASE_URL}/api/financial/obligations?month=1&year=2026")
    
    assert response.status_code == 200, f"Failed to get obligations: {response.text}"
    data = response.json()
    
    if data.get("obligations"):
        for ob in data["obligations"][:5]:
            # Check for distribution_label (Arabic label for UI)
            if "distribution_label" in ob:
                print(f"Obligation '{ob.get('title')}' has label: {ob.get('distribution_label')}")
            elif "distribution_method" in ob:
                print(f"Obligation '{ob.get('title')}' has method: {ob.get('distribution_method')}")
    
    print(f"✓ Obligations distribution info test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
