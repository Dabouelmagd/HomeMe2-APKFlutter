"""
Invoice PDF Generation & Payment History
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
import uuid
import logging
import io

from database import get_db
from auth_deps import get_current_user, require_super_admin

router = APIRouter(prefix="/api")

PLAN_NAMES = {
    "starter": "مجاني", "basic": "أساسي", "pro": "احترافي", "premium": "متقدم",
    "company_startup": "شركة ناشئة", "company_business": "شركة متوسطة", "company_enterprise": "شركة كبرى"
}
DURATION_NAMES = {
    "1_month": "شهر", "3_months": "3 شهور", "6_months": "6 شهور",
    "9_months": "9 شهور", "1_year": "سنة", "lifetime": "مدى الحياة"
}


def generate_invoice_pdf(invoice_data: dict) -> bytes:
    """Generate a PDF invoice using reportlab"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.colors import HexColor

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4

    # Colors
    primary = HexColor("#2563eb")
    dark = HexColor("#1e293b")
    gray = HexColor("#64748b")
    light_gray = HexColor("#f1f5f9")
    green = HexColor("#16a34a")

    # Header background
    c.setFillColor(primary)
    c.rect(0, h - 100, w, 100, fill=1, stroke=0)

    # Company Name
    c.setFillColor(HexColor("#ffffff"))
    c.setFont("Helvetica-Bold", 28)
    c.drawString(40, h - 55, "HomeMe")
    c.setFont("Helvetica", 10)
    c.drawString(40, h - 72, "Compound Management Platform")

    # Invoice title
    c.setFont("Helvetica-Bold", 16)
    c.drawRightString(w - 40, h - 45, "INVOICE")
    c.setFont("Helvetica", 10)
    c.drawRightString(w - 40, h - 62, f"#{invoice_data.get('invoice_number', 'N/A')}")
    c.drawRightString(w - 40, h - 78, f"Date: {invoice_data.get('date', '')}")

    # Invoice Details Section
    y = h - 140

    # Bill To
    c.setFillColor(dark)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, y, "Bill To:")
    c.setFont("Helvetica", 10)
    c.setFillColor(gray)
    c.drawString(40, y - 18, invoice_data.get("customer_name", "N/A"))
    c.drawString(40, y - 33, invoice_data.get("customer_email", ""))
    c.drawString(40, y - 48, f"Compound: {invoice_data.get('compound_name', 'N/A')}")

    # Payment Info
    c.setFillColor(dark)
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(w - 40, y, "Payment Info:")
    c.setFont("Helvetica", 10)
    c.setFillColor(gray)
    c.drawRightString(w - 40, y - 18, f"Method: {invoice_data.get('payment_method', 'N/A')}")
    c.drawRightString(w - 40, y - 33, f"Status: {invoice_data.get('status', 'Paid')}")
    c.drawRightString(w - 40, y - 48, f"Transaction: {invoice_data.get('transaction_id', 'N/A')[:20]}")

    # Table
    y -= 85
    # Header
    c.setFillColor(light_gray)
    c.rect(30, y - 5, w - 60, 25, fill=1, stroke=0)
    c.setFillColor(dark)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y + 3, "Description")
    c.drawRightString(300, y + 3, "Plan")
    c.drawRightString(420, y + 3, "Duration")
    c.drawRightString(w - 40, y + 3, "Amount")

    # Row
    y -= 30
    c.setFont("Helvetica", 10)
    c.setFillColor(gray)
    plan = invoice_data.get("plan", "basic")
    duration = invoice_data.get("duration", "1_month")
    c.drawString(40, y + 3, f"Subscription - {PLAN_NAMES.get(plan, plan)}")
    c.drawRightString(300, y + 3, PLAN_NAMES.get(plan, plan))
    c.drawRightString(420, y + 3, DURATION_NAMES.get(duration, duration))
    amount = invoice_data.get("amount", 0)
    currency = invoice_data.get("currency", "EGP").upper()
    c.setFillColor(dark)
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(w - 40, y + 3, f"{amount:,.2f} {currency}")

    # Separator
    y -= 20
    c.setStrokeColor(light_gray)
    c.setLineWidth(1)
    c.line(30, y, w - 30, y)

    # Discount (if any)
    discount = invoice_data.get("discount", 0)
    if discount > 0:
        y -= 25
        c.setFont("Helvetica", 10)
        c.setFillColor(gray)
        c.drawRightString(w - 120, y + 3, "Discount:")
        c.setFillColor(green)
        c.drawRightString(w - 40, y + 3, f"-{discount:,.2f} {currency}")

    # Total
    y -= 30
    c.setFillColor(primary)
    c.rect(w - 250, y - 8, 220, 30, fill=1, stroke=0)
    c.setFillColor(HexColor("#ffffff"))
    c.setFont("Helvetica-Bold", 12)
    total = invoice_data.get("total", amount - discount)
    c.drawRightString(w - 120, y + 3, "Total:")
    c.drawRightString(w - 40, y + 3, f"{total:,.2f} {currency}")

    # Footer
    c.setFillColor(gray)
    c.setFont("Helvetica", 8)
    c.drawCentredString(w / 2, 50, "HomeMe - Compound Management Platform | info@datalifeai.com")
    c.drawCentredString(w / 2, 38, "This is an automatically generated invoice.")

    # Paid Stamp
    if invoice_data.get("status") == "paid":
        c.saveState()
        c.setFillColor(HexColor("#16a34a30"))
        c.setStrokeColor(green)
        c.setLineWidth(3)
        c.translate(w / 2, h / 2 - 50)
        c.rotate(30)
        c.setFont("Helvetica-Bold", 48)
        c.setFillColor(HexColor("#16a34a"))
        c.setFillAlpha(0.15)
        c.drawCentredString(0, 0, "PAID")
        c.restoreState()

    c.save()
    return buf.getvalue()


