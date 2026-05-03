"""
Payment Proofs — Residents upload screenshot of out-of-app payment
(Vodafone Cash / InstaPay / Bank Transfer / etc.) so the admin can
review and one-click mark the linked unit_charge as paid.

Flow:
  1. Resident sees a pending charge in ResidentFinancialDashboard.
  2. Clicks "ارفع إيصال الدفع" → opens upload modal.
  3. Submits: image + amount + method + transaction_ref + notes.
  4. Backend saves image to /app/uploads/payment_proofs/, stores a
     `payment_proofs` document with status="pending", notifies admins.
  5. Admin sees it under CompoundFinance new "إيصالات الدفع" tab.
  6. Admin reviews image, clicks Approve → unit_charge.status="paid",
     revenue entry created, resident notified. OR clicks Reject with reason.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from typing import Optional
from datetime import datetime, timezone
import os
import uuid
import logging

from database import get_db
from auth_deps import get_current_user, require_admin
from helpers import serialize_datetime, notify_compound_admins

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

PROOF_DIR = "/app/uploads/payment_proofs"
os.makedirs(PROOF_DIR, exist_ok=True)

ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".webp", ".pdf"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB


def _serialize(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    for k in ("created_at", "reviewed_at"):
        v = doc.get(k)
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


@router.post("/payment-proofs")
async def submit_payment_proof(
    request: Request,
    charge_id: Optional[str] = Form(None),
    amount: float = Form(...),
    method_type: str = Form(...),
    transaction_reference: Optional[str] = Form(""),
    notes: Optional[str] = Form(""),
    proof: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Resident uploads proof of out-of-app payment."""
    db = get_db()

    # Save image
    ext = os.path.splitext(proof.filename or "")[1].lower() or ".png"
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="صيغة الملف غير مدعومة (png/jpg/webp/pdf)")
    data = await proof.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="الحجم أكبر من 8MB")
    fname = f"{uuid.uuid4().hex}{ext}"
    fpath = os.path.join(PROOF_DIR, fname)
    try:
        with open(fpath, "wb") as f:
            f.write(data)
        # Mirror to MongoDB-backed media store (survives container restarts)
        try:
            from services.media_store import save_to_db
            await save_to_db(fname, data, proof.content_type or "image/png", "payment_proofs")
        except Exception as _e:
            logger.warning(f"payment_proofs media_store mirror failed: {_e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"تعذّر حفظ الملف: {e}")

    image_url = f"/api/files/payment_proofs/{fname}"

    # Resolve charge for context (optional)
    charge_doc = None
    if charge_id:
        charge_doc = await db.unit_charges.find_one({"id": charge_id}, {"_id": 0})

    compound_id = (charge_doc or {}).get("compound_id") or current_user.get("compound_id")

    proof_doc = {
        "id": str(uuid.uuid4()),
        "compound_id": compound_id,
        "resident_id": current_user.get("id"),
        "resident_name": current_user.get("full_name") or current_user.get("username"),
        "unit_number": (charge_doc or {}).get("unit_number") or current_user.get("unit_number"),
        "charge_id": charge_id,
        "charge_title": (charge_doc or {}).get("title"),
        "amount": float(amount),
        "method_type": method_type,
        "transaction_reference": transaction_reference or "",
        "notes": notes or "",
        "image_url": image_url,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
        "reviewed_at": None,
        "reviewed_by": None,
        "rejection_reason": None,
    }
    await db.payment_proofs.insert_one(proof_doc)

    # Notify admins
    try:
        if compound_id:
            await notify_compound_admins(
                compound_id,
                "إيصال دفع جديد للمراجعة",
                f"{proof_doc['resident_name']} (وحدة {proof_doc.get('unit_number') or '—'}) رفع إيصال بمبلغ {amount} ج.م",
                "payment_proof",
                None,
            )
    except Exception as _e:
        logger.warning(f"notify admins failed: {_e}")

    return {"message": "تم رفع الإيصال بنجاح، الإدارة ستراجعه قريباً", "proof_id": proof_doc["id"], "image_url": image_url}


@router.get("/payment-proofs/my")
async def my_payment_proofs(current_user: dict = Depends(get_current_user)):
    """Resident's submitted proofs."""
    db = get_db()
    proofs = await db.payment_proofs.find(
        {"resident_id": current_user.get("id")}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return {"proofs": [_serialize(p) for p in proofs]}


@router.get("/payment-proofs")
async def list_payment_proofs(
    status: Optional[str] = None,
    current_user: dict = Depends(require_admin),
):
    """Admin/company_admin list payment proofs scoped to compound (or company)."""
    db = get_db()
    role = current_user.get("role")
    query: dict = {}
    if status:
        query["status"] = status

    if role in ("app_owner", "super_admin"):
        pass  # global
    elif role in ("company_admin", "assistant_manager", "accountant") and current_user.get("company_id"):
        cid = current_user["company_id"]
        rows = await db.compounds.find(
            {"$or": [{"company_id": cid}, {"management_company_id": cid}]},
            {"_id": 0, "id": 1}
        ).to_list(500)
        cids = [r["id"] for r in rows if r.get("id")]
        if not cids:
            return {"proofs": [], "summary": {"pending": 0, "approved": 0, "rejected": 0}}
        query["compound_id"] = {"$in": cids}
    else:
        cid = current_user.get("compound_id")
        if not cid:
            return {"proofs": [], "summary": {"pending": 0, "approved": 0, "rejected": 0}}
        query["compound_id"] = cid

    proofs = await db.payment_proofs.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    proofs_ser = [_serialize(p) for p in proofs]
    summary = {
        "pending": len([p for p in proofs_ser if p.get("status") == "pending"]),
        "approved": len([p for p in proofs_ser if p.get("status") == "approved"]),
        "rejected": len([p for p in proofs_ser if p.get("status") == "rejected"]),
    }
    return {"proofs": proofs_ser, "summary": summary}


async def _can_review(db, current_user: dict, proof: dict) -> bool:
    role = current_user.get("role")
    if role in ("app_owner", "super_admin", "admin"):
        # admin must be in same compound
        if role == "admin" and proof.get("compound_id") != current_user.get("compound_id"):
            return False
        return True
    if role in ("company_admin", "assistant_manager", "accountant"):
        cid = proof.get("compound_id")
        if not cid:
            return True
        compound = await db.compounds.find_one(
            {"id": cid}, {"_id": 0, "company_id": 1, "management_company_id": 1}
        )
        if not compound:
            return False
        cu_company = current_user.get("company_id")
        return cu_company in (compound.get("company_id"), compound.get("management_company_id"))
    return False


@router.post("/payment-proofs/{proof_id}/approve")
async def approve_payment_proof(proof_id: str, current_user: dict = Depends(require_admin)):
    """Admin approves a proof: mark linked charge paid + create revenue + notify resident."""
    db = get_db()
    proof = await db.payment_proofs.find_one({"id": proof_id}, {"_id": 0})
    if not proof:
        raise HTTPException(status_code=404, detail="الإيصال غير موجود")
    if not await _can_review(db, current_user, proof):
        raise HTTPException(status_code=403, detail="غير مصرّح بمراجعة هذا الإيصال")
    if proof.get("status") == "approved":
        return {"message": "الإيصال معتمد مسبقاً"}

    now = datetime.now(timezone.utc)
    await db.payment_proofs.update_one(
        {"id": proof_id},
        {"$set": {
            "status": "approved",
            "reviewed_at": now,
            "reviewed_by": current_user.get("id"),
            "reviewed_by_name": current_user.get("full_name") or current_user.get("username"),
            "rejection_reason": None,
        }},
    )

    # Mark unit_charge paid + create revenue (mirror /financial/unit-charges/{id}/pay)
    if proof.get("charge_id"):
        charge = await db.unit_charges.find_one({"id": proof["charge_id"]}, {"_id": 0})
        if charge and charge.get("status") != "paid":
            await db.unit_charges.update_one(
                {"id": proof["charge_id"]},
                {"$set": {
                    "status": "paid",
                    "paid_at": now,
                    "paid_by": current_user.get("id"),
                    "paid_via_proof_id": proof_id,
                }},
            )
            await db.revenue.insert_one({
                "id": str(uuid.uuid4()),
                "source": "maintenance_fees",
                "amount": float(proof.get("amount") or charge.get("amount") or 0),
                "description": f"سداد {charge.get('title', '')} - وحدة {charge.get('unit_number', '')} (إيصال محقَّق)",
                "date": now.isoformat(),
                "payment_method": proof.get("method_type", "other"),
                "resident_id": charge.get("resident_id"),
                "compound_id": charge.get("compound_id"),
                "charge_id": proof["charge_id"],
                "proof_id": proof_id,
                "transaction_reference": proof.get("transaction_reference", ""),
                "created_by": current_user.get("username", ""),
                "created_at": now.isoformat(),
                "status": "completed",
            })

    # Notify resident
    try:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "compound_id": proof.get("compound_id"),
            "sender_id": current_user.get("id"),
            "title": "تم اعتماد إيصال الدفع ✅",
            "content": f"تم اعتماد الإيصال بمبلغ {proof.get('amount')} ج.م. سيتم تحديث الالتزام الآن.",
            "type": "payment_proof_approved",
            "recipient_ids": [proof.get("resident_id")],
            "is_read": False,
            "created_at": now,
        })
    except Exception as e:
        logger.warning(f"notify resident approve failed: {e}")

    return {"message": "تم اعتماد الإيصال وتحديث حالة الالتزام"}


