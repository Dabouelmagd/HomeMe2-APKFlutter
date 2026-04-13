"""
Subscription Codes Management routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import logging

from database import get_db
from auth_deps import get_current_user, require_super_admin, require_admin
from helpers import serialize_datetime
from subscription_codes import SubscriptionCodeManager

router = APIRouter(prefix="/api")


class CreateCodeRequest(BaseModel):
    code_type: str  # 3_months, 6_months, 9_months, 1_year, lifetime, trial
    plan: str = "pro"  # starter, basic, pro, premium, company_startup, company_business, company_enterprise
    max_uses: int = 1
    expires_in_days: Optional[int] = None
    custom_code: Optional[str] = None
    notes: Optional[str] = None


class BulkCreateRequest(BaseModel):
    code_type: str
    plan: str = "pro"
    count: int = 10
    max_uses_per_code: int = 1
    expires_in_days: Optional[int] = None
    notes: Optional[str] = None


class ActivateCodeRequest(BaseModel):
    code: str


# ==================== SUPER ADMIN: Manage Codes ====================

@router.post("/subscription-codes/create")
async def create_subscription_code(data: CreateCodeRequest, current_user: dict = Depends(require_super_admin)):
    """Create a single subscription code"""
    try:
        expires_at = None
        if data.expires_in_days:
            from datetime import timedelta
            expires_at = (datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)).isoformat()

        if data.custom_code:
            db = get_db()
            existing = await db.subscription_codes.find_one({"code": data.custom_code.upper().strip()})
            if existing:
                raise HTTPException(status_code=400, detail="هذا الكود مستخدم بالفعل")

        code_doc = await SubscriptionCodeManager.create_code(
            code_type=data.code_type,
            created_by=current_user["id"],
            max_uses=data.max_uses,
            expires_at=expires_at,
            notes=data.notes
        )

        if not code_doc:
            raise HTTPException(status_code=500, detail="فشل في إنشاء الكود")

        # Update with plan info and custom code
        db = get_db()
        update = {"plan": data.plan}
        if data.custom_code:
            update["code"] = data.custom_code.upper().strip()
        await db.subscription_codes.update_one(
            {"code": code_doc["code"]},
            {"$set": update}
        )
        if data.custom_code:
            code_doc["code"] = data.custom_code.upper().strip()
        code_doc["plan"] = data.plan
        code_doc.pop("_id", None)

        return {"message": "تم إنشاء الكود بنجاح", "code": code_doc}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating code: {e}")
        raise HTTPException(status_code=500, detail="فشل في إنشاء الكود")


@router.post("/subscription-codes/bulk-create")
async def bulk_create_codes(data: BulkCreateRequest, current_user: dict = Depends(require_super_admin)):
    """Create multiple subscription codes at once"""
    try:
        if data.count > 500:
            raise HTTPException(status_code=400, detail="الحد الأقصى 500 كود في المرة")

        expires_at = None
        if data.expires_in_days:
            from datetime import timedelta
            expires_at = (datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)).isoformat()

        codes = []
        db = get_db()
        for _ in range(data.count):
            code_doc = await SubscriptionCodeManager.create_code(
                code_type=data.code_type,
                created_by=current_user["id"],
                max_uses=data.max_uses_per_code,
                expires_at=expires_at,
                notes=data.notes
            )
            if code_doc:
                await db.subscription_codes.update_one(
                    {"code": code_doc["code"]},
                    {"$set": {"plan": data.plan}}
                )
                code_doc["plan"] = data.plan
                code_doc.pop("_id", None)
                codes.append(code_doc)

        return {
            "message": f"تم إنشاء {len(codes)} كود بنجاح",
            "total_created": len(codes),
            "codes": codes
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error bulk creating codes: {e}")
        raise HTTPException(status_code=500, detail="فشل في إنشاء الأكواد")


@router.get("/subscription-codes")
async def get_all_codes(
    status: Optional[str] = None,
    code_type: Optional[str] = None,
    plan: Optional[str] = None,
    current_user: dict = Depends(require_super_admin)
):
    """Get all subscription codes with filters"""
    db = get_db()
    try:
        query = {}
        if status == "active":
            query["is_active"] = True
            query["$expr"] = {"$lt": ["$times_used", "$max_uses"]}
        elif status == "used":
            query["$expr"] = {"$gte": ["$times_used", "$max_uses"]}
        elif status == "disabled":
            query["is_active"] = False
        if code_type:
            query["type"] = code_type
        if plan:
            query["plan"] = plan

        codes = await db.subscription_codes.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

        # Stats
        all_codes = await db.subscription_codes.find({}, {"_id": 0}).to_list(1000)
        total = len(all_codes)
        active = len([c for c in all_codes if c.get("is_active") and c.get("times_used", 0) < c.get("max_uses", 1)])
        used = len([c for c in all_codes if c.get("times_used", 0) >= c.get("max_uses", 1)])
        disabled = len([c for c in all_codes if not c.get("is_active")])
        total_activations = sum(c.get("times_used", 0) for c in all_codes)

        by_type = {}
        for c in all_codes:
            t = c.get("type", "unknown")
            by_type[t] = by_type.get(t, 0) + 1

        by_plan = {}
        for c in all_codes:
            p = c.get("plan", "none")
            by_plan[p] = by_plan.get(p, 0) + 1

        return {
            "codes": serialize_datetime(codes),
            "stats": {
                "total": total,
                "active": active,
                "used": used,
                "disabled": disabled,
                "total_activations": total_activations,
                "by_type": by_type,
                "by_plan": by_plan
            }
        }
    except Exception as e:
        logging.error(f"Error fetching codes: {e}")
        raise HTTPException(status_code=500, detail="فشل في جلب الأكواد")


@router.put("/subscription-codes/{code}/toggle")
async def toggle_code_status(code: str, current_user: dict = Depends(require_super_admin)):
    """Activate or deactivate a code"""
    db = get_db()
    try:
        code_doc = await db.subscription_codes.find_one({"code": code.upper().strip()})
        if not code_doc:
            raise HTTPException(status_code=404, detail="الكود غير موجود")
        new_status = not code_doc.get("is_active", True)
        await db.subscription_codes.update_one(
            {"code": code.upper().strip()},
            {"$set": {"is_active": new_status}}
        )
        return {"message": f"تم {'تفعيل' if new_status else 'تعطيل'} الكود", "is_active": new_status}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error toggling code: {e}")
        raise HTTPException(status_code=500, detail="فشل في تحديث الكود")


@router.delete("/subscription-codes/{code}")
async def delete_code(code: str, current_user: dict = Depends(require_super_admin)):
    """Delete a subscription code"""
    try:
        success = await SubscriptionCodeManager.delete_code(code)
        if not success:
            raise HTTPException(status_code=404, detail="الكود غير موجود")
        return {"message": "تم حذف الكود بنجاح"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting code: {e}")
        raise HTTPException(status_code=500, detail="فشل في حذف الكود")


# ==================== USER: Activate Code ====================

@router.post("/subscription-codes/activate")
async def activate_code(data: ActivateCodeRequest, current_user: dict = Depends(get_current_user)):
    """Activate a subscription code for current user"""
    try:
        result = await SubscriptionCodeManager.apply_code(
            code=data.code,
            user_id=current_user["id"],
            username=current_user.get("username", "")
        )
        if not result.get("success"):
            error = result.get("error", "invalid_code")
            error_messages = {
                "code_not_found": "الكود غير صحيح أو غير موجود",
                "code_deactivated": "هذا الكود معطّل",
                "code_expired": "انتهت صلاحية هذا الكود",
                "code_max_uses_reached": "تم استخدام هذا الكود الحد الأقصى من المرات",
                "code_already_used_by_user": "لقد استخدمت هذا الكود من قبل",
            }
            raise HTTPException(status_code=400, detail=error_messages.get(error, "كود غير صالح"))

        return {
            "message": "تم تفعيل الاشتراك بنجاح!",
            "subscription_type": result.get("subscription_type"),
            "duration_days": result.get("duration_days"),
            "subscription_end": result.get("subscription_end")
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error activating code: {e}")
        raise HTTPException(status_code=500, detail="فشل في تفعيل الكود")


@router.post("/subscription-codes/verify")
async def verify_code(data: ActivateCodeRequest, current_user: dict = Depends(get_current_user)):
    """Verify a code without activating it"""
    try:
        result = await SubscriptionCodeManager.verify_code(data.code, current_user["id"])
        if not result.get("valid"):
            error = result.get("error", "invalid")
            error_messages = {
                "code_not_found": "الكود غير صحيح",
                "code_deactivated": "الكود معطّل",
                "code_expired": "انتهت صلاحية الكود",
                "code_max_uses_reached": "الكود مستخدم بالكامل",
                "code_already_used_by_user": "استخدمت هذا الكود سابقاً",
            }
            return {"valid": False, "message": error_messages.get(error, "كود غير صالح")}

        type_labels = {
            "3_months": "3 شهور", "6_months": "6 شهور", "9_months": "9 شهور",
            "12_months": "سنة", "1_year": "سنة", "lifetime": "مدى الحياة", "trial": "تجريبي"
        }
        return {
            "valid": True,
            "message": f"كود صالح - اشتراك {type_labels.get(result.get('type', ''), result.get('type', ''))}",
            "type": result.get("type"),
            "duration_days": result.get("duration_days")
        }
    except Exception as e:
        logging.error(f"Error verifying code: {e}")
        raise HTTPException(status_code=500, detail="فشل في التحقق من الكود")


@router.get("/subscription/my")
async def get_my_subscription(current_user: dict = Depends(get_current_user)):
    """Get current user's subscription info"""
    return {
        "subscription_active": current_user.get("subscription_active", False),
        "subscription_type": current_user.get("subscription_type"),
        "subscription_start": current_user.get("subscription_start"),
        "subscription_end": current_user.get("subscription_end"),
        "subscription_code_used": current_user.get("subscription_code_used")
    }
