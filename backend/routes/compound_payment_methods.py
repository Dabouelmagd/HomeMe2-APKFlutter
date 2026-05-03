"""
Compound Payment Methods - Each compound/management company can configure
their own payment collection channels (mobile wallets, InstaPay, bank transfer, cash).

Residents see active methods on the payment page so they know where/how to send
maintenance fees, installments, and other charges.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, List
import uuid
import logging

from database import get_db
from auth_deps import get_current_user, require_admin

router = APIRouter(prefix="/api")

# Supported method types -> Arabic labels (frontend may extend)
METHOD_TYPES = {
    "vodafone_cash": "فودافون كاش",
    "orange_cash": "أورانج كاش",
    "etisalat_cash": "اتصالات كاش",
    "we_pay": "WE Pay",
    "instapay": "إنستاباي",
    "bank_transfer": "تحويل بنكي",
    "cash": "نقداً بمكتب الإدارة",
    "fawry": "فوري",
    "valu": "ڤاليو",
    "meeza": "ميزة",
    "other": "طريقة أخرى",
}


class PaymentMethodCreate(BaseModel):
    method_type: str
    display_name: Optional[str] = ""
    account_number: str = ""
    account_holder: str = ""
    bank_name: str = ""
    iban: str = ""
    swift_code: str = ""
    instructions: str = ""
    fee_note: str = ""
    is_active: bool = True
    sort_order: int = 0


class PaymentMethodUpdate(BaseModel):
    method_type: Optional[str] = None
    display_name: Optional[str] = None
    account_number: Optional[str] = None
    account_holder: Optional[str] = None
    bank_name: Optional[str] = None
    iban: Optional[str] = None
    swift_code: Optional[str] = None
    instructions: Optional[str] = None
    fee_note: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    for k in ("created_at", "updated_at"):
        v = doc.get(k)
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


def _scope_query(current_user: dict) -> dict:
    """Scope payment methods to either compound or management company."""
    role = current_user.get("role")
    if role in ("company_admin", "assistant_manager", "accountant") and current_user.get("company_id"):
        return {"company_id": current_user["company_id"]}
    cid = current_user.get("compound_id")
    if not cid:
        raise HTTPException(status_code=400, detail="No compound or company context")
    return {"compound_id": cid}


@router.get("/compound-payment-methods/types")
async def get_method_types(current_user: dict = Depends(get_current_user)):
    """Return the list of supported payment method types with Arabic labels."""
    return {
        "types": [{"key": k, "label_ar": v} for k, v in METHOD_TYPES.items()]
    }


@router.get("/compound-payment-methods")
async def list_methods(
    compound_id: Optional[str] = None,
    company_id: Optional[str] = None,
    only_active: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """List configured payment methods.
    Residents see only active methods for their compound.
    Admins see everything they manage.
    """
    db = get_db()
    role = current_user.get("role")

    query: dict = {}
    if role in ("app_owner", "super_admin") and (compound_id or company_id):
        if compound_id:
            query["compound_id"] = compound_id
        if company_id:
            query["company_id"] = company_id
    elif role in ("company_admin", "assistant_manager", "accountant"):
        # Company admins: their company's methods + active compound methods of compounds they own
        cid = current_user.get("company_id")
        if cid:
            query = {"$or": [{"company_id": cid}, {"compound_id": {"$in": await _company_compound_ids(db, cid)}}]}
        else:
            query["compound_id"] = current_user.get("compound_id")
    else:
        # Residents/admins/security/etc.: limit to their compound + company that owns the compound + active
        cid = current_user.get("compound_id")
        if not cid:
            return {"methods": []}
        only_active = True
        # Find the parent company of this compound
        compound_doc = await db.compounds.find_one({"id": cid}, {"_id": 0, "company_id": 1, "management_company_id": 1})
        parent_company = None
        if compound_doc:
            parent_company = compound_doc.get("company_id") or compound_doc.get("management_company_id")
        ors = [{"compound_id": cid}]
        if parent_company:
            ors.append({"company_id": parent_company})
        query = {"$or": ors}

    if only_active:
        query["is_active"] = True

    methods = await db.compound_payment_methods.find(query, {"_id": 0}).sort([("sort_order", 1), ("created_at", 1)]).to_list(100)
    out = []
    for m in methods:
        m = _serialize(m)
        m["type_label_ar"] = METHOD_TYPES.get(m.get("method_type", ""), m.get("display_name", ""))
        out.append(m)
    return {"methods": out}


async def _company_compound_ids(db, company_id: str) -> List[str]:
    rows = await db.compounds.find(
        {"$or": [{"company_id": company_id}, {"management_company_id": company_id}]},
        {"_id": 0, "id": 1}
    ).to_list(500)
    return [r["id"] for r in rows if r.get("id")]


@router.post("/compound-payment-methods")
async def create_method(data: PaymentMethodCreate, current_user: dict = Depends(get_current_user)):
    """Create a new payment method. Scoped to compound or management company."""
    role = current_user.get("role")
    if role not in ("admin", "compound_admin", "company_admin", "assistant_manager", "accountant", "app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    if data.method_type not in METHOD_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported method type")

    db = get_db()
    scope = _scope_query(current_user)

    doc = {
        "id": str(uuid.uuid4()),
        **scope,
        "method_type": data.method_type,
        "display_name": data.display_name or METHOD_TYPES.get(data.method_type, ""),
        "account_number": data.account_number.strip(),
        "account_holder": data.account_holder.strip(),
        "bank_name": data.bank_name.strip(),
        "iban": data.iban.strip(),
        "swift_code": data.swift_code.strip(),
        "instructions": data.instructions.strip(),
        "fee_note": data.fee_note.strip(),
        "is_active": bool(data.is_active),
        "sort_order": int(data.sort_order or 0),
        "created_by": current_user.get("id"),
        "created_at": datetime.now(timezone.utc),
    }
    await db.compound_payment_methods.insert_one(doc)
    return {"message": "تم إضافة طريقة الدفع بنجاح", "method_id": doc["id"]}


@router.put("/compound-payment-methods/{method_id}")
async def update_method(method_id: str, data: PaymentMethodUpdate, current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role not in ("admin", "compound_admin", "company_admin", "assistant_manager", "accountant", "app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    db = get_db()
    existing = await db.compound_payment_methods.find_one({"id": method_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Method not found")

    # Scope check
    if role not in ("app_owner", "super_admin"):
        cu_company = current_user.get("company_id")
        cu_compound = current_user.get("compound_id")
        if existing.get("company_id") and existing["company_id"] != cu_company:
            raise HTTPException(status_code=403, detail="Cross-tenant edit forbidden")
        if existing.get("compound_id") and existing["compound_id"] != cu_compound and not cu_company:
            raise HTTPException(status_code=403, detail="Cross-tenant edit forbidden")

    payload = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if "method_type" in payload and payload["method_type"] not in METHOD_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported method type")
    payload["updated_at"] = datetime.now(timezone.utc)

    await db.compound_payment_methods.update_one({"id": method_id}, {"$set": payload})
    return {"message": "تم تحديث طريقة الدفع بنجاح"}


@router.delete("/compound-payment-methods/{method_id}")
async def delete_method(method_id: str, current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role not in ("admin", "compound_admin", "company_admin", "assistant_manager", "accountant", "app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    db = get_db()
    existing = await db.compound_payment_methods.find_one({"id": method_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Method not found")

    if role not in ("app_owner", "super_admin"):
        cu_company = current_user.get("company_id")
        cu_compound = current_user.get("compound_id")
        if existing.get("company_id") and existing["company_id"] != cu_company:
            raise HTTPException(status_code=403, detail="Cross-tenant delete forbidden")
        if existing.get("compound_id") and existing["compound_id"] != cu_compound and not cu_company:
            raise HTTPException(status_code=403, detail="Cross-tenant delete forbidden")

    await db.compound_payment_methods.delete_one({"id": method_id})
    return {"message": "تم حذف طريقة الدفع"}


@router.get("/compound-payment-methods/public/{compound_id}")
async def public_methods_for_compound(compound_id: str):
    """Public read-only endpoint so residents can view methods even before fully loading session."""
    db = get_db()
    compound_doc = await db.compounds.find_one({"id": compound_id}, {"_id": 0, "company_id": 1, "management_company_id": 1})
    parent_company = None
    if compound_doc:
        parent_company = compound_doc.get("company_id") or compound_doc.get("management_company_id")
    ors = [{"compound_id": compound_id}]
    if parent_company:
        ors.append({"company_id": parent_company})
    methods = await db.compound_payment_methods.find(
        {"$or": ors, "is_active": True},
        {"_id": 0, "created_by": 0}
    ).sort([("sort_order", 1)]).to_list(50)
    out = []
    for m in methods:
        m = _serialize(m)
        m["type_label_ar"] = METHOD_TYPES.get(m.get("method_type", ""), m.get("display_name", ""))
        out.append(m)
    return {"methods": out}
