"""
Super Admin — Gifts & Bulk Renewal Offers (extracted from superadmin.py)
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import uuid
from typing import Optional
import logging
import os

from database import get_db
from auth_deps import require_super_admin
from helpers import serialize_datetime

APP_URL = os.environ.get('APP_URL', os.environ.get('REACT_APP_BACKEND_URL', 'https://homemeapp.net')).rstrip('/')

router = APIRouter(prefix="/api")


@router.post("/super-admin/users/{user_id}/send-gift")
async def send_user_gift(user_id: str, gift: dict, current_user: dict = Depends(require_super_admin)):
    """إرسال عرض/هدية لمستخدم: extend_trial | discount_coupon | free_subscription"""
    db = get_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    gift_type = gift.get("type")  # extend_trial / free_subscription / discount_coupon
    if gift_type not in ["extend_trial", "free_subscription", "discount_coupon"]:
        raise HTTPException(status_code=400, detail="Invalid gift type")

    gift_record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user.get("full_name") or user.get("username"),
        "compound_id": user.get("compound_id"),
        "type": gift_type,
        "details": gift.get("details", {}),
        "message": gift.get("message", ""),
        "sent_by": current_user.id,
        "sent_by_name": getattr(current_user, "full_name", None) or getattr(current_user, "username", ""),
        "status": "sent",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # تطبيق الهدية حسب النوع
    if gift_type == "extend_trial":
        days = int(gift.get("details", {}).get("days", 7))
        now = datetime.now(timezone.utc)
        # Extend forward from existing end_date if it's still in the future
        existing = await db.user_subscriptions.find_one({"user_id": user_id}, {"_id": 0, "end_date": 1})
        base = now
        if existing and existing.get("end_date"):
            try:
                existing_end = datetime.fromisoformat(str(existing["end_date"]).replace("Z", "+00:00"))
                if existing_end.tzinfo is None:
                    existing_end = existing_end.replace(tzinfo=timezone.utc)
                if existing_end > now:
                    base = existing_end
            except Exception:
                pass
        new_end = base + timedelta(days=days)
        await db.user_subscriptions.update_one(
            {"user_id": user_id},
            {"$set": {"end_date": new_end.isoformat(), "status": "active", "gift_extended": True}},
            upsert=True,
        )
    elif gift_type == "free_subscription":
        days = int(gift.get("details", {}).get("days", 30))
        plan = gift.get("details", {}).get("plan", "basic")
        new_end = datetime.now(timezone.utc) + timedelta(days=days)
        await db.user_subscriptions.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "plan": plan,
                "start_date": datetime.now(timezone.utc).isoformat(),
                "end_date": new_end.isoformat(),
                "status": "active",
                "is_gift": True,
                "amount": 0,
            }},
            upsert=True,
        )
    elif gift_type == "discount_coupon":
        discount = gift.get("details", {}).get("discount", 20)
        code = f"GIFT-{uuid.uuid4().hex[:6].upper()}"
        await db.coupons.insert_one({
            "id": str(uuid.uuid4()),
            "code": code,
            "discount_type": "percentage",
            "discount_value": discount,
            "max_uses": 1,
            "times_used": 0,
            "is_active": True,
            "assigned_to": user_id,
            "notes": f"هدية من مالك التطبيق - {gift.get('message', '')}",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        gift_record["details"]["coupon_code"] = code

    # حفظ سجل الهدية
    await db.user_gifts.insert_one(gift_record)

    # إشعار الداخلي للمستخدم
    try:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": "🎁 هدية خاصة من مالك التطبيق",
            "body": gift.get("message") or "تم إضافة هدية إلى حسابك",
            "type": "gift",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        pass

    # إرسال بريد إلكتروني للمستخدم (إن وجد)
    email_result = {"sent": False, "reason": "no_email"}
    to_email = user.get("email")
    if to_email:
        try:
            from email_service import email_service
            subject, html_body, text_body = _build_gift_email(
                user.get("full_name") or user.get("username") or "",
                gift_type,
                gift.get("details", {}),
                gift.get("message", ""),
                gift_record["details"].get("coupon_code"),
            )
            ok = await email_service.send_email(to_email, subject, html_body, text_body)
            email_result = {"sent": ok, "to": to_email}
        except Exception as e:
            logging.error(f"Gift email error: {e}")
            email_result = {"sent": False, "error": str(e)[:100]}

    gift_record.pop("_id", None)
    return {"success": True, "gift": serialize_datetime(gift_record), "email": email_result}


def _build_gift_email(name: str, gift_type: str, details: dict, message: str, coupon_code: Optional[str] = None):
    """Build HTML + text email for a gift notification."""
    type_labels = {
        "extend_trial": "تمديد مجاني لاشتراكك",
        "free_subscription": "اشتراك مجاني كامل",
        "discount_coupon": "كود خصم خاص",
    }
    title = type_labels.get(gift_type, "هدية خاصة")
    details_html = ""
    details_text = ""
    if gift_type == "extend_trial":
        days = details.get("days", 7)
        details_html = f"<p style='font-size:18px;margin:10px 0'>تم إضافة <b style='color:#667eea'>{days} يومًا</b> إلى مدة اشتراكك.</p>"
        details_text = f"تم إضافة {days} يومًا إلى مدة اشتراكك."
    elif gift_type == "free_subscription":
        days = details.get("days", 30)
        plan = details.get("plan", "basic")
        details_html = f"<p style='font-size:18px;margin:10px 0'>تم منحك اشتراك <b style='color:#667eea'>{plan}</b> مجانيًا لمدة <b>{days} يومًا</b>.</p>"
        details_text = f"تم منحك اشتراك {plan} مجانيًا لمدة {days} يومًا."
    elif gift_type == "discount_coupon":
        discount = details.get("discount", 0)
        code = coupon_code or details.get("coupon_code", "")
        details_html = f"""<p style='font-size:18px;margin:10px 0'>خصم <b style='color:#667eea'>{discount}%</b> على تجديد اشتراكك.</p>
        <div style='background:#f0f4ff;border:2px dashed #667eea;border-radius:10px;padding:16px;text-align:center;margin:16px 0'>
          <div style='font-size:12px;color:#666;margin-bottom:4px'>الكود الخاص بك</div>
          <div style='font-family:monospace;font-size:24px;font-weight:bold;color:#764ba2;letter-spacing:2px'>{code}</div>
        </div>"""
        details_text = f"خصم {discount}% — كود: {code}"

    user_message_html = f"<div style='background:#fff8e1;border-right:4px solid #ffa726;padding:12px;margin:16px 0;border-radius:6px'><em>{message}</em></div>" if message else ""
    user_message_text = f"\n\n{message}" if message else ""

    subject = f"🎁 هدية خاصة لك — {title} من HomeMe"
    html = f"""<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center">
      <div style="font-size:48px;margin-bottom:8px">🎁</div>
      <h1 style="margin:0;font-size:26px">{title}</h1>
      <p style="margin:8px 0 0;opacity:0.9">هدية خاصة من HomeMe</p>
    </div>
    <div style="padding:28px">
      <p style="font-size:16px">مرحبًا <b>{name}</b>،</p>
      <p>نسعد بإخبارك أن مالك التطبيق أرسل لك هدية خاصة تقديرًا لولائك 💜</p>
      {details_html}
      {user_message_html}
      <div style="text-align:center;margin-top:24px">
        <a href="{APP_URL}/app/dashboard" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:12px 30px;text-decoration:none;border-radius:25px;font-weight:bold">عرض حسابي</a>
      </div>
    </div>
    <div style="background:#f8f9fa;padding:16px;text-align:center;color:#666;font-size:12px">
      HomeMe — نظام إدارة المجمعات السكنية
    </div>
  </div>
