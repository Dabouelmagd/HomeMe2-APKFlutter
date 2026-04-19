"""
Super Admin Panel & Role Management routes
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging
import uuid

from database import get_db
from auth_deps import get_current_user, require_admin, require_super_admin
from helpers import serialize_datetime
import os
import bcrypt

APP_URL = os.environ.get('APP_URL', os.environ.get('REACT_APP_BACKEND_URL', 'https://homemeapp.net')).rstrip('/')

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


@router.get("/super-admin/hierarchical-subs")
async def get_hierarchical_subscriptions(current_user: dict = Depends(require_super_admin)):
    """عرض هرمي: شركات الإدارة > المجمعات > المستخدمون + اشتراكاتهم + إجمالي"""
    db = get_db()
    try:
        # 1) Fetch all companies, compounds, users, subscriptions
        companies = await db.companies.find({}, {"_id": 0}).to_list(200)
        compounds = await db.compounds.find({}, {"_id": 0}).to_list(500)
        users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(5000)
        user_subs = await db.user_subscriptions.find({}, {"_id": 0}).to_list(5000)

        subs_by_user = {s.get("user_id"): s for s in user_subs}

        # 2) Index users by compound
        users_by_compound = {}
        for u in users:
            cid = u.get("compound_id") or "_unassigned"
            users_by_compound.setdefault(cid, []).append(u)

        # 3) Build compound nodes with users grouped by role + sub status
        def build_compound_node(compound):
            cid = compound.get("id")
            c_users = users_by_compound.get(cid, [])
            by_role = {}
            active_subs = 0
            expired_subs = 0
            for u in c_users:
                role = u.get("role", "resident")
                sub = subs_by_user.get(u.get("id"))
                if sub:
                    if sub.get("status") == "active":
                        active_subs += 1
                    elif sub.get("status") == "expired":
                        expired_subs += 1
                u_copy = {**u, "subscription": serialize_datetime(sub) if sub else None}
                by_role.setdefault(role, []).append(u_copy)
            return {
                "id": cid,
                "name": compound.get("name"),
                "location": compound.get("location") or compound.get("address"),
                "users_by_role": serialize_datetime(by_role),
                "stats": {
                    "total_users": len(c_users),
                    "residents": len(by_role.get("resident", [])),
                    "managers": len(by_role.get("manager", [])) + len(by_role.get("company_admin", [])),
                    "security": len(by_role.get("security", [])),
                    "active_subs": active_subs,
                    "expired_subs": expired_subs,
                },
            }

        # 4) Group compounds by company (or _independent) - supports both forward (compound.company_id) and reverse (company.compound_ids) linkage
        companies_nodes = []
        unassigned_compounds = []
        company_by_id = {c.get("id"): c for c in companies}
        compound_by_id = {c.get("id"): c for c in compounds}
        compound_by_company = {}

        # First pass: reverse linkage from company.compound_ids array
        assigned_compound_ids = set()
        for company in companies:
            for cid in (company.get("compound_ids") or []):
                cpd = compound_by_id.get(cid)
                if cpd:
                    compound_by_company.setdefault(company["id"], []).append(cpd)
                    assigned_compound_ids.add(cid)

        # Second pass: forward linkage from compound.company_id
        for c in compounds:
            if c.get("id") in assigned_compound_ids:
                continue
            company_id = c.get("company_id") or c.get("management_company_id")
            if company_id and company_id in company_by_id:
                compound_by_company.setdefault(company_id, []).append(c)
                assigned_compound_ids.add(c.get("id"))
            else:
                unassigned_compounds.append(c)

        for company in companies:
            comp_list = compound_by_company.get(company.get("id"), [])
            companies_nodes.append({
                "id": company.get("id"),
                "name": company.get("name") or company.get("company_name") or "Unnamed",
                "email": company.get("email"),
                "phone": company.get("phone"),
                "compounds": [build_compound_node(c) for c in comp_list],
                "compounds_count": len(comp_list),
            })

        independent_nodes = [build_compound_node(c) for c in unassigned_compounds]

        # 5) Totals
        total_users = len(users)
        total_subs_active = sum(1 for s in user_subs if s.get("status") == "active")
        total_subs_expired = sum(1 for s in user_subs if s.get("status") == "expired")
        totals = {
            "companies": len(companies),
            "compounds": len(compounds),
            "total_users": total_users,
            "residents": sum(1 for u in users if u.get("role") == "resident"),
            "managers": sum(1 for u in users if u.get("role") in ["manager", "company_admin"]),
            "security": sum(1 for u in users if u.get("role") == "security"),
            "family_heads": sum(1 for u in users if u.get("role") == "family_head"),
            "active_subs": total_subs_active,
            "expired_subs": total_subs_expired,
        }

        return {
            "companies": companies_nodes,
            "independent_compounds": independent_nodes,
            "totals": totals,
        }
    except Exception as e:
        logging.error(f"Hierarchical subs error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)[:80]}")


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


@router.get("/super-admin/compounds/{compound_id}/full-details")
async def get_compound_full_details(compound_id: str, current_user: dict = Depends(require_super_admin)):
    """تفاصيل شاملة لمجتمع: سكان + مديرون + أمن + خدمات + ميزانية + إعلانات + شكاوى + اشتراكات"""
    db = get_db()
    try:
        compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
        if not compound:
            raise HTTPException(status_code=404, detail="Compound not found")

        # السكان والأدوار
        users = await db.users.find({"compound_id": compound_id}, {"_id": 0, "password_hash": 0}).to_list(1000)
        by_role = {}
        for u in users:
            role = u.get("role", "resident")
            by_role.setdefault(role, []).append(u)

        # العائلات
        families = await db.families.find({"compound_id": compound_id}, {"_id": 0}).to_list(500)

        # الشكاوى
        complaints_total = await db.complaints.count_documents({"compound_id": compound_id})
        complaints_open = await db.complaints.count_documents({"compound_id": compound_id, "status": "open"})
        complaints_resolved = await db.complaints.count_documents({"compound_id": compound_id, "status": "resolved"})
        recent_complaints = await db.complaints.find({"compound_id": compound_id}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)

        # الخدمات
        services = await db.compound_services.find({"compound_id": compound_id}, {"_id": 0}).to_list(100)

        # الميزانية
        budget = await db.budgets.find_one({"compound_id": compound_id}, {"_id": 0})

        # الإعلانات — فصل المستهدف فعليًا لهذا المجتمع عن العام
        compound_ads = await db.internal_ads.find({"target_compounds": compound_id}, {"_id": 0}).to_list(100)
        global_ads = await db.internal_ads.find({
            "$or": [
                {"target_compounds": {"$exists": False}},
                {"target_compounds": None},
                {"target_compounds": []},
            ]
        }, {"_id": 0}).to_list(100)
        # للتوافق الخلفي، ads = المستهدف + العام (بلا تكرار)
        seen_ids = set()
        ads = []
        for ad in compound_ads + global_ads:
            aid = ad.get("id")
            if aid not in seen_ids:
                seen_ids.add(aid)
                ads.append(ad)

        # الحوادث الأمنية (إن وجدت)
        incidents_open = await db.security_incidents.count_documents({"compound_id": compound_id, "status": {"$ne": "resolved"}})

        # الاشتراك — نفضّل اشتراك شركة الإدارة إن وجدت، ثم company_admin، ثم manager
        company_id = compound.get("company_id") or compound.get("management_company_id")
        subscription = None
        if company_id:
            subscription = await db.company_subscriptions.find_one({"company_id": company_id}, {"_id": 0})
        if not subscription:
            subscription = await db.subscriptions.find_one({"compound_id": compound_id}, {"_id": 0})
        if not subscription:
            # أولوية للأدوار القيادية
            for preferred_role in ["company_admin", "manager", "admin"]:
                admin_ids = [u.get("id") for u in by_role.get(preferred_role, []) if u.get("id")]
                if admin_ids:
                    subscription = await db.user_subscriptions.find_one(
                        {"user_id": {"$in": admin_ids}, "status": "active"}, {"_id": 0}
                    )
                    if subscription:
                        break

        # إحصائيات
        stats = {
            "total_users": len(users),
            "residents": len(by_role.get("resident", [])),
            "managers": len(by_role.get("manager", [])) + len(by_role.get("company_admin", [])),
            "security": len(by_role.get("security", [])),
            "family_heads": len(by_role.get("family_head", [])),
            "family_members": len(by_role.get("family_member", [])),
            "families": len(families),
            "complaints_total": complaints_total,
            "complaints_open": complaints_open,
            "complaints_resolved": complaints_resolved,
            "services_count": len(services),
            "ads_count": len(ads),
            "ads_targeted_count": len(compound_ads),
            "ads_global_count": len(global_ads),
            "incidents_open": incidents_open,
        }

        return {
            "compound": serialize_datetime(compound),
            "stats": stats,
            "users_by_role": {k: serialize_datetime(v) for k, v in by_role.items()},
            "families": serialize_datetime(families),
            "recent_complaints": serialize_datetime(recent_complaints),
            "services": serialize_datetime(services),
            "budget": serialize_datetime(budget) if budget else None,
            "ads": serialize_datetime(ads),
            "ads_targeted": serialize_datetime(compound_ads),
            "ads_global": serialize_datetime(global_ads),
            "subscription": serialize_datetime(subscription) if subscription else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Compound full details error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)[:80]}")


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


@router.post("/super-admin/users")
async def super_admin_create_user(user_data: dict, current_user: dict = Depends(require_super_admin)):
    """إنشاء مستخدم جديد في أي مجمع (Super Admin / App Owner فقط)"""
    db = get_db()
    username = (user_data.get("username") or "").strip()
    email = (user_data.get("email") or "").strip()
    password = user_data.get("password") or ""
    full_name = (user_data.get("full_name") or "").strip()
    role = user_data.get("role") or "resident"
    compound_id = user_data.get("compound_id")
    phone = user_data.get("phone", "")
    unit_number = user_data.get("unit_number", "")

    if not username or not email or not password or not full_name:
        raise HTTPException(status_code=400, detail="username, email, password, full_name مطلوبة")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب ألا تقل عن 6 أحرف")

    existing = await db.users.find_one({"$or": [{"username": username}, {"email": email}]})
    if existing:
        if existing.get("username") == username:
            raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم بالفعل")
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")

    if compound_id:
        compound = await db.compounds.find_one({"id": compound_id})
        if not compound:
            raise HTTPException(status_code=400, detail="المجمع غير موجود")

    valid_roles = ["super_admin", "company_admin", "admin", "manager", "security", "resident", "family_head", "family_member", "app_owner"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"دور غير صالح. الأدوار المتاحة: {valid_roles}")

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user_doc = {
        "id": str(uuid.uuid4()),
        "username": username,
        "email": email,
        "password_hash": password_hash,
        "role": role,
        "compound_id": compound_id,
        "family_id": None,
        "full_name": full_name,
        "phone": phone,
        "unit_number": unit_number,
        "is_family_head": False,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "profile_picture_url": None,
    }
    await db.users.insert_one(user_doc)
    user_doc.pop("_id", None)
    user_doc.pop("password_hash", None)
    return {"success": True, "user": serialize_datetime(user_doc)}


@router.put("/super-admin/users/{user_id}/role")
async def super_admin_update_role(user_id: str, role: str, current_user: dict = Depends(require_super_admin)):
    db = get_db()
    try:
        valid_roles = ["super_admin", "company_admin", "admin", "manager", "security", "resident"]
        if role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
        result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
        if result.matched_count == 0:
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



@router.get("/super-admin/subscription-analytics")
async def subscription_analytics(current_user: dict = Depends(require_super_admin)):
    db = get_db()
    try:
        users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(2000)
        
        active_subs = [u for u in users if u.get("subscription_active")]
        by_plan = {}
        by_type = {}
        revenue_estimate = 0
        expiring_soon = []
        
        plan_prices = {"basic": 500, "pro": 1200, "premium": 2200, "company_startup": 3500, "company_business": 7500, "company_enterprise": 20000}
        
        from datetime import datetime, timedelta, timezone
        now = datetime.now(timezone.utc)
        
        for u in active_subs:
            plan = u.get("subscription_plan", u.get("subscription_type", "trial"))
            by_plan[plan] = by_plan.get(plan, 0) + 1
            
            stype = u.get("subscription_type", "unknown")
            by_type[stype] = by_type.get(stype, 0) + 1
            
            revenue_estimate += plan_prices.get(plan, 0)
            
            end_str = u.get("subscription_end", "")
            if end_str:
                try:
                    end = datetime.fromisoformat(str(end_str).replace("Z", "+00:00"))
                    if end.tzinfo is None:
                        end = end.replace(tzinfo=timezone.utc)
                    days_left = (end - now).days
                    if 0 < days_left <= 30:
                        expiring_soon.append({
                            "user_id": u.get("id"), "full_name": u.get("full_name", ""),
                            "username": u.get("username", ""), "plan": plan,
                            "days_left": days_left, "end_date": str(end_str)[:10]
                        })
                except Exception:
                    pass
        
        expiring_soon.sort(key=lambda x: x.get("days_left", 999))
        
        # Recent payments
        transactions = await db.payment_transactions.find(
            {"payment_type": "subscription", "payment_status": "paid"},
            {"_id": 0}
        ).sort("created_at", -1).limit(20).to_list(20)
        
        return serialize_datetime({
            "total_users": len(users),
            "active_subscriptions": len(active_subs),
            "free_users": len([u for u in users if not u.get("subscription_active")]),
            "by_plan": by_plan,
            "by_type": by_type,
            "monthly_revenue_estimate": revenue_estimate,
            "expiring_soon": expiring_soon[:20],
            "recent_payments": transactions,
            "trial_users": len([u for u in users if u.get("subscription_type") == "trial"])
        })
    except Exception as e:
        logging.error(f"Subscription analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed")


# ==================== Management Companies CRUD (Super Admin) ====================

@router.get("/super-admin/companies")
async def list_companies_full(current_user: dict = Depends(require_super_admin)):
    """قائمة شاملة لشركات الإدارة مع كل التفاصيل: المجمعات، المستخدمون، الاشتراكات، الأرقام"""
    db = get_db()
    companies = await db.companies.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    compounds_all = await db.compounds.find({}, {"_id": 0}).to_list(1000)
    users_all = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(5000)
    subs_all = await db.user_subscriptions.find({}, {"_id": 0}).to_list(5000)
    sub_by_user = {s.get("user_id"): s for s in subs_all}
    now = datetime.now(timezone.utc)

    # Build compound_id → compound lookup
    compound_by_id = {c.get("id"): c for c in compounds_all}
    compounds_by_company = {}
    assigned = set()
    for company in companies:
        # reverse linkage
        for cid in (company.get("compound_ids") or []):
            cpd = compound_by_id.get(cid)
            if cpd:
                compounds_by_company.setdefault(company["id"], []).append(cpd)
                assigned.add(cid)
    for c in compounds_all:
        if c.get("id") in assigned:
            continue
        cid = c.get("company_id") or c.get("management_company_id")
        if cid and any(co.get("id") == cid for co in companies):
            compounds_by_company.setdefault(cid, []).append(c)

    # users by compound
    users_by_compound = {}
    for u in users_all:
        cid = u.get("compound_id")
        if cid:
            users_by_compound.setdefault(cid, []).append(u)

    def summarize_user(u):
        sub = sub_by_user.get(u.get("id")) or {}
        status = "-"
        end_date = sub.get("end_date")
        if end_date:
            try:
                end = datetime.fromisoformat(str(end_date).replace("Z", "+00:00"))
                if end.tzinfo is None: end = end.replace(tzinfo=timezone.utc)
                status = "active" if end > now else "expired"
            except Exception: pass
        return {
            "id": u.get("id"), "username": u.get("username"),
            "full_name": u.get("full_name"), "email": u.get("email"), "phone": u.get("phone"),
            "role": u.get("role"), "is_active": u.get("is_active", True),
            "subscription": {"status": status, "plan": sub.get("plan"), "end_date": end_date},
        }

    result = []
    for co in companies:
        cpds = compounds_by_company.get(co["id"], [])
        total_users = 0
        active_subs = 0
        expired_subs = 0
        cpds_enriched = []
        for cpd in cpds:
            cpd_users = users_by_compound.get(cpd.get("id"), [])
            total_users += len(cpd_users)
            by_role = {}
            for u in cpd_users:
                su = summarize_user(u)
                by_role.setdefault(u.get("role") or "unknown", []).append(su)
                if su["subscription"]["status"] == "active": active_subs += 1
                elif su["subscription"]["status"] == "expired": expired_subs += 1
            cpds_enriched.append({
                "id": cpd.get("id"), "name": cpd.get("name"),
                "location": cpd.get("location") or cpd.get("address", ""),
                "description": cpd.get("description", ""),
                "users_count": len(cpd_users),
                "residents": sum(1 for u in cpd_users if u.get("role") == "resident"),
                "managers": sum(1 for u in cpd_users if u.get("role") in ["manager", "admin"]),
                "security": sum(1 for u in cpd_users if u.get("role") == "security"),
                "users_by_role": by_role,
            })

        # Find company admin user (if any)
        admin_user = None
        admin_id = co.get("admin_user_id")
        if admin_id:
            au = next((u for u in users_all if u.get("id") == admin_id), None)
            if au: admin_user = summarize_user(au)

        result.append({
            **co,
            "compounds": cpds_enriched,
            "compounds_count": len(cpds_enriched),
            "total_users": total_users,
            "active_subs": active_subs,
            "expired_subs": expired_subs,
            "admin_user": admin_user,
        })
    return {"companies": serialize_datetime(result), "total": len(result)}


@router.post("/super-admin/companies")
async def create_company(payload: dict, current_user: dict = Depends(require_super_admin)):
    """إنشاء شركة إدارة جديدة"""
    db = get_db()
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="اسم الشركة مطلوب")
    company_doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": payload.get("email", ""),
        "phone": payload.get("phone", ""),
        "address": payload.get("address", ""),
        "website": payload.get("website", ""),
        "description": payload.get("description", ""),
        "compound_ids": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id"),
    }
    await db.companies.insert_one(company_doc)
    company_doc.pop("_id", None)
    return {"success": True, "company": serialize_datetime(company_doc)}


@router.delete("/super-admin/companies/{company_id}")
async def delete_company(company_id: str, current_user: dict = Depends(require_super_admin)):
    """حذف شركة إدارة (يفكّ الربط عن المجمعات تلقائيًا)"""
    db = get_db()
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    # Unlink compounds
    await db.compounds.update_many(
        {"$or": [{"company_id": company_id}, {"management_company_id": company_id}]},
        {"$unset": {"company_id": "", "management_company_id": ""}}
    )
    await db.companies.delete_one({"id": company_id})
    return {"success": True}


@router.post("/super-admin/companies/{company_id}/link-compound")
async def link_compound_to_company(company_id: str, payload: dict, current_user: dict = Depends(require_super_admin)):
    """ربط مجمع موجود بشركة إدارة"""
    db = get_db()
    compound_id = payload.get("compound_id")
    if not compound_id:
        raise HTTPException(status_code=400, detail="compound_id مطلوب")
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="Compound not found")
    await db.compounds.update_one(
        {"id": compound_id},
        {"$set": {"company_id": company_id, "management_company_id": company_id}}
    )
    await db.companies.update_one(
        {"id": company_id},
        {"$addToSet": {"compound_ids": compound_id}}
    )
    return {"success": True}


@router.post("/super-admin/companies/{company_id}/unlink-compound")
async def unlink_compound_from_company(company_id: str, payload: dict, current_user: dict = Depends(require_super_admin)):
    """فكّ ربط مجمع عن شركة إدارة"""
    db = get_db()
    compound_id = payload.get("compound_id")
    if not compound_id:
        raise HTTPException(status_code=400, detail="compound_id مطلوب")
    await db.compounds.update_one(
        {"id": compound_id},
        {"$unset": {"company_id": "", "management_company_id": ""}}
    )
    await db.companies.update_one(
        {"id": company_id},
        {"$pull": {"compound_ids": compound_id}}
    )
    return {"success": True}


@router.get("/super-admin/companies/top10")
async def top10_companies(metric: str = "compounds", current_user: dict = Depends(require_super_admin)):
    """أعلى 10 شركات إدارة حسب المقياس المختار (compounds / users / revenue / active_subs)"""
    db = get_db()
    companies = await db.companies.find({}, {"_id": 0}).to_list(500)
    compounds_all = await db.compounds.find({}, {"_id": 0}).to_list(2000)
    users_all = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(10000)
    subs_all = await db.user_subscriptions.find({}, {"_id": 0}).to_list(10000)
    company_subs = await db.company_subscriptions.find({}, {"_id": 0}).to_list(500)

    compound_by_id = {c.get("id"): c for c in compounds_all}
    sub_by_user = {s.get("user_id"): s for s in subs_all}
    company_sub_by_co = {s.get("company_id"): s for s in company_subs}
    now = datetime.now(timezone.utc)

    enriched = []
    for co in companies:
        # resolve linked compound ids
        cpd_ids = set(co.get("compound_ids") or [])
        for c in compounds_all:
            cid = c.get("company_id") or c.get("management_company_id")
            if cid == co.get("id"):
                cpd_ids.add(c.get("id"))
        cpds = [compound_by_id[cid] for cid in cpd_ids if cid in compound_by_id]
        users = [u for u in users_all if u.get("compound_id") in cpd_ids]
        active_subs = 0
        expired_subs = 0
        for u in users:
            s = sub_by_user.get(u.get("id"))
            if s and s.get("end_date"):
                try:
                    end = datetime.fromisoformat(str(s["end_date"]).replace("Z", "+00:00"))
                    if end.tzinfo is None: end = end.replace(tzinfo=timezone.utc)
                    if end > now: active_subs += 1
                    else: expired_subs += 1
                except Exception: pass
        # revenue: company subscription price * paid months approx, else sum plan prices
        revenue = 0.0
        csub = company_sub_by_co.get(co.get("id"))
        if csub:
            revenue = float(csub.get("total_paid") or csub.get("price") or 0)
        enriched.append({
            "id": co.get("id"),
            "name": co.get("name"),
            "email": co.get("email", ""),
            "compounds_count": len(cpds),
            "total_users": len(users),
            "active_subs": active_subs,
            "expired_subs": expired_subs,
            "revenue": revenue,
        })

    sort_keys = {
        "compounds": lambda x: (x["compounds_count"], x["total_users"]),
        "users": lambda x: (x["total_users"], x["compounds_count"]),
        "revenue": lambda x: (x["revenue"], x["total_users"]),
        "active_subs": lambda x: (x["active_subs"], x["total_users"]),
    }
    key_fn = sort_keys.get(metric, sort_keys["compounds"])
    enriched.sort(key=key_fn, reverse=True)
    top = enriched[:10]

    return {
        "metric": metric,
        "top": top,
        "summary": {
            "total_companies": len(companies),
            "total_compounds": len(compounds_all),
            "total_users": len(users_all),
        }
    }


@router.post("/super-admin/import-full-structure")
async def import_full_structure(
    file: UploadFile = File(...),
    mode: str = Form("merge"),  # merge | replace
    current_user: dict = Depends(require_super_admin),
):
    """استيراد بنية الإدارة من ملف JSON (merge: يضيف/يحدّث، replace: يستبدل الشركات والمجمعات)"""
    import json as jsonlib
    content = await file.read()
    try:
        payload = jsonlib.loads(content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"JSON غير صالح: {str(e)[:100]}")

    db = get_db()
    companies_in = payload.get("companies", []) or []
    compounds_in = payload.get("compounds", []) or []

    if not isinstance(companies_in, list) or not isinstance(compounds_in, list):
        raise HTTPException(status_code=400, detail="بنية الملف غير صحيحة — يجب أن يحتوي على مصفوفات companies و compounds")

    imported_companies = 0
    imported_compounds = 0
    updated_companies = 0
    updated_compounds = 0

    if mode == "replace":
        # خطر: يحذف كل الشركات والمجمعات الحالية
        await db.companies.delete_many({})
        await db.compounds.delete_many({})

    for co in companies_in:
        if not co.get("id") or not co.get("name"):
            continue
        existing = await db.companies.find_one({"id": co["id"]}, {"_id": 0, "id": 1})
        # normalize
        co.pop("_id", None)
        if existing and mode == "merge":
            await db.companies.update_one({"id": co["id"]}, {"$set": co})
            updated_companies += 1
        else:
            await db.companies.insert_one(co)
            imported_companies += 1

    for cpd in compounds_in:
        if not cpd.get("id") or not cpd.get("name"):
            continue
        cpd.pop("_id", None)
        existing = await db.compounds.find_one({"id": cpd["id"]}, {"_id": 0, "id": 1})
        if existing and mode == "merge":
            await db.compounds.update_one({"id": cpd["id"]}, {"$set": cpd})
            updated_compounds += 1
        else:
            await db.compounds.insert_one(cpd)
            imported_compounds += 1

    return {
        "success": True, "mode": mode,
        "imported_companies": imported_companies, "updated_companies": updated_companies,
        "imported_compounds": imported_compounds, "updated_compounds": updated_compounds,
    }


@router.get("/super-admin/export-full-structure")
async def export_full_structure(current_user: dict = Depends(require_super_admin)):
    """تصدير بنية الإدارة كاملة (Companies + Compounds + Users + Subscriptions) كملف JSON قابل للتنزيل"""
    from fastapi.responses import StreamingResponse
    import io, json as jsonlib
    db = get_db()
    companies = await db.companies.find({}, {"_id": 0}).to_list(1000)
    compounds = await db.compounds.find({}, {"_id": 0}).to_list(2000)
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(10000)
    subscriptions = await db.user_subscriptions.find({}, {"_id": 0}).to_list(10000)
    company_subs = await db.company_subscriptions.find({}, {"_id": 0}).to_list(1000)

    export = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "exported_by": {"id": current_user.get("id"), "username": current_user.get("username"), "role": current_user.get("role")},
        "version": "1.0",
        "summary": {
            "companies": len(companies),
            "compounds": len(compounds),
            "users": len(users),
            "user_subscriptions": len(subscriptions),
            "company_subscriptions": len(company_subs),
        },
        "companies": serialize_datetime(companies),
        "compounds": serialize_datetime(compounds),
        "users": serialize_datetime(users),
        "user_subscriptions": serialize_datetime(subscriptions),
        "company_subscriptions": serialize_datetime(company_subs),
    }

    buffer = io.BytesIO(jsonlib.dumps(export, ensure_ascii=False, indent=2).encode("utf-8"))
    filename = f"homeme-structure-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}.json"
    return StreamingResponse(
        buffer,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.put("/super-admin/companies/{company_id}")
async def update_management_company(company_id: str, payload: dict, current_user: dict = Depends(require_super_admin)):
    """تعديل بيانات شركة إدارة"""
    db = get_db()
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    allowed = {"name", "email", "phone", "address", "website", "description", "company_name"}
    update = {k: v for k, v in payload.items() if k in allowed}
    if not update:
        raise HTTPException(status_code=400, detail="لا توجد حقول صالحة للتحديث")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.companies.update_one({"id": company_id}, {"$set": update})
    return {"success": True, "updated": list(update.keys())}


@router.post("/super-admin/companies/{company_id}/compounds")
async def add_compound_to_company(company_id: str, payload: dict, current_user: dict = Depends(require_super_admin)):
    """إضافة مجمع جديد تحت شركة إدارة محددة"""
    db = get_db()
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="اسم المجمع مطلوب")
    compound_doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "location": payload.get("location") or payload.get("address") or "",
        "address": payload.get("address") or payload.get("location") or "",
        "description": payload.get("description", ""),
        "company_id": company_id,
        "management_company_id": company_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id"),
    }
    await db.compounds.insert_one(compound_doc)
    # Also register the compound_id in the company's compound_ids array for hierarchical linkage
    await db.companies.update_one(
        {"id": company_id},
        {"$addToSet": {"compound_ids": compound_doc["id"]}}
    )
    compound_doc.pop("_id", None)
    return {"success": True, "compound": serialize_datetime(compound_doc)}


# ==================== Bulk Campaigns Stats & Helpers ====================

@router.get("/super-admin/bulk-campaigns")
async def list_bulk_campaigns(current_user: dict = Depends(require_super_admin)):
    """قائمة حملات العروض الجماعية مع معدل الاستخدام (عبر campaign_id FK) و A/B stats"""
    db = get_db()
    campaigns = await db.bulk_campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    enriched = []
    total_sent = 0
    total_used = 0
    for c in campaigns:
        cid = c.get("id")
        # Exact match via campaign_id FK
        coupons = await db.coupons.find(
            {"campaign_id": cid},
            {"_id": 0, "times_used": 1, "variant": 1}
        ).to_list(5000)
        used = sum(1 for x in coupons if (x.get("times_used") or 0) > 0)
        # Fallback للحملات القديمة التي لا تحمل campaign_id
        if not coupons and c.get("sent"):
            legacy_coupons = await db.coupons.find(
                {"campaign": "bulk_renewal", "created_at": {"$gte": c.get("created_at")}},
                {"_id": 0, "times_used": 1}
            ).to_list(c.get("sent", 500) or 500)
            used = sum(1 for x in legacy_coupons[:c.get("sent", 0) or 500] if (x.get("times_used") or 0) > 0)

        # A/B breakdown
        used_a = sum(1 for x in coupons if x.get("variant") == "a" and (x.get("times_used") or 0) > 0)
        used_b = sum(1 for x in coupons if x.get("variant") == "b" and (x.get("times_used") or 0) > 0)
        sent_a = c.get("sent_a") or sum(1 for x in coupons if x.get("variant") == "a")
        sent_b = c.get("sent_b") or sum(1 for x in coupons if x.get("variant") == "b")

        total_sent += c.get("sent", 0) or 0
        total_used += used
        enriched.append({
            **c,
            "used": used,
            "conversion_rate": round(100 * used / c["sent"], 1) if c.get("sent") else 0,
            "variant_a": {
                "sent": sent_a, "used": used_a,
                "conversion_rate": round(100 * used_a / sent_a, 1) if sent_a else 0,
            },
            "variant_b": {
                "sent": sent_b, "used": used_b,
                "conversion_rate": round(100 * used_b / sent_b, 1) if sent_b else 0,
            },
        })
    return {
        "campaigns": serialize_datetime(enriched),
        "summary": {
            "total_campaigns": len(campaigns),
            "total_sent": total_sent,
            "total_used": total_used,
            "overall_conversion_rate": round(100 * total_used / total_sent, 1) if total_sent else 0,
        }
    }


@router.get("/super-admin/bulk-campaigns/{campaign_id}/timeline")
async def get_campaign_timeline(campaign_id: str, current_user: dict = Depends(require_super_admin)):
    """توقيت استخدام كوبونات الحملة (cumulative conversion over time)."""
    db = get_db()
    campaign = await db.bulk_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    coupons = await db.coupons.find({"campaign_id": campaign_id}, {"_id": 0, "times_used": 1, "used_at": 1, "created_at": 1, "variant": 1}).to_list(5000)
    # Build daily cumulative usage series
    from collections import defaultdict
    daily = defaultdict(lambda: {"used": 0, "used_a": 0, "used_b": 0})
    for c in coupons:
        if (c.get("times_used") or 0) <= 0:
            continue
        # استخدم used_at إذا وُجد وإلا created_at كبديل
        when = c.get("used_at") or c.get("created_at")
        if not when:
            continue
        day = str(when)[:10]
        daily[day]["used"] += 1
        if c.get("variant") == "a":
            daily[day]["used_a"] += 1
        elif c.get("variant") == "b":
            daily[day]["used_b"] += 1
    # Build cumulative
    series = []
    cum, cum_a, cum_b = 0, 0, 0
    for day in sorted(daily.keys()):
        cum += daily[day]["used"]
        cum_a += daily[day]["used_a"]
        cum_b += daily[day]["used_b"]
        series.append({
            "date": day,
            "daily_used": daily[day]["used"],
            "cumulative_used": cum,
            "cumulative_used_a": cum_a,
            "cumulative_used_b": cum_b,
            "cumulative_conversion_rate": round(100 * cum / campaign.get("sent", 1), 1) if campaign.get("sent") else 0,
        })
    return {"campaign": serialize_datetime(campaign), "series": series, "total_used": cum, "sent": campaign.get("sent", 0)}


@router.get("/super-admin/bulk-campaigns/{campaign_id}/pdf")
async def export_campaign_pdf(campaign_id: str, current_user: dict = Depends(require_super_admin)):
    """تصدير ملخص الحملة كـ PDF."""
    from fastapi.responses import StreamingResponse
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    import io

    db = get_db()
    campaign = await db.bulk_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    coupons = await db.coupons.find({"campaign_id": campaign_id}, {"_id": 0, "times_used": 1, "variant": 1}).to_list(5000)
    used = sum(1 for c in coupons if (c.get("times_used") or 0) > 0)
    used_a = sum(1 for c in coupons if c.get("variant") == "a" and (c.get("times_used") or 0) > 0)
    used_b = sum(1 for c in coupons if c.get("variant") == "b" and (c.get("times_used") or 0) > 0)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=15*mm, bottomMargin=15*mm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=TA_CENTER, textColor=colors.HexColor('#7c3aed'), fontSize=22, spaceAfter=10)
    sub_style = ParagraphStyle('Sub', parent=styles['Normal'], alignment=TA_CENTER, textColor=colors.grey, fontSize=11, spaceAfter=16)
    h2 = ParagraphStyle('H2', parent=styles['Heading2'], textColor=colors.HexColor('#333'), fontSize=14, spaceBefore=10, spaceAfter=8)

    story = [
        Paragraph(f"Campaign Summary Report", title_style),
        Paragraph(f"Campaign ID: {campaign_id[:8]} &nbsp;|&nbsp; Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", sub_style),
    ]

    # Overview table
    overview_data = [
        ["Metric", "Value"],
        ["Campaign Type", "Auto Monthly Renewal" if campaign.get("auto") else "Manual Bulk Renewal"],
        ["Discount", f"{campaign.get('discount', 0)}%"],
        ["Days before expiry", str(campaign.get('days_before_expiry', 0))],
        ["Sent", str(campaign.get('sent', 0))],
        ["Emails Delivered", str(campaign.get('emails_sent', 0))],
        ["Used (redeemed)", str(used)],
        ["Conversion Rate", f"{round(100 * used / campaign.get('sent', 1), 1) if campaign.get('sent') else 0}%"],
        ["Created At", str(campaign.get('created_at', ''))[:19].replace('T', ' ')],
    ]
    t = Table(overview_data, colWidths=[70*mm, 100*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#7c3aed')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.whitesmoke, colors.white]),
        ('GRID', (0,0), (-1,-1), 0.25, colors.grey),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(Paragraph("Overview", h2))
    story.append(t)
    story.append(Spacer(1, 8*mm))

    # A/B section
    if campaign.get("ab_test"):
        sent_a = campaign.get("sent_a") or 0
        sent_b = campaign.get("sent_b") or 0
        ab_data = [
            ["Variant", "Sent", "Used", "Conversion Rate", "Message"],
            ["A", str(sent_a), str(used_a), f"{round(100*used_a/sent_a, 1) if sent_a else 0}%", (campaign.get('variant_a_message') or '')[:80]],
            ["B", str(sent_b), str(used_b), f"{round(100*used_b/sent_b, 1) if sent_b else 0}%", (campaign.get('variant_b_message') or '')[:80]],
        ]
        ab = Table(ab_data, colWidths=[18*mm, 18*mm, 18*mm, 30*mm, 86*mm])
        ab.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#ec4899')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('GRID', (0,0), (-1,-1), 0.25, colors.grey),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(Paragraph("A/B Test Results", h2))
        story.append(ab)
        winner = "A" if used_a/max(sent_a,1) > used_b/max(sent_b,1) else ("B" if used_b/max(sent_b,1) > used_a/max(sent_a,1) else "Tie")
        story.append(Spacer(1, 4*mm))
        story.append(Paragraph(f"<b>Winner:</b> Variant {winner}", styles['Normal']))
        story.append(Spacer(1, 8*mm))

    story.append(Paragraph(f"HomeMe — Powered by Campaign Analytics Engine", sub_style))
    doc.build(story)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=campaign-{campaign_id[:8]}.pdf"})


@router.get("/super-admin/expiring-soon-count")
async def expiring_soon_count(days: int = 7, current_user: dict = Depends(require_super_admin)):
    """عدد المستخدمين الذين تنتهي اشتراكاتهم خلال N يومًا — للـ badge في الواجهة"""
    db = get_db()
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=max(1, days))
    count = 0
    users = await db.users.find({"subscription_active": True}, {"_id": 0, "subscription_end": 1}).to_list(5000)
    for u in users:
        end_str = u.get("subscription_end")
        if not end_str:
            continue
        try:
            end = datetime.fromisoformat(str(end_str).replace("Z", "+00:00"))
            if end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)
            if now <= end <= cutoff:
                count += 1
        except Exception:
            continue
    return {"count": count, "days": days}


# ==================== Scheduler Config ====================

@router.get("/super-admin/auto-renewal-config")
async def get_auto_renewal_config(current_user: dict = Depends(require_super_admin)):
    """إعدادات التجديد التلقائي الجماعي"""
    db = get_db()
    cfg = await db.auto_renewal_config.find_one({"id": "default"}, {"_id": 0})
    if not cfg:
        cfg = {
            "id": "default",
            "enabled": False,
            "day_of_month": 1,
            "days_before_expiry": 7,
            "discount": 20,
            "message": "",
            "last_run": None,
        }
    return serialize_datetime(cfg)


@router.put("/super-admin/auto-renewal-config")
async def update_auto_renewal_config(payload: dict, current_user: dict = Depends(require_super_admin)):
    """تحديث إعدادات التجديد التلقائي"""
    db = get_db()
    update = {
        "id": "default",
        "enabled": bool(payload.get("enabled", False)),
        "day_of_month": max(1, min(28, int(payload.get("day_of_month", 1)))),
        "days_before_expiry": max(1, min(90, int(payload.get("days_before_expiry", 7)))),
        "discount": max(1, min(90, int(payload.get("discount", 20)))),
        "message": payload.get("message", ""),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.auto_renewal_config.update_one({"id": "default"}, {"$set": update}, upsert=True)
    return {"success": True, "config": serialize_datetime(update)}


async def run_auto_renewal_if_due():
    """يستدعى من الـ scheduler يوميًا. يُرسل عرض التجديد الجماعي إذا تطابق اليوم مع day_of_month."""
    db = get_db()
    cfg = await db.auto_renewal_config.find_one({"id": "default"}, {"_id": 0})
    if not cfg or not cfg.get("enabled"):
        return {"skipped": True, "reason": "disabled"}
    today = datetime.now(timezone.utc)
    if today.day != cfg.get("day_of_month", 1):
        return {"skipped": True, "reason": "not_day_of_month"}
    # منع التكرار في نفس اليوم
    last = cfg.get("last_run")
    if last:
        try:
            last_dt = datetime.fromisoformat(str(last).replace("Z", "+00:00"))
            if last_dt.date() == today.date():
                return {"skipped": True, "reason": "already_ran_today"}
        except Exception:
            pass
    # بناء القائمة وإرسالها
    days_before = cfg.get("days_before_expiry", 7)
    discount = cfg.get("discount", 20)
    message = cfg.get("message", "")
    now = today
    cutoff = now + timedelta(days=days_before)
    user_ids = []
    users_all = await db.users.find({"subscription_active": True}, {"_id": 0}).to_list(10000)
    for u in users_all:
        end_str = u.get("subscription_end")
        if not end_str:
            continue
        try:
            end = datetime.fromisoformat(str(end_str).replace("Z", "+00:00"))
            if end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)
            if now <= end <= cutoff:
                user_ids.append(u.get("id"))
        except Exception:
            continue

    sent = 0
    emails_sent = 0
    campaign_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    for uid in user_ids:
        try:
            user = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
            if not user:
                continue
            code = f"RENEW-{uuid.uuid4().hex[:6].upper()}"
            await db.coupons.insert_one({
                "id": str(uuid.uuid4()),
                "code": code,
                "discount_type": "percentage",
                "discount_value": discount,
                "max_uses": 1,
                "times_used": 0,
                "is_active": True,
                "assigned_to": uid,
                "notes": f"Auto monthly renewal - {message}",
                "campaign": "bulk_renewal_auto",
                "campaign_id": campaign_id,
                "variant": None,
                "created_at": now_iso,
            })
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": uid,
                "title": f"🎯 خصم {discount}% على تجديد اشتراكك",
                "body": message or f"استخدم الكود {code} للحصول على خصم {discount}% عند التجديد.",
                "type": "bulk_offer_auto",
                "read": False,
                "created_at": now_iso,
            })
            sent += 1
            if user.get("email"):
                try:
                    from email_service import email_service
                    subject, html, text = _build_gift_email(
                        user.get("full_name") or user.get("username") or "",
                        "discount_coupon", {"discount": discount}, message, code,
                    )
                    ok = await email_service.send_email(user["email"], subject, html, text)
                    if ok:
                        emails_sent += 1
                except Exception as e:
                    logging.error(f"Auto-renewal email error: {e}")
        except Exception as e:
            logging.error(f"Auto-renewal send error for {uid}: {e}")

    await db.bulk_campaigns.insert_one({
        "id": campaign_id,
        "type": "bulk_renewal_auto",
        "discount": discount,
        "days_before_expiry": days_before,
        "message": message,
        "sent": sent,
        "emails_sent": emails_sent,
        "failed": 0,
        "auto": True,
        "created_at": now_iso,
    })
    await db.auto_renewal_config.update_one(
        {"id": "default"},
        {"$set": {"last_run": now.isoformat(), "last_sent": sent}},
    )

    # إرسال بريد ملخّص لمالك التطبيق
    try:
        owners = await db.users.find(
            {"role": {"$in": ["app_owner", "super_admin"]}, "email": {"$exists": True, "$ne": ""}},
            {"_id": 0, "email": 1, "full_name": 1, "username": 1}
        ).to_list(20)
        if owners:
            from email_service import email_service
            subject = f"📊 تقرير التجديد التلقائي — {now.strftime('%Y-%m-%d')}"
            html = f"""<!DOCTYPE html><html dir="rtl"><body style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1)">
  <div style="background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%);color:white;padding:24px;text-align:center">
    <div style="font-size:44px">🎯</div><h1 style="margin:8px 0 0;font-size:22px">تقرير التجديد التلقائي الشهري</h1>
    <p style="margin:4px 0 0;opacity:.9">{now.strftime('%Y-%m-%d %H:%M UTC')}</p>
  </div>
  <div style="padding:28px">
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tr><td style="padding:10px;border-bottom:1px solid #eee">📋 المستهدفون</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:left;font-weight:bold;color:#7c3aed">{len(user_ids)}</td></tr>
      <tr><td style="padding:10px;border-bottom:1px solid #eee">✉️ الكوبونات المُرسلة</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:left;font-weight:bold;color:#059669">{sent}</td></tr>
      <tr><td style="padding:10px;border-bottom:1px solid #eee">📧 إيميلات ناجحة</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:left;font-weight:bold;color:#2563eb">{emails_sent}</td></tr>
      <tr><td style="padding:10px">💰 نسبة الخصم المُطبَّقة</td><td style="padding:10px;text-align:left;font-weight:bold;color:#d97706">{discount}%</td></tr>
    </table>
    <div style="background:#faf5ff;border-right:4px solid #7c3aed;padding:12px;border-radius:6px;font-size:13px;color:#444">
      معرّف الحملة: <code style="background:#ede9fe;padding:2px 6px;border-radius:4px">{campaign_id[:8]}</code><br>
      راقب معدل استخدام هذه الكوبونات في لوحة الحملات (📈) خلال الأسبوع القادم.
    </div>
    <div style="text-align:center;margin-top:24px">
      <a href="{APP_URL}/app/super-admin?tab=user_subs" style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%);color:white;padding:12px 28px;text-decoration:none;border-radius:25px;font-weight:bold">عرض لوحة الحملات</a>
    </div>
  </div>
  <div style="background:#f8f9fa;padding:14px;text-align:center;color:#666;font-size:12px">HomeMe — نظام التجديد التلقائي</div>
</div></body></html>"""
            text = f"تقرير التجديد التلقائي الشهري\n\nالمستهدفون: {len(user_ids)}\nالمُرسل: {sent}\nإيميلات ناجحة: {emails_sent}\nالخصم: {discount}%\nمعرّف الحملة: {campaign_id}\n\n{APP_URL}/app/super-admin?tab=user_subs"
            for o in owners:
                try:
                    await email_service.send_email(o["email"], subject, html, text)
                except Exception as e:
                    logging.error(f"Owner summary email error for {o.get('email')}: {e}")
    except Exception as e:
        logging.error(f"Owner summary dispatch error: {e}")

    return {"sent": sent, "emails_sent": emails_sent, "targets": len(user_ids), "campaign_id": campaign_id}
