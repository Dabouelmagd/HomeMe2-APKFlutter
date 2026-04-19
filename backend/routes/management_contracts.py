"""
Management Contracts — عقود إدارة الشركات للمجمعات
Links a management company to a compound with commission %, dates, fees, PDF attachment,
auto-renewal, and 30-day expiry alerts. Used by Super Admin/Owner for monetization tracking.
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging
import uuid
import base64

from database import get_db
from auth_deps import require_super_admin
from helpers import serialize_datetime

router = APIRouter(prefix="/api")

VALID_STATUS = ["active", "expired", "cancelled", "pending"]
VALID_BILLING = ["monthly", "yearly", "per_unit", "one_time"]


def _compute_status(contract: dict) -> str:
    """Auto-compute status based on dates unless cancelled."""
    if contract.get("status") == "cancelled":
        return "cancelled"
    end = contract.get("end_date")
    if not end:
        return contract.get("status", "active")
    try:
        end_dt = datetime.fromisoformat(end.replace("Z", "+00:00")) if isinstance(end, str) else end
        if end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        if end_dt < now:
            return "expired"
        return "active"
    except Exception:
        return contract.get("status", "active")


@router.post("/super-admin/management-contracts")
async def create_management_contract(payload: dict, current_user: dict = Depends(require_super_admin)):
    """إنشاء عقد إدارة بين شركة ومجمع"""
    db = get_db()
    company_id = payload.get("company_id")
    compound_id = payload.get("compound_id")
    if not company_id or not compound_id:
        raise HTTPException(status_code=400, detail="company_id و compound_id مطلوبان")

    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="الشركة غير موجودة")
    if not compound:
        raise HTTPException(status_code=404, detail="المجمع غير موجود")

    try:
        commission = float(payload.get("commission_percent") or 0)
        fixed_fee = float(payload.get("fixed_fee") or 0)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="العمولة/الرسوم يجب أن تكون أرقامًا")
    if commission < 0 or commission > 100:
        raise HTTPException(status_code=400, detail="نسبة العمولة بين 0 و 100")

    billing = payload.get("billing_cycle") or "monthly"
    if billing not in VALID_BILLING:
        raise HTTPException(status_code=400, detail=f"billing_cycle غير صالح: {VALID_BILLING}")

    doc = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "company_name": company.get("name"),
        "compound_id": compound_id,
        "compound_name": compound.get("name"),
        "start_date": payload.get("start_date") or datetime.now(timezone.utc).date().isoformat(),
        "end_date": payload.get("end_date"),
        "commission_percent": commission,
        "fixed_fee": fixed_fee,
        "billing_cycle": billing,
        "currency": payload.get("currency") or "EGP",
        "auto_renew": bool(payload.get("auto_renew") or False),
        "renewal_period_months": int(payload.get("renewal_period_months") or 12),
        "status": payload.get("status") or "active",
        "notes": payload.get("notes") or "",
        "pdf_filename": None,
        "pdf_data_url": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id"),
    }
    if doc["status"] not in VALID_STATUS:
        raise HTTPException(status_code=400, detail=f"status غير صالح: {VALID_STATUS}")

    # Optional inline PDF (base64 data URL up to a sane size)
    pdf = payload.get("pdf_data_url")
    if pdf and isinstance(pdf, str) and pdf.startswith("data:application/pdf"):
        # max 5 MB base64 (~3.6 MB binary)
        if len(pdf) > 6_500_000:
            raise HTTPException(status_code=400, detail="حجم ملف العقد يتجاوز 5MB")
        doc["pdf_data_url"] = pdf
        doc["pdf_filename"] = payload.get("pdf_filename") or "contract.pdf"

    await db.management_contracts.insert_one(doc)
    doc.pop("_id", None)
    doc["status"] = _compute_status(doc)
    return {"success": True, "contract": serialize_datetime(doc)}


@router.get("/super-admin/management-contracts")
async def list_management_contracts(
    company_id: Optional[str] = None,
    compound_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(require_super_admin),
):
    """قائمة عقود الإدارة مع فلترة اختيارية"""
    db = get_db()
    q = {}
    if company_id:
        q["company_id"] = company_id
    if compound_id:
        q["compound_id"] = compound_id
    contracts = await db.management_contracts.find(q, {"_id": 0, "pdf_data_url": 0}).sort("created_at", -1).to_list(500)
    now = datetime.now(timezone.utc)
    expiring_soon = []
    for c in contracts:
        c["status"] = _compute_status(c)
        # flag expiring within 30 days
        end = c.get("end_date")
        if end and c["status"] == "active":
            try:
                end_dt = datetime.fromisoformat(end.replace("Z", "+00:00")) if isinstance(end, str) else end
                if end_dt.tzinfo is None:
                    end_dt = end_dt.replace(tzinfo=timezone.utc)
                days_left = (end_dt - now).days
                c["days_until_expiry"] = days_left
                if 0 <= days_left <= 30:
                    expiring_soon.append(c["id"])
            except Exception:
                pass
    if status:
        contracts = [c for c in contracts if c.get("status") == status]
    # Summary
    summary = {
        "total": len(contracts),
        "active": sum(1 for c in contracts if c.get("status") == "active"),
        "expired": sum(1 for c in contracts if c.get("status") == "expired"),
        "cancelled": sum(1 for c in contracts if c.get("status") == "cancelled"),
        "expiring_soon_count": len(expiring_soon),
    }
    return {"contracts": serialize_datetime(contracts), "summary": summary, "expiring_soon_ids": expiring_soon}


@router.get("/super-admin/management-contracts/{contract_id}")
async def get_management_contract(contract_id: str, current_user: dict = Depends(require_super_admin)):
    db = get_db()
    c = await db.management_contracts.find_one({"id": contract_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="العقد غير موجود")
    c["status"] = _compute_status(c)
    return serialize_datetime(c)


@router.put("/super-admin/management-contracts/{contract_id}")
async def update_management_contract(contract_id: str, payload: dict, current_user: dict = Depends(require_super_admin)):
    db = get_db()
    c = await db.management_contracts.find_one({"id": contract_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="العقد غير موجود")
    allowed = ["start_date", "end_date", "commission_percent", "fixed_fee", "billing_cycle",
               "currency", "auto_renew", "renewal_period_months", "status", "notes",
               "pdf_data_url", "pdf_filename"]
    update = {}
    for k in allowed:
        if k in payload:
            update[k] = payload[k]
    if "commission_percent" in update:
        try:
            v = float(update["commission_percent"])
            if v < 0 or v > 100:
                raise ValueError()
            update["commission_percent"] = v
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="نسبة العمولة بين 0 و 100")
    if "billing_cycle" in update and update["billing_cycle"] not in VALID_BILLING:
        raise HTTPException(status_code=400, detail=f"billing_cycle غير صالح: {VALID_BILLING}")
    if "status" in update and update["status"] not in VALID_STATUS:
        raise HTTPException(status_code=400, detail=f"status غير صالح: {VALID_STATUS}")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.management_contracts.update_one({"id": contract_id}, {"$set": update})
    refreshed = await db.management_contracts.find_one({"id": contract_id}, {"_id": 0})
    refreshed["status"] = _compute_status(refreshed)
    return {"success": True, "contract": serialize_datetime(refreshed)}


@router.delete("/super-admin/management-contracts/{contract_id}")
async def delete_management_contract(contract_id: str, current_user: dict = Depends(require_super_admin)):
    db = get_db()
    r = await db.management_contracts.delete_one({"id": contract_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="العقد غير موجود")
    return {"success": True}


@router.get("/super-admin/management-contracts/{contract_id}/pdf")
async def download_management_contract_pdf(contract_id: str, current_user: dict = Depends(require_super_admin)):
    """تنزيل ملف PDF المرفق بالعقد (data URL → bytes)."""
    from fastapi.responses import Response
    db = get_db()
    c = await db.management_contracts.find_one({"id": contract_id}, {"_id": 0})
    if not c or not c.get("pdf_data_url"):
        raise HTTPException(status_code=404, detail="لا يوجد ملف PDF مرفق")
    data_url = c["pdf_data_url"]
    try:
        header, b64 = data_url.split(",", 1)
        content = base64.b64decode(b64)
    except Exception:
        raise HTTPException(status_code=500, detail="تعذّر قراءة الملف")
    filename = c.get("pdf_filename") or f"contract_{contract_id}.pdf"
    return Response(content=content, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.post("/super-admin/management-contracts/process-auto-renew")
async def process_auto_renew_contracts(current_user: dict = Depends(require_super_admin)):
    """تجديد تلقائي لكل عقد auto_renew منتهٍ اليوم أو خلال 24h ماضية."""
    db = get_db()
    now = datetime.now(timezone.utc)
    contracts = await db.management_contracts.find({"auto_renew": True}, {"_id": 0}).to_list(500)
    renewed = []
    for c in contracts:
        end = c.get("end_date")
        if not end:
            continue
        try:
            end_dt = datetime.fromisoformat(end.replace("Z", "+00:00")) if isinstance(end, str) else end
            if end_dt.tzinfo is None:
                end_dt = end_dt.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        if end_dt > now:
            continue
        months = int(c.get("renewal_period_months") or 12)
        new_end = (end_dt + timedelta(days=30 * months)).isoformat()
        await db.management_contracts.update_one(
            {"id": c["id"]},
            {"$set": {"end_date": new_end, "status": "active", "last_renewed_at": now.isoformat()}}
        )
        renewed.append({"id": c["id"], "new_end_date": new_end})
    return {"success": True, "renewed": renewed, "count": len(renewed)}