</body>
</html>"""
    text = f"""مرحبًا {name}،

تم إرسال {title} إلى حسابك.
{details_text}{user_message_text}

افتح تطبيق HomeMe لعرض الهدية: {APP_URL}/app/dashboard

— HomeMe"""
    return subject, html, text


@router.post("/super-admin/bulk-renewal-offer/preview")
async def preview_bulk_renewal(
    days_before_expiry: int = 7,
    current_user: dict = Depends(require_super_admin)
):
    """معاينة قائمة المستخدمين الذين تنتهي اشتراكاتهم خلال N يومًا."""
    db = get_db()
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=max(1, days_before_expiry))
    targets = []
    subs = await db.user_subscriptions.find({"status": "active"}, {"_id": 0}).to_list(5000)
    for s in subs:
        end_str = s.get("end_date")
        if not end_str:
            continue
        try:
            end = datetime.fromisoformat(str(end_str).replace("Z", "+00:00"))
            if end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)
            if now <= end <= cutoff:
                u = await db.users.find_one({"id": s.get("user_id")}, {"_id": 0, "password_hash": 0})
                if u:
                    targets.append({
                        "user_id": u.get("id"),
                        "full_name": u.get("full_name") or u.get("username"),
                        "email": u.get("email"),
                        "plan": s.get("plan"),
                        "days_left": (end - now).days,
                        "end_date": str(end_str)[:10],
                    })
        except Exception:
            continue
    targets.sort(key=lambda x: x.get("days_left", 999))
    return {"targets": targets, "count": len(targets), "days_before_expiry": days_before_expiry}


@router.post("/super-admin/bulk-renewal-offer/send")
async def send_bulk_renewal(payload: dict, current_user: dict = Depends(require_super_admin)):
    """إرسال كود خصم تجديد جماعي لجميع المستخدمين الذين تنتهي اشتراكاتهم قريبًا.
    يدعم A/B Testing: مرر `variant_a_message` + `variant_b_message` لتقسيم المستلمين 50/50."""
    db = get_db()
    days_before = int(payload.get("days_before_expiry", 7))
    discount = max(1, min(90, int(payload.get("discount", 20))))
    message = payload.get("message", "")
    user_ids = payload.get("user_ids") or []

    # A/B testing: إن وُجدت كلا الرسالتين، قسّم المستلمين لمجموعتين متساويتين
    ab_enabled = bool(payload.get("ab_test"))
    variant_a_msg = (payload.get("variant_a_message") or message or "").strip()
    variant_b_msg = (payload.get("variant_b_message") or "").strip()
    if ab_enabled and not variant_b_msg:
        ab_enabled = False

    if not user_ids:
        preview = await preview_bulk_renewal(days_before, current_user)
        user_ids = [t["user_id"] for t in preview.get("targets", [])]

    # campaign_id موحد لكل الكوبونات المُصدرة
    campaign_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    sent, emails_sent, failed = 0, 0, 0
    sent_a, sent_b, used_a, used_b = 0, 0, 0, 0

    for idx, uid in enumerate(user_ids):
        try:
            user = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
            if not user:
                failed += 1
                continue
            # تعيين variant
            variant = None
            user_message = message
            if ab_enabled:
                variant = "a" if idx % 2 == 0 else "b"
                user_message = variant_a_msg if variant == "a" else variant_b_msg
                if variant == "a": sent_a += 1
                else: sent_b += 1

            code = f"RENEW-{uuid.uuid4().hex[:6].upper()}"
            coupon_doc = {
                "id": str(uuid.uuid4()),
                "code": code,
                "discount_type": "percentage",
                "discount_value": discount,
                "max_uses": 1,
                "times_used": 0,
                "is_active": True,
                "assigned_to": uid,
                "notes": f"عرض تجديد جماعي - {user_message}",
                "campaign": "bulk_renewal",
                "campaign_id": campaign_id,
                "variant": variant,
                "created_at": now_iso,
            }
            await db.coupons.insert_one(coupon_doc)
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": uid,
                "title": f"🎯 خصم {discount}% على تجديد اشتراكك",
                "body": user_message or f"استخدم الكود {code} للحصول على خصم {discount}% عند التجديد.",
                "type": "bulk_offer",
                "read": False,
                "created_at": now_iso,
            })
            sent += 1
            if user.get("email"):
                try:
                    from email_service import email_service
                    subject, html, text = _build_gift_email(
                        user.get("full_name") or user.get("username") or "",
                        "discount_coupon",
                        {"discount": discount},
                        user_message,
                        code,
                    )
                    ok = await email_service.send_email(user["email"], subject, html, text)
                    if ok:
                        emails_sent += 1
                except Exception as e:
                    logging.error(f"Bulk renewal email error: {e}")
        except Exception as e:
            logging.error(f"Bulk renewal send error for {uid}: {e}")
            failed += 1

    await db.bulk_campaigns.insert_one({
        "id": campaign_id,
        "type": "bulk_renewal",
        "discount": discount,
        "days_before_expiry": days_before,
        "message": message,
        "ab_test": ab_enabled,
        "variant_a_message": variant_a_msg if ab_enabled else None,
        "variant_b_message": variant_b_msg if ab_enabled else None,
        "sent_a": sent_a, "sent_b": sent_b,
        "sent": sent,
        "emails_sent": emails_sent,
        "failed": failed,
        "sent_by": current_user.get("id"),
        "created_at": now_iso,
    })

    return {
        "success": True, "campaign_id": campaign_id,
        "sent": sent, "emails_sent": emails_sent, "failed": failed,
        "discount": discount, "ab_test": ab_enabled,
        "sent_a": sent_a, "sent_b": sent_b,
    }