async def create_invoice_record(db, transaction: dict, user: dict):
    """Create an invoice record from a payment transaction"""
    compound = None
    if user.get("compound_id"):
        compound = await db.compounds.find_one({"id": user["compound_id"]}, {"_id": 0, "name": 1})

    invoice = {
        "id": str(uuid.uuid4()),
        "invoice_number": f"INV-{datetime.now(timezone.utc).strftime('%Y%m')}-{str(uuid.uuid4())[:6].upper()}",
        "transaction_id": transaction.get("id", ""),
        "user_id": user.get("id", transaction.get("user_id", "")),
        "customer_name": user.get("full_name", user.get("username", "N/A")),
        "customer_email": user.get("email", ""),
        "compound_name": compound.get("name", "N/A") if compound else "N/A",
        "plan": transaction.get("plan", transaction.get("metadata", {}).get("plan", "basic")),
        "duration": transaction.get("duration", transaction.get("metadata", {}).get("duration", "1_month")),
        "amount": transaction.get("amount", 0),
        "discount": transaction.get("discount", 0),
        "total": transaction.get("amount", 0) - transaction.get("discount", 0),
        "currency": transaction.get("currency", "EGP").upper(),
        "payment_method": transaction.get("payment_method", "stripe"),
        "status": "paid",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.invoices.insert_one(invoice)
    invoice.pop("_id", None)
    return invoice


@router.get("/invoices")
async def get_my_invoices(current_user: dict = Depends(get_current_user)):
    """Get invoices for the current user"""
    db = get_db()
    query = {"user_id": current_user["id"]}
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)

    total_paid = sum(inv.get("total", 0) for inv in invoices)
    return {
        "invoices": invoices,
        "stats": {
            "total_invoices": len(invoices),
            "total_paid": total_paid
        }
    }


@router.get("/invoices/all")
async def get_all_invoices(current_user: dict = Depends(require_super_admin)):
    """Get all invoices (Super Admin)"""
    db = get_db()
    invoices = await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    total_revenue = sum(inv.get("total", 0) for inv in invoices)
    return {
        "invoices": invoices,
        "stats": {
            "total_invoices": len(invoices),
            "total_revenue": total_revenue
        }
    }


@router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Download invoice as PDF"""
    db = get_db()
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="فاتورة غير موجودة")
    if invoice["user_id"] != current_user["id"] and current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="غير مصرح")

    pdf_bytes = generate_invoice_pdf(invoice)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="invoice-{invoice["invoice_number"]}.pdf"'}
    )


@router.post("/invoices/generate")
async def generate_manual_invoice(current_user: dict = Depends(get_current_user)):
    """Generate invoice for current subscription (manual)"""
    db = get_db()
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="مستخدم غير موجود")

    plan = user.get("subscription_plan", "starter")
    if plan == "starter":
        raise HTTPException(status_code=400, detail="لا يمكن إنشاء فاتورة للخطة المجانية")

    # Check for recent duplicate
    recent = await db.invoices.find_one({
        "user_id": current_user["id"],
        "plan": plan,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
    })
    if recent:
        raise HTTPException(status_code=400, detail="توجد فاتورة مسجلة اليوم بالفعل")

    plan_prices = {"basic": 500, "pro": 1200, "premium": 2200, "company_startup": 3500, "company_business": 7500, "company_enterprise": 20000}
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "plan": plan,
        "duration": user.get("subscription_type", "1_month"),
        "amount": plan_prices.get(plan, 0),
        "currency": "EGP",
        "payment_method": user.get("subscription_payment_method", "manual"),
    }

    invoice = await create_invoice_record(db, transaction, user)
    return {"message": "تم إنشاء الفاتورة", "invoice": invoice}


@router.get("/payment-history")
async def get_payment_history(current_user: dict = Depends(get_current_user)):
    """Get combined payment history (transactions + invoices)"""
    db = get_db()
    user_id = current_user["id"]

    transactions = await db.payment_transactions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)

    invoices = await db.invoices.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)

    # Serialize datetime objects
    for t in transactions:
        for k, v in t.items():
            if isinstance(v, datetime):
                t[k] = v.isoformat()

    total_paid = sum(t.get("amount", 0) for t in transactions if t.get("payment_status") == "paid")

    return {
        "transactions": transactions,
        "invoices": invoices,
        "stats": {
            "total_transactions": len(transactions),
            "total_paid": total_paid,
            "total_invoices": len(invoices)
        }
    }
