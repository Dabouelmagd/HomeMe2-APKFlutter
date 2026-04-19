"""
Compound Admin — Super Admin operations on individual compounds
Extracted from superadmin.py (iter 40 refactor).

Endpoints:
  PUT    /super-admin/compounds/{compound_id}          - update + optional move to another company
  DELETE /super-admin/compounds/{compound_id}?force    - safe delete with users-unlink cascade
  GET    /super-admin/compounds/{compound_id}/export   - JSON bundle: compound+users+subs+contracts
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from datetime import datetime, timezone

from database import get_db
from auth_deps import require_super_admin
from helpers import serialize_datetime

router = APIRouter(prefix="/api")


@router.put("/super-admin/compounds/{compound_id}")
async def super_admin_update_compound(compound_id: str, payload: dict, current_user: dict = Depends(require_super_admin)):
    """تحديث بيانات المجمع (Super Admin / Owner). يدعم نقل المجمع إلى شركة أخرى."""
    db = get_db()
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="المجمع غير موجود")
    allowed = ["name", "location", "address", "description", "company_id", "management_company_id"]
    update = {k: payload[k] for k in allowed if k in payload}
    if "name" in update and not (update["name"] or "").strip():
        raise HTTPException(status_code=400, detail="اسم المجمع مطلوب")
    # If moving compound to another company, reflect in company.compound_ids
    new_company_id = update.get("company_id") or update.get("management_company_id")
    if new_company_id and new_company_id != compound.get("company_id"):
        # remove from old, add to new
        if compound.get("company_id"):
            await db.companies.update_one({"id": compound["company_id"]}, {"$pull": {"compound_ids": compound_id}})
        await db.companies.update_one({"id": new_company_id}, {"$addToSet": {"compound_ids": compound_id}})
        update["company_id"] = new_company_id
        update["management_company_id"] = new_company_id
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.compounds.update_one({"id": compound_id}, {"$set": update})
    refreshed = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    return {"success": True, "compound": serialize_datetime(refreshed)}


@router.delete("/super-admin/compounds/{compound_id}")
async def super_admin_delete_compound(compound_id: str, force: bool = False, current_user: dict = Depends(require_super_admin)):
    """حذف المجمع. يرفض الحذف إذا كان به مستخدمون إلا مع force=true."""
    db = get_db()
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="المجمع غير موجود")
    users_count = await db.users.count_documents({"compound_id": compound_id})
    if users_count > 0 and not force:
        raise HTTPException(
            status_code=400,
            detail=f"لا يمكن حذف المجمع لأنه يحتوي على {users_count} مستخدم. استخدم force=true للحذف مع إلغاء ربط المستخدمين."
        )
    if users_count > 0 and force:
        # Unlink users (don't delete them)
        await db.users.update_many({"compound_id": compound_id}, {"$set": {"compound_id": None}})
    # Delete compound itself
    await db.compounds.delete_one({"id": compound_id})
    # Clean up references in companies
    await db.companies.update_many({}, {"$pull": {"compound_ids": compound_id}})
    # Delete related management contracts
    await db.management_contracts.delete_many({"compound_id": compound_id})
    return {"success": True, "unlinked_users": users_count if force else 0}


@router.get("/super-admin/compounds/{compound_id}/export")
async def super_admin_export_compound(compound_id: str, current_user: dict = Depends(require_super_admin)):
    """تصدير JSON شامل للمجمع: البيانات + المستخدمون + الاشتراكات + العقود."""
    db = get_db()
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="المجمع غير موجود")
    users = await db.users.find({"compound_id": compound_id}, {"_id": 0, "password_hash": 0}).to_list(5000)
    user_ids = [u.get("id") for u in users]
    subs = await db.user_subscriptions.find({"user_id": {"$in": user_ids}}, {"_id": 0}).to_list(5000)
    contracts = await db.management_contracts.find({"compound_id": compound_id}, {"_id": 0, "pdf_data_url": 0}).to_list(100)
    company = None
    if compound.get("company_id"):
        company = await db.companies.find_one({"id": compound["company_id"]}, {"_id": 0})
    bundle = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "exported_by": current_user.get("username"),
        "compound": serialize_datetime(compound),
        "parent_company": serialize_datetime(company) if company else None,
        "users": serialize_datetime(users),
        "subscriptions": serialize_datetime(subs),
        "management_contracts": serialize_datetime(contracts),
        "stats": {
            "users_count": len(users),
            "active_subs": sum(1 for s in subs if s.get("status") == "active"),
            "expired_subs": sum(1 for s in subs if s.get("status") == "expired"),
            "contracts_count": len(contracts),
        },
    }
    return JSONResponse(
        content=bundle,
        headers={"Content-Disposition": f'attachment; filename="compound-{compound_id}-{datetime.now(timezone.utc).strftime("%Y%m%d")}.json"'},
    )
