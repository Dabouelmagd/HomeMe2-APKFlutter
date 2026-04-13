"""
Super Admin Panel & Role Management routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
import logging

from database import get_db
from auth_deps import get_current_user, require_admin, require_super_admin
from helpers import serialize_datetime

router = APIRouter(prefix="/api")


@router.get("/super-admin/dashboard")
async def super_admin_dashboard(current_user: dict = Depends(require_super_admin)):
    db = get_db()
    try:
        compounds = await db.compounds.find({}, {"_id": 0}).to_list(100)
        total_users = await db.users.count_documents({})
        total_compounds = len(compounds)
        total_residents = await db.users.count_documents({"role": "resident"})
        total_admins = await db.users.count_documents({"role": {"$in": ["admin", "company_admin"]}})

        revenues = await db.revenue.find({}, {"_id": 0, "amount": 1}).to_list(1000)
        total_revenue = sum(float(r.get("amount", 0)) for r in revenues)
        expenses = await db.expenses.find({}, {"_id": 0, "amount": 1}).to_list(1000)
        total_expenses = sum(float(e.get("amount", 0)) for e in expenses)

        compound_stats = []
        for c in compounds:
            cid = c.get("id")
            users = await db.users.count_documents({"compound_id": cid})
            families = await db.families.count_documents({"compound_id": cid})
            compound_stats.append({
                "id": cid,
                "name": c.get("name", ""),
                "users": users,
                "families": families,
                "created_at": c.get("created_at")
            })

        recent_users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(10).to_list(10)

        return serialize_datetime({
            "stats": {
                "total_compounds": total_compounds,
                "total_users": total_users,
                "total_residents": total_residents,
                "total_admins": total_admins,
                "total_revenue": round(total_revenue, 2),
                "total_expenses": round(total_expenses, 2),
                "net_balance": round(total_revenue - total_expenses, 2)
            },
            "compounds": compound_stats,
            "recent_users": recent_users
        })
    except Exception as e:
        logging.error(f"Super admin dashboard error: {e}")
        raise HTTPException(status_code=500, detail="Failed to load dashboard")


@router.get("/super-admin/compounds")
async def super_admin_get_compounds(current_user: dict = Depends(require_super_admin)):
    db = get_db()
    try:
        compounds = await db.compounds.find({}, {"_id": 0}).to_list(100)
        result = []
        for c in compounds:
            cid = c.get("id")
            users = await db.users.count_documents({"compound_id": cid})
            families = await db.families.count_documents({"compound_id": cid})
            complaints = await db.complaints.count_documents({"compound_id": cid, "status": "open"})
            result.append({
                **c,
                "user_count": users,
                "family_count": families,
                "open_complaints": complaints
            })
        return {"compounds": serialize_datetime(result)}
    except Exception as e:
        logging.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Failed")


@router.get("/super-admin/users")
async def super_admin_get_users(
    role: Optional[str] = None,
    compound_id: Optional[str] = None,
    current_user: dict = Depends(require_super_admin)
):
    db = get_db()
    try:
        query = {}
        if role:
            query["role"] = role
        if compound_id:
            query["compound_id"] = compound_id
        users = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(200).to_list(200)
        return {"users": serialize_datetime(users), "total": len(users)}
    except Exception as e:
        logging.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Failed")


@router.put("/super-admin/users/{user_id}/role")
async def super_admin_update_role(user_id: str, role: str, current_user: dict = Depends(require_super_admin)):
    db = get_db()
    try:
        valid_roles = ["super_admin", "company_admin", "admin", "manager", "security", "resident"]
        if role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
        result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": f"تم تغيير الدور إلى {role}"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Failed")


@router.put("/admin/users/{user_id}/role")
async def admin_update_user_role(user_id: str, role: str, current_user: dict = Depends(require_admin)):
    db = get_db()
    try:
        allowed_roles = ["manager", "security", "resident"]
        if role not in allowed_roles:
            raise HTTPException(status_code=400, detail=f"يمكنك تعيين الأدوار التالية فقط: {allowed_roles}")

        target = await db.users.find_one({"id": user_id, "compound_id": current_user["compound_id"]})
        if not target:
            raise HTTPException(status_code=404, detail="User not found in your compound")

        await db.users.update_one({"id": user_id}, {"$set": {"role": role}})

        role_labels = {"manager": "إداري", "security": "أمن", "resident": "مقيم"}
        return {"message": f"تم تعيين {target.get('full_name', '')} كـ {role_labels.get(role, role)}"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Failed")
