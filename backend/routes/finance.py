"""
Financial Management routes - Expenses, Revenue, Obligations, Balance Sheet
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional, Dict
import uuid
import logging

from database import get_db
from auth_deps import get_current_user, require_admin
from helpers import serialize_datetime
from activity_logger import ActivityLogger
from financial_models import ExpenseCreate, RevenueCreate

router = APIRouter(prefix="/api")


class ObligationCreate(BaseModel):
    title: str
    description: str = ""
    total_amount: float
    month: int
    year: int
    category: str = "maintenance"
    distribution_method: str = "equal"
    unit_area_field: str = ""
    custom_amounts: Optional[Dict[str, float]] = None
    percentage_rates: Optional[Dict[str, float]] = None


@router.post("/financial/expenses")
async def create_expense(expense_data: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    try:
        expense = {
            "id": str(uuid.uuid4()),
            "category": expense_data.category,
            "amount": expense_data.amount,
            "description": expense_data.description,
            "date": expense_data.date,
            "payment_method": expense_data.payment_method,
            "vendor": expense_data.vendor,
            "receipt_url": expense_data.receipt_url,
            "compound_id": expense_data.compound_id,
            "created_by": current_user.get("username", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        }
        await db.expenses.insert_one(expense)
        await ActivityLogger.log_activity(action_type="expense_created", username=current_user.get("username", ""), details=f"Created expense: {expense_data.description} - ${expense_data.amount}", status="success")
        expense.pop("_id", None)
        return {"success": True, "expense": expense}
    except Exception as e:
        logging.error(f"Error creating expense: {e}")
        raise HTTPException(status_code=500, detail="Failed to create expense")


@router.get("/financial/expenses")
async def get_expenses(compound_id: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    try:
        query = {}
        if compound_id:
            query["compound_id"] = compound_id
        if category:
            query["category"] = category
        if start_date and end_date:
            query["date"] = {"$gte": start_date, "$lte": end_date}
        expenses = await db.expenses.find(query).sort("date", -1).to_list(length=10000)
        return {"expenses": expenses}
    except Exception as e:
        logging.error(f"Error fetching expenses: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch expenses")


@router.post("/financial/revenue")
async def create_revenue(revenue_data: RevenueCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    try:
        revenue = {
            "id": str(uuid.uuid4()),
            "source": revenue_data.source,
            "amount": revenue_data.amount,
            "description": revenue_data.description,
            "date": revenue_data.date,
            "payment_method": revenue_data.payment_method,
            "resident_id": revenue_data.resident_id,
            "compound_id": revenue_data.compound_id,
            "created_by": current_user.get("username", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        }
        await db.revenue.insert_one(revenue)
        if revenue_data.resident_id:
            await db.resident_payments.insert_one({
                "id": str(uuid.uuid4()),
                "resident_id": revenue_data.resident_id,
                "compound_id": revenue_data.compound_id,
                "amount": revenue_data.amount,
                "payment_method": revenue_data.payment_method,
                "payment_date": revenue_data.date,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        await ActivityLogger.log_activity(action_type="revenue_created", username=current_user.get("username", ""), details=f"Created revenue: {revenue_data.description} - ${revenue_data.amount}", status="success")
        return {"success": True, "revenue": revenue}
    except Exception as e:
        logging.error(f"Error creating revenue: {e}")
        raise HTTPException(status_code=500, detail="Failed to create revenue")


@router.get("/financial/revenue")
async def get_revenue(compound_id: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, source: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    try:
        query = {}
        if compound_id:
            query["compound_id"] = compound_id
        if source:
            query["source"] = source
        if start_date and end_date:
            query["date"] = {"$gte": start_date, "$lte": end_date}
        revenue = await db.revenue.find(query).sort("date", -1).to_list(length=10000)
        return {"revenue": revenue}
    except Exception as e:
        logging.error(f"Error fetching revenue: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch revenue")


@router.get("/financial/reports/summary")
async def get_financial_summary(compound_id: str, start_date: str, end_date: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    try:
        expenses = await db.expenses.find({"compound_id": compound_id, "date": {"$gte": start_date, "$lte": end_date}}).to_list(length=10000)
        revenue = await db.revenue.find({"compound_id": compound_id, "date": {"$gte": start_date, "$lte": end_date}}).to_list(length=10000)
        total_expenses = sum(e["amount"] for e in expenses)
        total_revenue = sum(r["amount"] for r in revenue)
        net_profit = total_revenue - total_expenses
        profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0
        expenses_by_category = {}
        for e in expenses:
            cat = e["category"]
            expenses_by_category[cat] = expenses_by_category.get(cat, 0) + e["amount"]
        revenue_by_source = {}
        for r in revenue:
            src = r["source"]
            revenue_by_source[src] = revenue_by_source.get(src, 0) + r["amount"]
        return {"period": "custom", "start_date": start_date, "end_date": end_date, "total_expenses": total_expenses, "total_revenue": total_revenue, "net_profit": net_profit, "profit_margin": round(profit_margin, 2), "expenses_by_category": expenses_by_category, "revenue_by_source": revenue_by_source}
    except Exception as e:
        logging.error(f"Error generating financial summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate summary")


@router.post("/financial/obligations")
async def create_obligation(data: ObligationCreate, current_user: dict = Depends(require_admin)):
    db = get_db()
    try:
        compound_id = current_user["compound_id"]
        families = await db.families.find({"compound_id": compound_id}, {"_id": 0}).to_list(100)
        if not families:
            raise HTTPException(status_code=400, detail="No units found in compound")

        unit_count = len(families)
        family_heads = {}
        for family in families:
            head = await db.users.find_one({"id": {"$in": family.get("members", [])}, "is_family_head": True}, {"_id": 0, "id": 1, "full_name": 1, "unit_number": 1, "unit_area": 1})
            if not head:
                head = await db.users.find_one({"id": {"$in": family.get("members", [])}}, {"_id": 0, "id": 1, "full_name": 1, "unit_number": 1, "unit_area": 1})
            if head:
                family_heads[family["id"]] = head

        unit_amounts = {}
        method_label = "بالتساوي"

        if data.distribution_method == "equal":
            per_unit = round(data.total_amount / unit_count, 2)
            for fid in family_heads:
                unit_amounts[fid] = per_unit
            method_label = "بالتساوي"
        elif data.distribution_method == "per_sqm":
            total_area = sum(float(head.get("unit_area", 100)) for head in family_heads.values())
            if total_area > 0:
                for fid, head in family_heads.items():
                    area = float(head.get("unit_area", 100))
                    unit_amounts[fid] = round((area / total_area) * data.total_amount, 2)
            else:
                per_unit = round(data.total_amount / unit_count, 2)
                for fid in family_heads:
                    unit_amounts[fid] = per_unit
            method_label = "حسب المساحة"
        elif data.distribution_method == "percentage":
            if data.percentage_rates:
                for fid, pct in data.percentage_rates.items():
                    if fid in family_heads:
                        unit_amounts[fid] = round(data.total_amount * (pct / 100), 2)
            assigned = sum(unit_amounts.values())
            remaining = [fid for fid in family_heads if fid not in unit_amounts]
            if remaining and assigned < data.total_amount:
                each = round((data.total_amount - assigned) / len(remaining), 2)
                for fid in remaining:
                    unit_amounts[fid] = each
            method_label = "نسبة مئوية"
        elif data.distribution_method == "custom":
            if data.custom_amounts:
                for fid, amt in data.custom_amounts.items():
                    if fid in family_heads:
                        unit_amounts[fid] = float(amt)
            assigned = sum(unit_amounts.values())
            remaining = [fid for fid in family_heads if fid not in unit_amounts]
            if remaining:
                each = round(max(0, data.total_amount - assigned) / len(remaining), 2)
                for fid in remaining:
                    unit_amounts[fid] = each
            method_label = "مبلغ مخصص"
        else:
            per_unit = round(data.total_amount / unit_count, 2)
            for fid in family_heads:
                unit_amounts[fid] = per_unit

        obligation_id = str(uuid.uuid4())
        obligation = {
            "id": obligation_id, "compound_id": compound_id, "title": data.title, "description": data.description,
            "total_amount": data.total_amount, "distribution_method": data.distribution_method,
            "distribution_label": method_label, "unit_count": unit_count,
            "month": data.month, "year": data.year, "category": data.category,
            "created_by": current_user["id"], "created_at": datetime.now(timezone.utc)
        }
        await db.obligations.insert_one(obligation)

        charges_created = 0
        for family in families:
            fid = family["id"]
            head = family_heads.get(fid)
            if not head:
                continue
            amount = unit_amounts.get(fid, 0)
            if amount <= 0:
                continue
            charge = {
                "id": str(uuid.uuid4()), "obligation_id": obligation_id, "compound_id": compound_id,
                "resident_id": head["id"], "resident_name": head.get("full_name", ""),
                "unit_number": head.get("unit_number", ""), "family_id": fid,
                "title": data.title, "category": data.category, "amount": amount,
                "month": data.month, "year": data.year, "status": "pending",
                "paid_at": None, "created_at": datetime.now(timezone.utc)
            }
            await db.unit_charges.insert_one(charge)
            charges_created += 1

        await db.expenses.insert_one({
            "id": str(uuid.uuid4()), "category": data.category,
            "amount": data.total_amount, "description": data.title + " - " + data.description,
            "date": datetime.now(timezone.utc).isoformat(), "payment_method": "other",
            "compound_id": compound_id, "obligation_id": obligation_id,
            "created_by": current_user.get("username", ""),
            "created_at": datetime.now(timezone.utc).isoformat(), "status": "completed"
        })

        return {
            "message": f"تم إنشاء الالتزام وتوزيعه على {charges_created} وحدة ({method_label})",
            "obligation_id": obligation_id, "distribution_method": data.distribution_method,
            "units_charged": charges_created,
            "unit_amounts": {family_heads[fid].get("unit_number", fid): amt for fid, amt in unit_amounts.items() if fid in family_heads}
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating obligation: {e}")
        raise HTTPException(status_code=500, detail="Failed to create obligation")


@router.get("/financial/obligations")
async def get_obligations(month: Optional[int] = None, year: Optional[int] = None, current_user: dict = Depends(require_admin)):
    db = get_db()
    try:
        query = {"compound_id": current_user["compound_id"]}
        if month:
            query["month"] = month
        if year:
            query["year"] = year
        obligations = await db.obligations.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
        return {"obligations": serialize_datetime(obligations)}
    except Exception as e:
        logging.error(f"Error fetching obligations: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch obligations")


@router.get("/financial/unit-charges")
async def get_unit_charges(obligation_id: Optional[str] = None, month: Optional[int] = None, year: Optional[int] = None, status: Optional[str] = None, current_user: dict = Depends(require_admin)):
    db = get_db()
    try:
        query = {"compound_id": current_user["compound_id"]}
        if obligation_id:
            query["obligation_id"] = obligation_id
        if month:
            query["month"] = month
        if year:
            query["year"] = year
        if status:
            query["status"] = status
        charges = await db.unit_charges.find(query, {"_id": 0}).sort("unit_number", 1).to_list(500)
        total = len(charges)
        paid = len([c for c in charges if c.get("status") == "paid"])
        unpaid = total - paid
        total_amount = sum(c.get("amount", 0) for c in charges)
        paid_amount = sum(c.get("amount", 0) for c in charges if c.get("status") == "paid")
        return {
            "charges": serialize_datetime(charges),
            "summary": {"total": total, "paid": paid, "unpaid": unpaid, "total_amount": total_amount, "paid_amount": paid_amount, "unpaid_amount": total_amount - paid_amount}
        }
    except Exception as e:
        logging.error(f"Error fetching unit charges: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch unit charges")


@router.put("/financial/unit-charges/{charge_id}/pay")
async def mark_charge_paid(charge_id: str, current_user: dict = Depends(require_admin)):
    db = get_db()
    try:
        charge = await db.unit_charges.find_one({"id": charge_id, "compound_id": current_user["compound_id"]})
        if not charge:
            raise HTTPException(status_code=404, detail="Charge not found")
        now = datetime.now(timezone.utc)
        await db.unit_charges.update_one({"id": charge_id}, {"$set": {"status": "paid", "paid_at": now, "paid_by": current_user["id"]}})
        await db.revenue.insert_one({
            "id": str(uuid.uuid4()), "source": "maintenance_fees",
            "amount": charge["amount"],
            "description": f"سداد {charge.get('title', '')} - وحدة {charge.get('unit_number', '')}",
            "date": now.isoformat(), "payment_method": "other",
            "resident_id": charge.get("resident_id"), "compound_id": current_user["compound_id"],
            "charge_id": charge_id, "created_by": current_user.get("username", ""),
            "created_at": now.isoformat(), "status": "completed"
        })
        return {"message": "تم تسجيل السداد بنجاح", "charge_id": charge_id}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error marking charge paid: {e}")
        raise HTTPException(status_code=500, detail="Failed to update charge")


@router.post("/financial/unit-charges/notify-unpaid")
async def notify_unpaid_units(obligation_id: str = "", month: Optional[int] = None, year: Optional[int] = None, current_user: dict = Depends(require_admin)):
    db = get_db()
    try:
        query = {"compound_id": current_user["compound_id"], "status": "pending"}
        if obligation_id:
            query["obligation_id"] = obligation_id
        if month:
            query["month"] = month
        if year:
            query["year"] = year
        unpaid = await db.unit_charges.find(query, {"_id": 0}).to_list(500)
        notified = 0
        for charge in unpaid:
            resident_id = charge.get("resident_id")
            if not resident_id:
                continue
            notification = {
                "id": str(uuid.uuid4()), "compound_id": current_user["compound_id"],
                "sender_id": "system", "title": "تذكير بسداد التزام",
                "content": f"يرجى سداد التزام '{charge.get('title', '')}' بمبلغ {charge.get('amount', 0)} - شهر {charge.get('month')}/{charge.get('year')}",
                "type": "payment_reminder", "recipient_ids": [resident_id],
                "is_read": False, "created_at": datetime.now(timezone.utc)
            }
            await db.notifications.insert_one(notification)
            notified += 1
        return {"message": f"تم إرسال {notified} إشعار للوحدات المتأخرة", "notified_count": notified}
    except Exception as e:
        logging.error(f"Error notifying unpaid: {e}")
        raise HTTPException(status_code=500, detail="Failed to send notifications")


@router.get("/financial/balance-sheet")
async def get_balance_sheet(year: Optional[int] = None, current_user: dict = Depends(require_admin)):
    db = get_db()
    try:
        compound_id = current_user["compound_id"]
        current_year = year or datetime.now().year
        expenses = await db.expenses.find({"compound_id": compound_id}, {"_id": 0}).to_list(500)
        total_expenses = sum(float(e.get("amount", 0)) for e in expenses)
        exp_by_cat = {}
        for e in expenses:
            cat = e.get("category", "other")
            exp_by_cat[cat] = exp_by_cat.get(cat, 0) + float(e.get("amount", 0))
        revenues = await db.revenue.find({"compound_id": compound_id}, {"_id": 0}).to_list(500)
        total_revenue = sum(float(r.get("amount", 0)) for r in revenues)
        rev_by_src = {}
        for r in revenues:
            src = r.get("source", "other")
            rev_by_src[src] = rev_by_src.get(src, 0) + float(r.get("amount", 0))
        all_charges = await db.unit_charges.find({"compound_id": compound_id}, {"_id": 0}).to_list(1000)
        total_charged = sum(float(c.get("amount", 0)) for c in all_charges)
        total_collected = sum(float(c.get("amount", 0)) for c in all_charges if c.get("status") == "paid")
        monthly = {}
        for e in expenses:
            date_str = e.get("date", e.get("created_at", ""))
            if date_str:
                m = date_str[:7]
                if m not in monthly:
                    monthly[m] = {"expenses": 0, "revenue": 0}
                monthly[m]["expenses"] += float(e.get("amount", 0))
        for r in revenues:
            date_str = r.get("date", r.get("created_at", ""))
            if date_str:
                m = date_str[:7]
                if m not in monthly:
                    monthly[m] = {"expenses": 0, "revenue": 0}
                monthly[m]["revenue"] += float(r.get("amount", 0))
        return {
            "compound_id": compound_id, "year": current_year,
            "total_expenses": round(total_expenses, 2), "total_revenue": round(total_revenue, 2),
            "net_balance": round(total_revenue - total_expenses, 2),
            "expenses_by_category": exp_by_cat, "revenue_by_source": rev_by_src,
            "obligations": {"total_charged": round(total_charged, 2), "total_collected": round(total_collected, 2), "total_outstanding": round(total_charged - total_collected, 2), "collection_rate": round((total_collected / total_charged * 100) if total_charged > 0 else 0, 1)},
            "monthly_breakdown": dict(sorted(monthly.items())),
            "recent_expenses": serialize_datetime(expenses[:10]),
            "recent_revenue": serialize_datetime(revenues[:10])
        }
    except Exception as e:
        logging.error(f"Error getting balance sheet: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate balance sheet")


@router.get("/financial/residents/{resident_id}/account")
async def get_resident_account(resident_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get("role") != "admin" and current_user["id"] != resident_id:
        raise HTTPException(status_code=403, detail="Access denied")
    try:
        resident = await db.users.find_one({"id": resident_id})
        if not resident:
            raise HTTPException(status_code=404, detail="Resident not found")
        charges = await db.resident_charges.find({"resident_id": resident_id}).to_list(length=10000)
        payments = await db.resident_payments.find({"resident_id": resident_id}).sort("payment_date", -1).to_list(length=10000)
        total_charges = sum(c["amount"] for c in charges)
        total_payments = sum(p["amount"] for p in payments)
        pending_charges = [c for c in charges if c.get("status") == "pending"]
        return {"resident_id": resident_id, "resident_name": resident.get("full_name"), "unit_number": resident.get("unit_number"), "total_charges": total_charges, "total_payments": total_payments, "balance": total_charges - total_payments, "pending_charges": pending_charges, "recent_payments": payments[:10]}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching resident account: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch account")


@router.post("/financial/residents/payments")
async def create_resident_payment(payment_data: dict, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        resident_id = payment_data.get("resident_id")
        if current_user.get("role") != "admin" and current_user["id"] != resident_id:
            raise HTTPException(status_code=403, detail="Access denied")
        payment = {
            "id": str(uuid.uuid4()), "resident_id": resident_id,
            "compound_id": payment_data.get("compound_id"), "amount": payment_data.get("amount"),
            "payment_method": payment_data.get("payment_method"),
            "payment_date": datetime.now(timezone.utc).isoformat(),
            "reference": payment_data.get("reference"), "notes": payment_data.get("notes"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.resident_payments.insert_one(payment)
        if payment_data.get("reference") and payment_data["reference"].startswith("CHARGE-"):
            charge_id = payment_data["reference"].replace("CHARGE-", "")
            await db.resident_charges.update_one({"id": charge_id}, {"$set": {"status": "paid"}})
        await ActivityLogger.log_activity(action_type="payment_created", username=current_user.get("username", ""), details=f"Payment of ${payment_data.get('amount')} made", status="success")
        return {"success": True, "payment": payment}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating payment: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment")


@router.get("/financial/residents/payments/{payment_id}/receipt")
async def get_payment_receipt(payment_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        payment = await db.resident_payments.find_one({"id": payment_id})
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        if current_user.get("role") != "admin" and current_user["id"] != payment.get("resident_id"):
            raise HTTPException(status_code=403, detail="Access denied")
        receipt_text = f"PAYMENT RECEIPT\nReceipt ID: {payment_id}\nDate: {payment.get('payment_date')}\nAmount: ${payment.get('amount')}\nMethod: {payment.get('payment_method')}"
        return {"receipt": receipt_text, "payment": payment}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating receipt: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate receipt")
