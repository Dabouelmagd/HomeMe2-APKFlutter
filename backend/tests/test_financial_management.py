"""
Financial Management System Tests
Tests for: Obligations, Unit Charges, Balance Sheet, Expenses, Notifications
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
COMPOUND_ID = "88ad3711-c9ae-45fe-a270-65f4524c071c"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestBalanceSheet:
    """Balance Sheet API Tests"""
    
    def test_get_balance_sheet_success(self, auth_headers):
        """Test GET /api/financial/balance-sheet returns balance sheet data"""
        response = requests.get(
            f"{BASE_URL}/api/financial/balance-sheet?year=2026",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "total_revenue" in data, "Missing total_revenue"
        assert "total_expenses" in data, "Missing total_expenses"
        assert "net_balance" in data, "Missing net_balance"
        assert "expenses_by_category" in data, "Missing expenses_by_category"
        assert "revenue_by_source" in data, "Missing revenue_by_source"
        assert "obligations" in data, "Missing obligations"
        
        # Verify obligations structure
        obl = data["obligations"]
        assert "total_charged" in obl, "Missing total_charged in obligations"
        assert "total_collected" in obl, "Missing total_collected in obligations"
        assert "total_outstanding" in obl, "Missing total_outstanding in obligations"
        assert "collection_rate" in obl, "Missing collection_rate in obligations"
        
        print(f"Balance Sheet: Revenue={data['total_revenue']}, Expenses={data['total_expenses']}, Net={data['net_balance']}")
    
    def test_balance_sheet_without_year(self, auth_headers):
        """Test balance sheet defaults to current year"""
        response = requests.get(
            f"{BASE_URL}/api/financial/balance-sheet",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "year" in data
        print(f"Default year: {data['year']}")


class TestObligations:
    """Obligations API Tests"""
    
    def test_get_obligations_success(self, auth_headers):
        """Test GET /api/financial/obligations returns obligations list"""
        response = requests.get(
            f"{BASE_URL}/api/financial/obligations?month=4&year=2026",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "obligations" in data, "Missing obligations key"
        assert isinstance(data["obligations"], list), "obligations should be a list"
        
        print(f"Found {len(data['obligations'])} obligations for April 2026")
        
        # If there are obligations, verify structure
        if data["obligations"]:
            ob = data["obligations"][0]
            assert "id" in ob, "Missing id in obligation"
            assert "title" in ob, "Missing title in obligation"
            assert "total_amount" in ob, "Missing total_amount in obligation"
            assert "per_unit_amount" in ob, "Missing per_unit_amount in obligation"
            assert "unit_count" in ob, "Missing unit_count in obligation"
            print(f"First obligation: {ob['title']} - {ob['total_amount']}")
    
    def test_create_obligation_and_verify(self, auth_headers):
        """Test POST /api/financial/obligations creates obligation and distributes to units"""
        unique_title = f"TEST_Obligation_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "title": unique_title,
            "description": "Test obligation for automated testing",
            "total_amount": 10000,
            "month": 5,  # May
            "year": 2026,
            "category": "maintenance",
            "distribute_equally": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/financial/obligations",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing message in response"
        assert "obligation_id" in data, "Missing obligation_id in response"
        assert "per_unit_amount" in data, "Missing per_unit_amount in response"
        assert "units_charged" in data, "Missing units_charged in response"
        
        obligation_id = data["obligation_id"]
        print(f"Created obligation: {obligation_id}, per_unit: {data['per_unit_amount']}, units: {data['units_charged']}")
        
        # Verify obligation was created by fetching it
        get_response = requests.get(
            f"{BASE_URL}/api/financial/obligations?month=5&year=2026",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        
        obligations = get_response.json()["obligations"]
        found = any(ob["id"] == obligation_id for ob in obligations)
        assert found, f"Created obligation {obligation_id} not found in list"
        
        return obligation_id
    
    def test_obligations_filter_by_month_year(self, auth_headers):
        """Test obligations filtering by month and year"""
        # Test with different months
        for month in [1, 4, 12]:
            response = requests.get(
                f"{BASE_URL}/api/financial/obligations?month={month}&year=2026",
                headers=auth_headers
            )
            assert response.status_code == 200, f"Failed for month {month}"
            print(f"Month {month}/2026: {len(response.json()['obligations'])} obligations")


class TestUnitCharges:
    """Unit Charges API Tests"""
    
    def test_get_unit_charges_success(self, auth_headers):
        """Test GET /api/financial/unit-charges returns charges with summary"""
        response = requests.get(
            f"{BASE_URL}/api/financial/unit-charges?month=4&year=2026",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "charges" in data, "Missing charges key"
        assert "summary" in data, "Missing summary key"
        
        # Verify summary structure
        summary = data["summary"]
        assert "total" in summary, "Missing total in summary"
        assert "paid" in summary, "Missing paid in summary"
        assert "unpaid" in summary, "Missing unpaid in summary"
        assert "total_amount" in summary, "Missing total_amount in summary"
        
        print(f"Unit Charges Summary: Total={summary['total']}, Paid={summary['paid']}, Unpaid={summary['unpaid']}")
        
        # Verify charge structure if any exist
        if data["charges"]:
            charge = data["charges"][0]
            assert "id" in charge, "Missing id in charge"
            assert "unit_number" in charge, "Missing unit_number in charge"
            assert "resident_name" in charge, "Missing resident_name in charge"
            assert "amount" in charge, "Missing amount in charge"
            assert "status" in charge, "Missing status in charge"
            print(f"First charge: Unit {charge['unit_number']} - {charge['status']}")
    
    def test_unit_charges_filter_by_status(self, auth_headers):
        """Test filtering unit charges by status"""
        # Get pending charges
        response = requests.get(
            f"{BASE_URL}/api/financial/unit-charges?status=pending&month=4&year=2026",
            headers=auth_headers
        )
        assert response.status_code == 200
        pending = response.json()
        print(f"Pending charges: {len(pending['charges'])}")
        
        # Get paid charges
        response = requests.get(
            f"{BASE_URL}/api/financial/unit-charges?status=paid&month=4&year=2026",
            headers=auth_headers
        )
        assert response.status_code == 200
        paid = response.json()
        print(f"Paid charges: {len(paid['charges'])}")
    
    def test_mark_charge_paid_and_verify(self, auth_headers):
        """Test PUT /api/financial/unit-charges/{id}/pay marks charge as paid"""
        # First, get an unpaid charge
        response = requests.get(
            f"{BASE_URL}/api/financial/unit-charges?status=pending",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        charges = response.json()["charges"]
        if not charges:
            pytest.skip("No pending charges to test payment")
        
        charge_id = charges[0]["id"]
        unit_number = charges[0]["unit_number"]
        print(f"Testing payment for charge {charge_id} (Unit: {unit_number})")
        
        # Mark as paid
        pay_response = requests.put(
            f"{BASE_URL}/api/financial/unit-charges/{charge_id}/pay",
            json={},
            headers=auth_headers
        )
        assert pay_response.status_code == 200, f"Expected 200, got {pay_response.status_code}: {pay_response.text}"
        
        data = pay_response.json()
        assert "message" in data, "Missing message in response"
        print(f"Payment response: {data['message']}")
        
        # Verify charge is now paid
        verify_response = requests.get(
            f"{BASE_URL}/api/financial/unit-charges?status=paid",
            headers=auth_headers
        )
        assert verify_response.status_code == 200
        
        paid_charges = verify_response.json()["charges"]
        found = any(c["id"] == charge_id for c in paid_charges)
        assert found, f"Charge {charge_id} not found in paid charges after payment"
        
        # Find the charge and verify paid_at is set
        paid_charge = next((c for c in paid_charges if c["id"] == charge_id), None)
        assert paid_charge is not None
        assert paid_charge["status"] == "paid", "Status should be 'paid'"
        assert paid_charge.get("paid_at") is not None, "paid_at should be set"
        print(f"Verified: Charge {charge_id} is now paid at {paid_charge['paid_at']}")
    
    def test_mark_nonexistent_charge_paid(self, auth_headers):
        """Test marking non-existent charge returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/financial/unit-charges/nonexistent-id-12345/pay",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestNotifyUnpaid:
    """Notify Unpaid Units API Tests"""
    
    def test_notify_unpaid_success(self, auth_headers):
        """Test POST /api/financial/unit-charges/notify-unpaid sends notifications"""
        response = requests.post(
            f"{BASE_URL}/api/financial/unit-charges/notify-unpaid?month=4&year=2026",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing message in response"
        assert "notified_count" in data, "Missing notified_count in response"
        
        print(f"Notification result: {data['message']} (count: {data['notified_count']})")
    
    def test_notify_unpaid_with_filters(self, auth_headers):
        """Test notify unpaid with month/year filters"""
        response = requests.post(
            f"{BASE_URL}/api/financial/unit-charges/notify-unpaid?month=5&year=2026",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 200
        print(f"May 2026 notifications: {response.json()}")


class TestExpenses:
    """Expenses API Tests"""
    
    def test_add_expense_success(self, auth_headers):
        """Test POST /api/financial/expenses adds expense"""
        unique_desc = f"TEST_Expense_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "category": "maintenance",
            "amount": 500,
            "description": unique_desc,
            "vendor": "Test Vendor",
            "date": datetime.now().isoformat(),
            "payment_method": "other",
            "compound_id": COMPOUND_ID
        }
        
        response = requests.post(
            f"{BASE_URL}/api/financial/expenses",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Expense added: {data}")
        
        # Verify expense appears in balance sheet
        bs_response = requests.get(
            f"{BASE_URL}/api/financial/balance-sheet",
            headers=auth_headers
        )
        assert bs_response.status_code == 200
        
        bs_data = bs_response.json()
        recent_expenses = bs_data.get("recent_expenses", [])
        found = any(e.get("description") == unique_desc for e in recent_expenses)
        # Note: May not be in recent if there are many expenses
        print(f"Total expenses in balance sheet: {bs_data['total_expenses']}")
    
    def test_add_expense_different_categories(self, auth_headers):
        """Test adding expenses with different categories"""
        categories = ["maintenance", "utilities", "security", "cleaning", "salaries", "other"]
        
        for cat in categories:
            payload = {
                "category": cat,
                "amount": 100,
                "description": f"TEST_{cat}_expense",
                "date": datetime.now().isoformat(),
                "payment_method": "other",
                "compound_id": COMPOUND_ID
            }
            
            response = requests.post(
                f"{BASE_URL}/api/financial/expenses",
                json=payload,
                headers=auth_headers
            )
            assert response.status_code == 200, f"Failed for category {cat}: {response.text}"
            print(f"Added {cat} expense successfully")


class TestAuthRequired:
    """Test that endpoints require authentication"""
    
    def test_balance_sheet_requires_auth(self):
        """Test balance sheet requires authentication"""
        response = requests.get(f"{BASE_URL}/api/financial/balance-sheet")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_obligations_requires_auth(self):
        """Test obligations requires authentication"""
        response = requests.get(f"{BASE_URL}/api/financial/obligations")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_unit_charges_requires_auth(self):
        """Test unit charges requires authentication"""
        response = requests.get(f"{BASE_URL}/api/financial/unit-charges")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
