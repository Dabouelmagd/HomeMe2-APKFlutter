"""
Referral System - Invite 5 friends, get 1 month free coupon
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
import logging
import random
import string

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api")


def generate_referral_code():
    return "REF-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


@router.get("/referral/my-code")
async def get_my_referral_code(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    ref = await db.referrals.find_one({"user_id": user_id}, {"_id": 0})
    if not ref:
        code = generate_referral_code()
        while await db.referrals.find_one({"code": code}):
            code = generate_referral_code()
        ref = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "code": code,
            "invited_users": [],
            "total_invited": 0,
            "coupons_earned": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.referrals.insert_one(ref)
        ref.pop("_id", None)
    return {
        "code": ref["code"],
        "total_invited": ref.get("total_invited", 0),
        "coupons_earned": ref.get("coupons_earned", 0),
        "remaining_for_coupon": max(0, 5 - (ref.get("total_invited", 0) % 5)),
        "invited_users": ref.get("invited_users", [])[-10:]
    }


class ReferralUse(BaseModel):
    referral_code: str


@router.post("/referral/use")
async def use_referral_code(data: ReferralUse, current_user: dict = Depends(get_current_user)):
    db = get_db()
    code = data.referral_code.upper().strip()
    ref = await db.referrals.find_one({"code": code})
    if not ref:
        raise HTTPException(status_code=404, detail="كود الإحالة غير صالح")
    if ref["user_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="لا يمكنك استخدام كود الإحالة الخاص بك")
    already = any(u.get("user_id") == current_user["id"] for u in ref.get("invited_users", []))
    if already:
        raise HTTPException(status_code=400, detail="لقد استخدمت هذا الكود من قبل")

    invited_entry = {
        "user_id": current_user["id"],
        "username": current_user.get("username", ""),
        "full_name": current_user.get("full_name", ""),
        "joined_at": datetime.now(timezone.utc).isoformat()
    }
    new_total = ref.get("total_invited", 0) + 1
    await db.referrals.update_one(
        {"code": code},
        {
            "$push": {"invited_users": invited_entry},
            "$set": {"total_invited": new_total}
        }
    )

    coupon_generated = False
    if new_total % 5 == 0:
        coupon_code = f"GIFT-{ref['code'][-4:]}-{new_total}"
        coupon = {
            "id": str(uuid.uuid4()),
            "code": coupon_code,
            "discount_type": "duration",
            "discount_value": 1,
            "applicable_plans": [],
            "max_uses": 1,
            "times_used": 0,
            "is_active": True,
            "expires_at": None,
            "notes": f"كوبون هدية - إحالة {new_total} صديق بواسطة {ref['user_id']}",
            "created_by": "system",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "referral_reward": True,
            "reward_for_user": ref["user_id"]
        }
        await db.coupons.insert_one(coupon)
        await db.referrals.update_one(
            {"code": code},
            {"$inc": {"coupons_earned": 1}}
        )
        # Notify the referrer
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": ref["user_id"],
            "type": "referral_reward",
            "title": "مبروك! حصلت على شهر مجاني",
            "message": f"شكراً لدعوتك {new_total} صديق! كود الشهر المجاني: {coupon_code}",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
        coupon_generated = True
        logging.info(f"Referral reward coupon {coupon_code} generated for user {ref['user_id']}")

    return {
        "message": "تم تسجيل الإحالة بنجاح",
        "referrer_total": new_total,
        "coupon_generated": coupon_generated
    }


@router.get("/referral/stats")
async def get_referral_stats(current_user: dict = Depends(get_current_user)):
    """Get referral statistics for Super Admin"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    refs = await db.referrals.find({}, {"_id": 0}).to_list(500)
    total_referrals = sum(r.get("total_invited", 0) for r in refs)
    total_coupons = sum(r.get("coupons_earned", 0) for r in refs)
    top_referrers = sorted(refs, key=lambda x: x.get("total_invited", 0), reverse=True)[:10]
    return {
        "total_referral_codes": len(refs),
        "total_referrals": total_referrals,
        "total_coupons_earned": total_coupons,
        "top_referrers": [{"code": r["code"], "user_id": r["user_id"], "total": r.get("total_invited", 0)} for r in top_referrers]
    }
