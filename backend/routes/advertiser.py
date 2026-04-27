"""
Advertiser Self-Service Portal — Lite

Flow:
  1. Anyone can register as an advertiser: POST /api/advertiser/register (creates `advertiser` role account)
  2. Logged advertiser creates an ad: POST /api/advertiser/ads
  3. Advertiser pays via Stripe (payment_intent_client_secret returned) — on success, ad moves to `pending_approval`
  4. Super Admin / App Owner approves/rejects: POST /api/super-admin/advertiser-ads/{id}/approve | /reject
  5. Approved ads appear in the normal internal_ads flow (is_active + visible to residents)
  6. Advertiser views analytics: GET /api/advertiser/ads/{id}/stats (impressions, clicks, CTR)
"""
from fastapi import APIRouter, HTTPException, Depends, Body, UploadFile, File
from datetime import datetime, timezone, timedelta
from typing import Optional
from pathlib import Path
import logging
import uuid
import os
import bcrypt

from database import get_db
from auth_deps import get_current_user, require_super_admin
from helpers import serialize_datetime

router = APIRouter(prefix="/api")

VALID_AD_STATUS = ["draft", "awaiting_payment", "pending_approval", "approved", "rejected", "paused", "expired"]


# ==================== Advertiser Account ====================

@router.post("/advertiser/register")
async def advertiser_register(payload: dict):
    """تسجيل معلن جديد (حساب دور advertiser)"""
    db = get_db()
    full_name = (payload.get("full_name") or "").strip()
    company_name = (payload.get("company_name") or "").strip()
    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    phone = (payload.get("phone") or "").strip()

    if not full_name or not username or not email or not password:
        raise HTTPException(status_code=400, detail="الاسم، اسم المستخدم، البريد، وكلمة المرور مطلوبة")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب ألا تقل عن 6 أحرف")

    existing = await db.users.find_one({"$or": [{"username": username}, {"email": email}]})
    if existing:
        raise HTTPException(status_code=400, detail="اسم المستخدم أو البريد مستخدم بالفعل")

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user_doc = {
        "id": str(uuid.uuid4()),
        "username": username,
        "email": email,
        "password_hash": password_hash,
        "role": "advertiser",
        "compound_id": None,
        "family_id": None,
        "full_name": full_name,
        "company_name": company_name,
        "phone": phone,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "profile_picture_url": None,
    }
    await db.users.insert_one(user_doc)
    user_doc.pop("_id", None)
    user_doc.pop("password_hash", None)
    return {"success": True, "user": serialize_datetime(user_doc),
            "message": "تم إنشاء حسابك. يمكنك الآن تسجيل الدخول وإنشاء إعلانك."}


def _require_advertiser(current_user: dict):
    if current_user.get("role") not in ("advertiser", "super_admin", "app_owner"):
        raise HTTPException(status_code=403, detail="هذه الخدمة متاحة للمعلنين فقط")
    return current_user


# ==================== Ads CRUD (advertiser side) ====================

