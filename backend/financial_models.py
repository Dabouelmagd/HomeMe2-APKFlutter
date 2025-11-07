"""
Financial Management Models for HomeMe
Handles expenses, revenue, resident accounts, and financial reports
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ==================== ENUMS ====================

class ExpenseCategory(str, Enum):
    MAINTENANCE = "maintenance"
    SALARIES = "salaries"
    UTILITIES = "utilities"
    SECURITY = "security"
    CLEANING = "cleaning"
    OTHER = "other"

class RevenueSource(str, Enum):
    MAINTENANCE_FEES = "maintenance_fees"
    LATE_FEES = "late_fees"
    ADDITIONAL_SERVICES = "additional_services"
    RENTALS = "rentals"
    OTHER = "other"

class PaymentMethod(str, Enum):
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    CREDIT_CARD = "credit_card"
    OTHER = "other"

class TransactionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

# ==================== EXPENSE MODELS ====================

class ExpenseCreate(BaseModel):
    category: ExpenseCategory
    amount: float = Field(..., gt=0)
    description: str
    date: str  # ISO format
    payment_method: PaymentMethod
    vendor: Optional[str] = None
    receipt_url: Optional[str] = None  # URL to uploaded document
    compound_id: str

class Expense(BaseModel):
    id: str
    category: ExpenseCategory
    amount: float
    description: str
    date: str
    payment_method: PaymentMethod
    vendor: Optional[str] = None
    receipt_url: Optional[str] = None
    compound_id: str
    created_by: str
    created_at: str
    status: TransactionStatus = TransactionStatus.COMPLETED

# ==================== REVENUE MODELS ====================

class RevenueCreate(BaseModel):
    source: RevenueSource
    amount: float = Field(..., gt=0)
    description: str
    date: str
    payment_method: PaymentMethod
    resident_id: Optional[str] = None  # If payment from a specific resident
    compound_id: str

class Revenue(BaseModel):
    id: str
    source: RevenueSource
    amount: float
    description: str
    date: str
    payment_method: PaymentMethod
    resident_id: Optional[str] = None
    compound_id: str
    created_by: str
    created_at: str
    status: TransactionStatus = TransactionStatus.COMPLETED

# ==================== RESIDENT ACCOUNT MODELS ====================

class ResidentCharge(BaseModel):
    """Charges/dues for a resident"""
    id: str
    resident_id: str
    compound_id: str
    charge_type: str  # "maintenance_fee", "utility_bill", "penalty", etc.
    amount: float
    description: str
    due_date: str
    status: str  # "pending", "paid", "overdue"
    created_at: str

class ResidentPayment(BaseModel):
    """Payment made by a resident"""
    id: str
    resident_id: str
    compound_id: str
    amount: float
    payment_method: PaymentMethod
    payment_date: str
    reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

class ResidentAccountSummary(BaseModel):
    """Summary of a resident's account"""
    resident_id: str
    resident_name: str
    unit_number: str
    total_charges: float
    total_payments: float
    balance: float  # Negative means resident owes, positive means credit
    pending_charges: List[ResidentCharge]
    recent_payments: List[ResidentPayment]

# ==================== FINANCIAL REPORT MODELS ====================

class MonthlyReport(BaseModel):
    month: str  # "2025-01"
    total_expenses: float
    total_revenue: float
    net_profit: float
    expenses_by_category: dict
    revenue_by_source: dict

class FinancialSummary(BaseModel):
    """Overall financial summary"""
    period: str  # "monthly", "yearly", "custom"
    start_date: str
    end_date: str
    total_expenses: float
    total_revenue: float
    net_profit: float
    profit_margin: float  # Percentage
    top_expense_categories: List[dict]
    top_revenue_sources: List[dict]
