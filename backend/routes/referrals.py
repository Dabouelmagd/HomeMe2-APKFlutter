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
    """Get referral statistics for Super Admin / App Owner"""
    if current_user.get("role") not in ["super_admin", "app_owner"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    refs = await db.referrals.find({}, {"_id": 0}).to_list(500)

    # Enrich with user names and compound names
    user_ids = [r.get("user_id") for r in refs if r.get("user_id")]
    users = {u["id"]: u for u in await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "full_name": 1, "username": 1, "compound_id": 1}).to_list(500)} if user_ids else {}
    compounds = {c["id"]: c["name"] for c in await db.compounds.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)}

    total_referrals = sum(r.get("total_invited", 0) for r in refs)
    total_coupons = sum(r.get("coupons_earned", 0) for r in refs)
    top_referrers = sorted(refs, key=lambda x: x.get("total_invited", 0), reverse=True)[:10]

    settings = await db.app_settings.find_one({"key": "referral_settings"}, {"_id": 0}) or {}

    def enrich(r):
        u = users.get(r.get("user_id"), {})
        cid = u.get("compound_id", "")
        return {
            "code": r["code"],
            "user_id": r.get("user_id", ""),
            "user_name": u.get("full_name") or u.get("username", ""),
            "compound_name": compounds.get(cid, ""),
            "total_invited": r.get("total_invited", 0),
            "coupons_earned": r.get("coupons_earned", 0),
            "reward_given": r.get("reward_given", ""),
            "created_at": r.get("created_at", ""),
        }

    return {
        "total_referral_codes": len(refs),
        "total_referrals": total_referrals,
        "total_coupons_earned": total_coupons,
        "top_referrers": [enrich(r) for r in top_referrers],
        "all_codes": [enrich(r) for r in refs],
        "settings": {
            "prefix": settings.get("prefix", "HOMEME"),
            "reward_type": settings.get("reward_type", "months"),
            "reward_value": settings.get("reward_value", 1),
            "min_referrals": settings.get("min_referrals", 3),
        }
    }


@router.put("/referral/settings")
async def update_referral_settings(body: dict, current_user: dict = Depends(get_current_user)):
    """Update referral program settings"""
    if current_user.get("role") not in ["super_admin", "app_owner"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    update = {}
    for field in ["prefix", "reward_type", "reward_value", "min_referrals"]:
        if field in body:
            update[field] = body[field]
    if update:
        await db.app_settings.update_one(
            {"key": "referral_settings"},
            {"$set": {**update, "key": "referral_settings"}},
            upsert=True
        )
    return {"message": "تم تحديث إعدادات الإحالات", "settings": update}


@router.delete("/referral/{code}")
async def delete_referral(code: str, current_user: dict = Depends(get_current_user)):
    """Delete a referral code"""
    if current_user.get("role") not in ["super_admin", "app_owner"]:
        raise HTTPException(403, "غير مصرح")
    db = get_db()
    result = await db.referrals.delete_one({"code": code})
    if result.deleted_count == 0:
        raise HTTPException(404, "الكود غير موجود")
    return {"message": f"تم حذف الكود {code}"}


@router.put("/referral/{code}")
async def update_referral(code: str, body: dict, current_user: dict = Depends(get_current_user)):
    """Update a referral code (reset, change reward)"""
    if current_user.get("role") not in ["super_admin", "app_owner"]:
        raise HTTPException(403, "غير مصرح")
    db = get_db()
    ref = await db.referrals.find_one({"code": code})
    if not ref:
        raise HTTPException(404, "الكود غير موجود")

    update = {}
    if "reward_given" in body:
        update["reward_given"] = body["reward_given"]
    if "total_invited" in body:
        update["total_invited"] = body["total_invited"]
    if "coupons_earned" in body:
        update["coupons_earned"] = body["coupons_earned"]
    if "new_code" in body and body["new_code"].strip():
        existing = await db.referrals.find_one({"code": body["new_code"].upper()})
        if existing and existing.get("code") != code:
            raise HTTPException(400, "الكود مستخدم بالفعل")
        update["code"] = body["new_code"].upper()

    if update:
        await db.referrals.update_one({"code": code}, {"$set": update})
    return {"message": "تم تحديث الإحالة"}


@router.post("/referral/create")
async def create_referral_admin(body: dict, current_user: dict = Depends(get_current_user)):
    """Admin creates a referral code for a user"""
    if current_user.get("role") not in ["super_admin", "app_owner"]:
        raise HTTPException(403, "غير مصرح")
    db = get_db()
    user_id = body.get("user_id", "")
    custom_code = body.get("code", "").upper().strip()

    if custom_code:
        existing = await db.referrals.find_one({"code": custom_code})
        if existing:
            raise HTTPException(400, "الكود مستخدم بالفعل")
        code = custom_code
    else:
        settings = await db.app_settings.find_one({"key": "referral_settings"}, {"_id": 0}) or {}
        prefix = settings.get("prefix", "HOMEME")
        code = f"{prefix}-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        while await db.referrals.find_one({"code": code}):
            code = f"{prefix}-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))

    ref = {
        "code": code,
        "user_id": user_id,
        "total_invited": 0,
        "coupons_earned": 0,
        "reward_given": "",
        "invited_users": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.referrals.insert_one(ref)
    return {"message": f"تم إنشاء كود الإحالة {code}", "code": code}


@router.post("/referral/{code}/duplicate")
async def duplicate_referral(code: str, current_user: dict = Depends(get_current_user)):
    """Duplicate a referral code"""
    if current_user.get("role") not in ["super_admin", "app_owner"]:
        raise HTTPException(403, "غير مصرح")
    db = get_db()
    ref = await db.referrals.find_one({"code": code}, {"_id": 0})
    if not ref:
        raise HTTPException(404, "الكود غير موجود")

    settings = await db.app_settings.find_one({"key": "referral_settings"}, {"_id": 0}) or {}
    prefix = settings.get("prefix", "HOMEME")
    new_code = f"{prefix}-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    while await db.referrals.find_one({"code": new_code}):
        new_code = f"{prefix}-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))

    new_ref = {
        "code": new_code,
        "user_id": ref.get("user_id", ""),
        "total_invited": 0,
        "coupons_earned": 0,
        "reward_given": "",
        "invited_users": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.referrals.insert_one(new_ref)
    return {"message": f"تم تكرار الكود → {new_code}", "code": new_code}