@router.post("/advertiser/upload-image")
async def advertiser_upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload an image for an advertiser ad. Returns {url} to pass to POST /advertiser/ads."""
    _require_advertiser(current_user)
    allowed = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="نوع ملف غير مدعوم (PNG, JPG, WEBP, GIF فقط)")
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="حجم الملف يتجاوز 5 ميجابايت")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="ملف فارغ")
    ext_map = {"image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp", "image/gif": "gif"}
    ext = ext_map.get(file.content_type, "png")
    upload_dir = Path("/app/uploads/ads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex[:12]}.{ext}"
    (upload_dir / filename).write_bytes(contents)
    return {"url": f"/api/ads/media/{filename}", "filename": filename, "size_bytes": len(contents)}


@router.post("/advertiser/ads")
async def advertiser_create_ad(payload: dict, current_user: dict = Depends(get_current_user)):
    """المعلن ينشئ إعلانًا بصيغة draft (قبل الدفع)."""
    _require_advertiser(current_user)
    db = get_db()
    title = (payload.get("title") or "").strip()
    body = (payload.get("body") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="عنوان الإعلان مطلوب")
    try:
        duration_days = int(payload.get("duration_days") or 7)
        if duration_days < 1 or duration_days > 365:
            raise ValueError()
        budget = float(payload.get("budget") or 0)
        if budget < 0:
            raise ValueError()
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="duration_days بين 1-365 و budget >= 0")

    price_per_day = float(os.environ.get("AD_PRICE_PER_DAY", "50"))  # default 50 EGP/day
    amount_due = price_per_day * duration_days
    if budget and budget < amount_due:
        # budget acts as a cap; we use greater of two
        amount_due = max(amount_due, budget)

    doc = {
        "id": str(uuid.uuid4()),
        "advertiser_id": current_user.get("id"),
        "advertiser_name": current_user.get("full_name") or current_user.get("username"),
        "advertiser_company": current_user.get("company_name"),
        "title": title,
        "body": body,
        "image_url": payload.get("image_url") or None,
        "link_url": payload.get("link_url") or None,
        "duration_days": duration_days,
        "price_per_day": price_per_day,
        "amount_due": amount_due,
        "currency": "EGP",
        "status": "awaiting_payment",
        "payment_status": "unpaid",
        "payment_intent_id": None,
        "approval_status": "not_submitted",
        "rejection_reason": None,
        "impressions": 0,
        "clicks": 0,
        "starts_at": None,
        "ends_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.advertiser_ads.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "ad": serialize_datetime(doc)}


@router.get("/advertiser/ads")
async def advertiser_list_my_ads(current_user: dict = Depends(get_current_user)):
    _require_advertiser(current_user)
    db = get_db()
    ads = await db.advertiser_ads.find({"advertiser_id": current_user.get("id")}, {"_id": 0}).sort("created_at", -1).to_list(500)
    summary = {
        "total": len(ads),
        "active": sum(1 for a in ads if a.get("status") == "approved"),
        "pending": sum(1 for a in ads if a.get("status") == "pending_approval"),
        "rejected": sum(1 for a in ads if a.get("status") == "rejected"),
        "total_impressions": sum(int(a.get("impressions") or 0) for a in ads),
        "total_clicks": sum(int(a.get("clicks") or 0) for a in ads),
    }
    return {"ads": serialize_datetime(ads), "summary": summary}


@router.get("/advertiser/ads/{ad_id}")
async def advertiser_get_ad(ad_id: str, current_user: dict = Depends(get_current_user)):
    _require_advertiser(current_user)
    db = get_db()
    ad = await db.advertiser_ads.find_one({"id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    if current_user.get("role") == "advertiser" and ad.get("advertiser_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="غير مسموح")
    return serialize_datetime(ad)


@router.put("/advertiser/ads/{ad_id}")
async def advertiser_update_ad(ad_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    """المعلن يعدل إعلانه (فقط قبل الموافقة)."""
    _require_advertiser(current_user)
    db = get_db()
    ad = await db.advertiser_ads.find_one({"id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    if current_user.get("role") == "advertiser" and ad.get("advertiser_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="غير مسموح")
    if ad.get("status") in ("approved", "pending_approval"):
        raise HTTPException(status_code=400, detail="لا يمكن التعديل بعد التقديم للمراجعة")
    allowed = ["title", "body", "image_url", "link_url"]
    update = {k: payload[k] for k in allowed if k in payload}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.advertiser_ads.update_one({"id": ad_id}, {"$set": update})
    refreshed = await db.advertiser_ads.find_one({"id": ad_id}, {"_id": 0})
    return {"success": True, "ad": serialize_datetime(refreshed)}


@router.delete("/advertiser/ads/{ad_id}")
async def advertiser_delete_ad(ad_id: str, current_user: dict = Depends(get_current_user)):
    _require_advertiser(current_user)
    db = get_db()
    ad = await db.advertiser_ads.find_one({"id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    if current_user.get("role") == "advertiser" and ad.get("advertiser_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="غير مسموح")
    if ad.get("status") == "approved":
        raise HTTPException(status_code=400, detail="لا يمكن حذف إعلان معتمد. أوقفه بدلًا من ذلك.")
    await db.advertiser_ads.delete_one({"id": ad_id})
    return {"success": True}


# ==================== Payment (Stripe) ====================

@router.post("/advertiser/ads/{ad_id}/pay")
async def advertiser_pay_for_ad(ad_id: str, current_user: dict = Depends(get_current_user)):
    """
    ينشئ Stripe PaymentIntent للإعلان. في بيئة التطوير بدون STRIPE_SECRET_KEY نرجع mock client_secret
    ونضع الإعلان مباشرة في pending_approval (للاختبار).
    """
    _require_advertiser(current_user)
    db = get_db()
    ad = await db.advertiser_ads.find_one({"id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    if current_user.get("role") == "advertiser" and ad.get("advertiser_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="غير مسموح")
    if ad.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="تم الدفع مسبقًا")

    amount_due = float(ad.get("amount_due") or 0)
    stripe_key = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    client_secret = None
    payment_intent_id = None

    if stripe_key and not stripe_key.startswith("dummy"):
        try:
            import stripe as _stripe
            _stripe.api_key = stripe_key
            intent = _stripe.PaymentIntent.create(
                amount=int(amount_due * 100),
                currency="egp",
                metadata={"ad_id": ad_id, "advertiser_id": current_user.get("id")},
                description=f"Ad: {ad.get('title')}",
            )
            client_secret = intent.client_secret
            payment_intent_id = intent.id
        except Exception as e:
            logging.warning(f"Stripe intent creation failed, falling back to mock: {e}")

    if not client_secret:
        # Dev/test fallback → immediate success
        payment_intent_id = f"pi_mock_{uuid.uuid4().hex[:16]}"
        client_secret = f"{payment_intent_id}_secret_mock"
        await db.advertiser_ads.update_one(
            {"id": ad_id},
            {"$set": {
                "payment_status": "paid",
                "payment_intent_id": payment_intent_id,
                "status": "pending_approval",
                "approval_status": "pending",
                "paid_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        return {
            "success": True,
            "mock": True,
            "client_secret": client_secret,
            "payment_intent_id": payment_intent_id,
            "message": "تم الدفع (وضع التطوير) والإعلان في انتظار الموافقة.",
            "amount_due": amount_due,
        }

    await db.advertiser_ads.update_one({"id": ad_id}, {"$set": {"payment_intent_id": payment_intent_id}})
    return {"success": True, "mock": False, "client_secret": client_secret,
            "payment_intent_id": payment_intent_id, "amount_due": amount_due}


@router.post("/advertiser/ads/{ad_id}/confirm-payment")
async def advertiser_confirm_payment(ad_id: str, current_user: dict = Depends(get_current_user)):
    """المعلن يؤكد نجاح الدفع (Frontend يستدعيها بعد Stripe confirmation)."""
    _require_advertiser(current_user)
    db = get_db()
    ad = await db.advertiser_ads.find_one({"id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    if current_user.get("role") == "advertiser" and ad.get("advertiser_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="غير مسموح")
    await db.advertiser_ads.update_one(
        {"id": ad_id},
        {"$set": {"payment_status": "paid", "status": "pending_approval",
                  "approval_status": "pending",
                  "paid_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "message": "تم استلام الدفع. الإعلان في انتظار موافقة الإدارة."}


# ==================== Stats / Analytics ====================

@router.get("/advertiser/ads/{ad_id}/stats")
async def advertiser_ad_stats(ad_id: str, current_user: dict = Depends(get_current_user)):
    _require_advertiser(current_user)
    db = get_db()
    ad = await db.advertiser_ads.find_one({"id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    if current_user.get("role") == "advertiser" and ad.get("advertiser_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="غير مسموح")
    impressions = int(ad.get("impressions") or 0)
    clicks = int(ad.get("clicks") or 0)
    ctr = (clicks / impressions * 100) if impressions > 0 else 0
    return {
        "ad_id": ad_id,
        "title": ad.get("title"),
        "status": ad.get("status"),
        "impressions": impressions,
        "clicks": clicks,
        "ctr_percent": round(ctr, 2),
        "starts_at": ad.get("starts_at"),
        "ends_at": ad.get("ends_at"),
        "amount_paid": ad.get("amount_due") if ad.get("payment_status") == "paid" else 0,
    }


@router.post("/advertiser-ads/{ad_id}/track-impression")
async def track_impression(ad_id: str):
    """Public endpoint: زيادة عداد المشاهدات عند عرض الإعلان."""
    db = get_db()
    res = await db.advertiser_ads.update_one({"id": ad_id}, {"$inc": {"impressions": 1}})
    return {"success": res.matched_count > 0}


@router.post("/advertiser-ads/{ad_id}/track-click")
async def track_click(ad_id: str):
    """Public endpoint: زيادة عداد النقرات."""
    db = get_db()
    res = await db.advertiser_ads.update_one({"id": ad_id}, {"$inc": {"clicks": 1}})
    return {"success": res.matched_count > 0}


# ==================== Super Admin: Approve / Reject ====================

@router.get("/super-admin/advertiser-ads")
async def sa_list_advertiser_ads(
    status: Optional[str] = None,
    current_user: dict = Depends(require_super_admin),
):
    db = get_db()
    q = {}
    if status:
        q["status"] = status
    ads = await db.advertiser_ads.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    summary = {
        "total": len(ads),
        "pending": sum(1 for a in ads if a.get("status") == "pending_approval"),
        "approved": sum(1 for a in ads if a.get("status") == "approved"),
        "rejected": sum(1 for a in ads if a.get("status") == "rejected"),
        "total_revenue": sum(float(a.get("amount_due") or 0) for a in ads if a.get("payment_status") == "paid"),
    }
    return {"ads": serialize_datetime(ads), "summary": summary}


@router.post("/super-admin/advertiser-ads/{ad_id}/approve")
async def sa_approve_ad(ad_id: str, current_user: dict = Depends(require_super_admin)):
    db = get_db()
    ad = await db.advertiser_ads.find_one({"id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    if ad.get("status") != "pending_approval":
        raise HTTPException(status_code=400, detail="الإعلان ليس في انتظار الموافقة")

    now = datetime.now(timezone.utc)
    duration = int(ad.get("duration_days") or 7)
    ends_at = (now + timedelta(days=duration)).isoformat()
    await db.advertiser_ads.update_one(
        {"id": ad_id},
        {"$set": {
            "status": "approved",
            "approval_status": "approved",
            "approved_at": now.isoformat(),
            "approved_by": current_user.get("id"),
            "starts_at": now.isoformat(),
            "ends_at": ends_at,
        }}
    )
    # Also push it to internal_ads for display in the app
    internal_ad = {
        "id": str(uuid.uuid4()),
        "source": "advertiser",
        "source_ad_id": ad_id,
        "title": ad.get("title"),
        "body": ad.get("body"),
        "image_url": ad.get("image_url"),
        "link_url": ad.get("link_url"),
        "advertiser_id": ad.get("advertiser_id"),
        "advertiser_name": ad.get("advertiser_name"),
        "is_active": True,
        "starts_at": now.isoformat(),
        "ends_at": ends_at,
        "impressions": 0,
        "clicks": 0,
        "created_at": now.isoformat(),
    }
    await db.internal_ads.insert_one(internal_ad)
    return {"success": True, "message": "تمت الموافقة ونشر الإعلان.", "ends_at": ends_at}


@router.post("/super-admin/advertiser-ads/{ad_id}/reject")
async def sa_reject_ad(ad_id: str, payload: dict = Body(default={}), current_user: dict = Depends(require_super_admin)):
    db = get_db()
    ad = await db.advertiser_ads.find_one({"id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    reason = (payload.get("reason") or "").strip()
    await db.advertiser_ads.update_one(
        {"id": ad_id},
        {"$set": {
            "status": "rejected",
            "approval_status": "rejected",
            "rejection_reason": reason or "—",
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejected_by": current_user.get("id"),
        }}
    )
    return {"success": True, "message": "تم رفض الإعلان."}
