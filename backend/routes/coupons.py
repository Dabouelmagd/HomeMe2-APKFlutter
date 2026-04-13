"""
Coupon & Discount System routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
import uuid
import logging

from database import get_db
from auth_deps import get_current_user, require_super_admin
from helpers import serialize_datetime

router = APIRouter(prefix="/api")


class CouponCreate(BaseModel):
    code: str
    discount_type: str = "percentage"  # percentage or fixed
    discount_value: float  # percentage (0-100) or fixed amount in EGP
    applicable_plans: list = []  # empty = all plans
    max_uses: int = 100
    expires_at: Optional[str] = None
    notes: Optional[str] = None


class CouponApply(BaseModel):
    code: str
    plan: str
    duration: str = "1_month"


@router.post("/coupons")
async def create_coupon(data: CouponCreate, current_user: dict = Depends(require_super_admin)):
    db = get_db()
    try:
        existing = await db.coupons.find_one({"code": data.code.upper().strip()})
        if existing:
            raise HTTPException(status_code=400, detail="هذا الكوبون موجود بالفعل")

        if data.discount_type == "percentage" and (data.discount_value < 1 or data.discount_value > 100):
            raise HTTPException(status_code=400, detail="النسبة يجب أن تكون بين 1 و 100")

        coupon = {
            "id": str(uuid.uuid4()),
            "code": data.code.upper().strip(),
            "discount_type": data.discount_type,
            "discount_value": data.discount_value,
            "applicable_plans": data.applicable_plans,
            "max_uses": data.max_uses,
            "times_used": 0,
            "is_active": True,
            "expires_at": data.expires_at,
            "notes": data.notes,
            "created_by": current_user['id'],
            "created_at": datetime.now(timezone.utc)
        }
        await db.coupons.insert_one(coupon)
        coupon.pop("_id", None)
        return {"message": f"تم إنشاء الكوبون {coupon['code']} بنجاح", "coupon": serialize_datetime(coupon)}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating coupon: {e}")
        raise HTTPException(status_code=500, detail="فشل في إنشاء الكوبون")


@router.get("/coupons")
async def get_coupons(current_user: dict = Depends(require_super_admin)):
    db = get_db()
    try:
        coupons = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
        active = len([c for c in coupons if c.get("is_active") and c.get("times_used", 0) < c.get("max_uses", 100)])
        total_uses = sum(c.get("times_used", 0) for c in coupons)
        return {
            "coupons": serialize_datetime(coupons),
            "stats": {"total": len(coupons), "active": active, "total_uses": total_uses}
        }
    except Exception as e:
        logging.error(f"Error fetching coupons: {e}")
        raise HTTPException(status_code=500, detail="فشل")


@router.post("/coupons/apply")
async def apply_coupon(data: CouponApply, current_user: dict = Depends(get_current_user)):
    """Validate and calculate discount for a coupon"""
    db = get_db()
    try:
        coupon = await db.coupons.find_one({"code": data.code.upper().strip(), "is_active": True})
        if not coupon:
            raise HTTPException(status_code=404, detail="كوبون غير صالح أو منتهي")

        if coupon.get("times_used", 0) >= coupon.get("max_uses", 100):
            raise HTTPException(status_code=400, detail="تم استخدام هذا الكوبون الحد الأقصى")

        if coupon.get("expires_at"):
            exp = datetime.fromisoformat(coupon["expires_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp:
                raise HTTPException(status_code=400, detail="انتهت صلاحية هذا الكوبون")

        if coupon.get("applicable_plans") and data.plan not in coupon["applicable_plans"]:
            raise HTTPException(status_code=400, detail="هذا الكوبون لا ينطبق على هذه الخطة")

        # Check if user already used this coupon
        used = await db.coupon_usage.find_one({"coupon_id": coupon["id"], "user_id": current_user['id']})
        if used:
            raise HTTPException(status_code=400, detail="لقد استخدمت هذا الكوبون من قبل")

        plan_prices = {"basic": 500, "pro": 1200, "premium": 2200, "company_startup": 3500, "company_business": 7500, "company_enterprise": 20000}
        duration_mult = {"1_month": 1, "3_months": 3, "6_months": 6, "9_months": 9, "1_year": 10, "lifetime": 120}

        original = plan_prices.get(data.plan, 0) * duration_mult.get(data.duration, 1)

        if coupon["discount_type"] == "percentage":
            discount = round(original * (coupon["discount_value"] / 100), 2)
        else:
            discount = min(coupon["discount_value"], original)

        final_price = max(0, original - discount)

        return {
            "valid": True,
            "coupon_code": coupon["code"],
            "discount_type": coupon["discount_type"],
            "discount_value": coupon["discount_value"],
            "original_price": original,
            "discount_amount": discount,
            "final_price": final_price,
            "currency": "EGP"
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error applying coupon: {e}")
        raise HTTPException(status_code=500, detail="فشل في تطبيق الكوبون")


@router.put("/coupons/{coupon_id}/toggle")
async def toggle_coupon(coupon_id: str, current_user: dict = Depends(require_super_admin)):
    db = get_db()
    try:
        coupon = await db.coupons.find_one({"id": coupon_id})
        if not coupon:
            raise HTTPException(status_code=404, detail="كوبون غير موجود")
        new_status = not coupon.get("is_active", True)
        await db.coupons.update_one({"id": coupon_id}, {"$set": {"is_active": new_status}})
        return {"message": f"تم {'تفعيل' if new_status else 'تعطيل'} الكوبون", "is_active": new_status}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error toggling coupon: {e}")
        raise HTTPException(status_code=500, detail="فشل")


@router.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, current_user: dict = Depends(require_super_admin)):
    db = get_db()
    try:
        result = await db.coupons.delete_one({"id": coupon_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="كوبون غير موجود")
        return {"message": "تم حذف الكوبون"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting coupon: {e}")
        raise HTTPException(status_code=500, detail="فشل")