@router.post("/payment-proofs/{proof_id}/reject")
async def reject_payment_proof(
    proof_id: str,
    payload: dict,
    current_user: dict = Depends(require_admin),
):
    """Admin rejects a proof with a reason. Resident is notified."""
    db = get_db()
    proof = await db.payment_proofs.find_one({"id": proof_id}, {"_id": 0})
    if not proof:
        raise HTTPException(status_code=404, detail="الإيصال غير موجود")
    if not await _can_review(db, current_user, proof):
        raise HTTPException(status_code=403, detail="غير مصرّح بمراجعة هذا الإيصال")
    reason = (payload or {}).get("reason", "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="السبب مطلوب")

    now = datetime.now(timezone.utc)
    await db.payment_proofs.update_one(
        {"id": proof_id},
        {"$set": {
            "status": "rejected",
            "reviewed_at": now,
            "reviewed_by": current_user.get("id"),
            "reviewed_by_name": current_user.get("full_name") or current_user.get("username"),
            "rejection_reason": reason,
        }},
    )

    try:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "compound_id": proof.get("compound_id"),
            "sender_id": current_user.get("id"),
            "title": "تم رفض إيصال الدفع",
            "content": f"السبب: {reason}",
            "type": "payment_proof_rejected",
            "recipient_ids": [proof.get("resident_id")],
            "is_read": False,
            "created_at": now,
        })
    except Exception as e:
        logger.warning(f"notify resident reject failed: {e}")

    return {"message": "تم رفض الإيصال", "reason": reason}


@router.delete("/payment-proofs/{proof_id}")
async def delete_payment_proof(proof_id: str, current_user: dict = Depends(get_current_user)):
    """Resident can delete own pending proof; admins can delete any."""
    db = get_db()
    proof = await db.payment_proofs.find_one({"id": proof_id}, {"_id": 0})
    if not proof:
        raise HTTPException(status_code=404, detail="الإيصال غير موجود")
    role = current_user.get("role")
    is_owner = proof.get("resident_id") == current_user.get("id")
    is_admin = role in ("admin", "compound_admin", "company_admin", "assistant_manager", "accountant", "app_owner", "super_admin")
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="غير مصرّح")
    if is_owner and not is_admin and proof.get("status") != "pending":
        raise HTTPException(status_code=400, detail="لا يمكن حذف إيصال تمت مراجعته")
    await db.payment_proofs.delete_one({"id": proof_id})
    return {"message": "تم حذف الإيصال"}
