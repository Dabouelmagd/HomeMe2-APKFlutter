"""
Super Admin Panel & Role Management routes
"""
from fastapi import APIRouter, HTTPException, Depends
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
        companies = await db.management_companies.find({}, {"_id": 0}).to_list(200)
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

        # 4) Group compounds by company (or _independent)
        companies_nodes = []
        unassigned_compounds = []
        company_by_id = {c.get("id"): c for c in companies}
        compound_by_company = {}
        for c in compounds:
            company_id = c.get("company_id") or c.get("management_company_id")
            if company_id and company_id in company_by_id:
                compound_by_company.setdefault(company_id, []).append(c)
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
    """إرسال كود خصم تجديد جماعي لجميع المستخدمين الذين تنتهي اشتراكاتهم قريبًا."""
    db = get_db()
    days_before = int(payload.get("days_before_expiry", 7))
    discount = max(1, min(90, int(payload.get("discount", 20))))
    message = payload.get("message", "")
    user_ids = payload.get("user_ids") or []

    # إن لم تُرسل قائمة، استعلم تلقائيًا
    if not user_ids:
        preview = await preview_bulk_renewal(days_before, current_user)
        user_ids = [t["user_id"] for t in preview.get("targets", [])]

    sent, emails_sent, failed = 0, 0, 0
    for uid in user_ids:
        try:
            user = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
            if not user:
                failed += 1
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
                "notes": f"عرض تجديد جماعي - {message}",
                "campaign": "bulk_renewal",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": uid,
                "title": f"🎯 خصم {discount}% على تجديد اشتراكك",
                "body": message or f"استخدم الكود {code} للحصول على خصم {discount}% عند التجديد.",
                "type": "bulk_offer",
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            sent += 1
            if user.get("email"):
                try:
                    from email_service import email_service
                    subject, html, text = _build_gift_email(
                        user.get("full_name") or user.get("username") or "",
                        "discount_coupon",
                        {"discount": discount},
                        message,
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

    # سجل الحملة
    await db.bulk_campaigns.insert_one({
        "id": str(uuid.uuid4()),
        "type": "bulk_renewal",
        "discount": discount,
        "days_before_expiry": days_before,
        "message": message,
        "sent": sent,
        "emails_sent": emails_sent,
        "failed": failed,
        "sent_by": current_user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"success": True, "sent": sent, "emails_sent": emails_sent, "failed": failed, "discount": discount}


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
