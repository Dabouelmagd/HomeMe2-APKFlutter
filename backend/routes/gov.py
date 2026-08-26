"""
Government / Municipal Dashboard Routes
حي / مركز / محافظة
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from typing import Optional
import uuid

from auth_deps import get_current_user
from database import get_db

router = APIRouter(prefix="/api/gov", tags=["gov"])

GOV_TYPE_LABELS = {
    "district": "حي / منطقة",
    "markaz":   "مركز / قضاء",
    "city":     "محافظة / مدينة",
}

@router.get("/stats")
async def gov_stats(current_user: dict = Depends(get_current_user)):
    db = get_db()
    gov_id = current_user.get("compound_id") or current_user.get("gov_id", "")

    zones = await db.gov_zones.find({"parent_gov_id": gov_id}, {"_id": 0}).to_list(500)
    all_compound_ids = []
    for z in zones:
        cids = z.get("compound_ids", [])
        all_compound_ids.extend(cids)

    total_units     = await db.units.count_documents({"compound_id": {"$in": all_compound_ids}}) if all_compound_ids else 0
    total_residents = await db.users.count_documents({"compound_id": {"$in": all_compound_ids}, "role": "resident"}) if all_compound_ids else 0
    open_complaints = await db.complaints.count_documents({"compound_id": {"$in": all_compound_ids}, "status": "open"}) if all_compound_ids else 0
    open_maintenance = await db.maintenance_requests.count_documents({"compound_id": {"$in": all_compound_ids}, "status": {"$in": ["pending","in_progress"]}}) if all_compound_ids else 0
    staff_count = await db.users.count_documents({"gov_id": gov_id, "role": {"$in": ["gov_admin","district_admin","markaz_admin"]}})

    gov = await db.gov_entities.find_one({"id": gov_id}, {"_id": 0}) or {}

    return {
        "gov_name": gov.get("name", "الجهة الحكومية"),
        "gov_type_label": GOV_TYPE_LABELS.get(gov.get("type", ""), "إدارة"),
        "governorate": gov.get("governorate", ""),
        "total_zones": len(zones),
        "districts_count": sum(1 for z in zones if z.get("type") == "district"),
        "compounds_count": len(all_compound_ids),
        "total_units": total_units,
        "total_residents": total_residents,
        "open_complaints": open_complaints,
        "open_maintenance": open_maintenance,
        "staff_count": staff_count,
        "monthly_revenue": 0,
        "yearly_revenue": 0,
        "revenue_growth": 0,
        "pending_collection": 0,
        "satisfaction": 0,
    }


@router.get("/zones")
async def get_zones(current_user: dict = Depends(get_current_user)):
    db = get_db()
    gov_id = current_user.get("compound_id") or current_user.get("gov_id", "")
    zones = await db.gov_zones.find({"parent_gov_id": gov_id}, {"_id": 0}).to_list(200)

    for z in zones:
        cids = z.get("compound_ids", [])
        if cids:
            z["compounds_count"] = len(cids)
            z["units_count"]     = await db.units.count_documents({"compound_id": {"$in": cids}})
            z["residents_count"] = await db.users.count_documents({"compound_id": {"$in": cids}, "role": "resident"})
            z["open_complaints"] = await db.complaints.count_documents({"compound_id": {"$in": cids}, "status": "open"})
            z["pending_maintenance"] = await db.maintenance_requests.count_documents({"compound_id": {"$in": cids}, "status": {"$in": ["pending","in_progress"]}})
        else:
            z["compounds_count"] = z["units_count"] = z["residents_count"] = z["open_complaints"] = z["pending_maintenance"] = 0
        z["type_label"] = GOV_TYPE_LABELS.get(z.get("type",""), "وحدة")

    return {"zones": zones}


@router.post("/zones")
async def create_zone(body: dict, current_user: dict = Depends(get_current_user)):
    db = get_db()
    gov_id = current_user.get("compound_id") or current_user.get("gov_id", "")
    zone = {
        "id": str(uuid.uuid4()),
        "parent_gov_id": gov_id,
        "name": body.get("name","").strip(),
        "type": body.get("type", "district"),
        "governorate": body.get("governorate",""),
        "address": body.get("address",""),
        "phone": body.get("phone",""),
        "manager_name": body.get("manager_name",""),
        "compound_ids": [],
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if not zone["name"]:
        raise HTTPException(400, "الاسم مطلوب")
    await db.gov_zones.insert_one(zone)
    zone.pop("_id", None)
    return {"success": True, "zone": zone}


@router.get("/alerts")
async def get_alerts(current_user: dict = Depends(get_current_user)):
    db = get_db()
    gov_id = current_user.get("compound_id") or current_user.get("gov_id", "")
    zones = await db.gov_zones.find({"parent_gov_id": gov_id}, {"compound_ids": 1}).to_list(200)
    all_cids = [c for z in zones for c in z.get("compound_ids", [])]

    alerts = []
    if all_cids:
        open_c = await db.complaints.count_documents({"compound_id": {"$in": all_cids}, "status": "open"})
        if open_c > 0:
            alerts.append({"type": "complaints", "message": f"{open_c} شكوى مفتوحة تحتاج رد"})
        pending_m = await db.maintenance_requests.count_documents({"compound_id": {"$in": all_cids}, "status": "pending"})
        if pending_m > 0:
            alerts.append({"type": "maintenance", "message": f"{pending_m} طلب صيانة معلق"})

    return {"alerts": alerts}


# ── Financial: Revenue & Expenses per Gov Entity ─────────────────────
@router.get("/financial/summary")
async def gov_financial_summary(
    period: str = "month",  # month | quarter | year
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    gov_id = current_user.get("compound_id") or current_user.get("gov_id", "")
    zones  = await db.gov_zones.find({"parent_gov_id": gov_id}, {"compound_ids": 1}).to_list(200)
    all_cids = [c for z in zones for c in z.get("compound_ids", [])]

    from datetime import timedelta
    now = datetime.now(timezone.utc)
    if period == "month":
        since = (now - timedelta(days=30)).isoformat()
    elif period == "quarter":
        since = (now - timedelta(days=90)).isoformat()
    else:
        since = (now - timedelta(days=365)).isoformat()

    q = {"compound_id": {"$in": all_cids}, "created_at": {"$gte": since}} if all_cids else {"_id": "none"}

    # Revenue from payments
    payments = await db.payments.find({**q, "status": "confirmed"}, {"_id": 0, "amount": 1}).to_list(2000)
    total_revenue = sum(p.get("amount", 0) for p in payments)

    # Expenses
    expenses = await db.expenses.find(q, {"_id": 0, "amount": 1}).to_list(2000)
    total_expenses = sum(e.get("amount", 0) for e in expenses)

    # Subscriptions MRR
    subs = await db.compound_subscriptions.find(
        {"compound_id": {"$in": all_cids}, "status": "active"} if all_cids else {"_id": "none"},
        {"monthly_amount": 1}
    ).to_list(500)
    mrr = sum(s.get("monthly_amount", 0) for s in subs)

    # Pending payments
    pending = await db.payments.find(
        {**q, "status": "pending"}, {"_id": 0, "amount": 1}
    ).to_list(500)
    pending_amount = sum(p.get("amount", 0) for p in pending)

    # Per-zone breakdown
    zone_breakdown = []
    for z in zones:
        cids = z.get("compound_ids", [])
        if not cids:
            continue
        zq = {"compound_id": {"$in": cids}, "created_at": {"$gte": since}, "status": "confirmed"}
        z_payments = await db.payments.find(zq, {"amount": 1}).to_list(200)
        zone_breakdown.append({
            "zone_id": str(z.get("_id", "")),
            "name": z.get("name", ""),
            "type": z.get("type", ""),
            "revenue": sum(p.get("amount", 0) for p in z_payments),
        })

    return {
        "period": period,
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "net": total_revenue - total_expenses,
        "mrr": mrr,
        "arr_estimate": mrr * 12,
        "pending_collection": pending_amount,
        "zone_breakdown": sorted(zone_breakdown, key=lambda x: -x["revenue"]),
    }


@router.get("/subscriptions")
async def gov_subscriptions(current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    gov_id = current_user.get("compound_id") or current_user.get("gov_id", "")
    zones  = await db.gov_zones.find({"parent_gov_id": gov_id}, {"compound_ids": 1, "name": 1}).to_list(200)
    all_cids = [c for z in zones for c in z.get("compound_ids", [])]

    subs = await db.compound_subscriptions.find(
        {"compound_id": {"$in": all_cids}} if all_cids else {"_id": "none"},
        {"_id": 0}
    ).to_list(500)

    active  = [s for s in subs if s.get("status") == "active"]
    trial   = [s for s in subs if s.get("status") == "trial"]
    expired = [s for s in subs if s.get("status") == "expired"]

    return {
        "total": len(subs),
        "active": len(active),
        "trial": len(trial),
        "expired": len(expired),
        "mrr": sum(s.get("monthly_amount", 0) for s in active),
        "subscriptions": subs,
    }


# ── Staff per Zone: Admin, Accountant, Security, Clerk ───────────────
@router.get("/zones/{zone_id}/staff")
async def get_zone_staff(zone_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    staff = await db.gov_staff.find({"zone_id": zone_id}, {"_id": 0, "password_hash": 0}).to_list(100)
    return {"staff": staff}


@router.post("/zones/{zone_id}/staff")
async def add_zone_staff(zone_id: str, body: dict, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    import secrets, hashlib

    zone = await db.gov_zones.find_one({"id": zone_id})
    if not zone:
        raise HTTPException(404, "الوحدة الإدارية غير موجودة")

    email    = body.get("email", "").strip()
    name     = body.get("full_name", "").strip()
    role     = body.get("staff_role", "clerk")   # manager | accountant | security | clerk | admin
    phone    = body.get("phone", "").strip()
    username = body.get("username", email.split("@")[0] if "@" in email else email).strip()

    ROLE_LABELS = {
        "manager":    "مدير الوحدة",
        "accountant": "محاسب",
        "admin":      "إداري",
        "security":   "أمن",
        "clerk":      "موظف",
    }

    temp_password = secrets.token_urlsafe(8)
    hashed = hashlib.sha256(temp_password.encode()).hexdigest()

    staff_doc = {
        "id": str(uuid.uuid4()),
        "zone_id": zone_id,
        "zone_name": zone.get("name", ""),
        "gov_id": zone.get("parent_gov_id", ""),
        "full_name": name,
        "username": username,
        "email": email,
        "phone": phone,
        "staff_role": role,
        "role_label": ROLE_LABELS.get(role, role),
        "password_hash": hashed,
        "temp_password": temp_password,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.gov_staff.insert_one(staff_doc)

    # Send welcome email
    try:
        from email_service import email_service
        html = (
            f'<div dir="rtl" style="font-family:Tahoma,Arial;max-width:600px;margin:auto;">'
            f'<div style="background:linear-gradient(135deg,#1d4ed8,#4f46e5);padding:24px;border-radius:12px 12px 0 0;text-align:center;">'
            f'<h2 style="color:#fff;margin:0;">مرحباً في {zone.get("name","الوحدة الإدارية")}</h2>'
            f'<p style="color:rgba(255,255,255,0.8);">تم إضافتك كـ {ROLE_LABELS.get(role, role)}</p></div>'
            f'<div style="background:#fff;padding:24px;border:1px solid #e2e8f0;">'
            f'<p>مرحباً <strong>{name}</strong>،</p>'
            f'<p>تم تعيينك في نظام HomeMe لإدارة <strong>{zone.get("name","")}</strong>.</p>'
            f'<table width="100%" cellpadding="10" style="background:#f8fafc;border-radius:8px;margin:16px 0;">'
            f'<tr><td><strong>رابط الدخول:</strong></td><td><a href="https://homemeapp.net/login">homemeapp.net/login</a></td></tr>'
            f'<tr><td><strong>اسم المستخدم:</strong></td><td><strong>{username}</strong></td></tr>'
            f'<tr><td><strong>كلمة المرور:</strong></td><td><strong>{temp_password}</strong></td></tr>'
            f'<tr><td><strong>الدور:</strong></td><td>{ROLE_LABELS.get(role, role)}</td></tr>'
            f'</table>'
            f'<p style="color:#dc2626;font-size:13px;">⚠️ يُرجى تغيير كلمة المرور بعد أول تسجيل دخول.</p>'
            f'</div><div style="background:#f8fafc;padding:14px;text-align:center;font-size:12px;color:#94a3b8;border-radius:0 0 12px 12px;">HomeMe | homemeapp.net</div></div>'
        )
        await email_service.send_email(
            to_email=email, to_name=name,
            subject=f"مرحباً بك في {zone.get('name','')} — بيانات الدخول",
            html_content=html,
        )
    except Exception as e:
        pass  # Don't fail if email fails

    staff_doc.pop("_id", None)
    staff_doc.pop("password_hash", None)
    return {"success": True, "staff": staff_doc, "temp_password": temp_password}


@router.delete("/zones/{zone_id}/staff/{staff_id}")
async def remove_zone_staff(zone_id: str, staff_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    await db.gov_staff.delete_one({"id": staff_id, "zone_id": zone_id})
    return {"success": True}


# ── Invitations: Email + Code ─────────────────────────────────────────
@router.post("/zones/{zone_id}/invite")
async def invite_to_zone(zone_id: str, body: dict, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    import secrets as _secrets

    zone = await db.gov_zones.find_one({"id": zone_id})
    if not zone:
        raise HTTPException(404, "الوحدة الإدارية غير موجودة")

    method = body.get("method", "code")  # email | code | both
    email  = body.get("email", "")
    role   = body.get("role", "resident")
    name   = body.get("name", "")
    code   = "GOV-" + _secrets.token_urlsafe(5).upper()[:6]
    expires_at = (datetime.now(timezone.utc).replace(
        microsecond=0) + __import__('datetime').timedelta(days=30)).isoformat()

    invite_doc = {
        "id": str(uuid.uuid4()),
        "code": code,
        "zone_id": zone_id,
        "zone_name": zone.get("name", ""),
        "gov_id": zone.get("parent_gov_id", ""),
        "email": email,
        "role": role,
        "invited_by": current_user.get("id"),
        "status": "pending",
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.gov_invites.insert_one(invite_doc)

    if method in ("email", "both") and "@" in email:
        try:
            from email_service import email_service
            reg_link = f"https://homemeapp.net/register?gov_invite={code}"
            html = (
                f'<div dir="rtl" style="font-family:Tahoma;max-width:600px;margin:auto;">'
                f'<div style="background:linear-gradient(135deg,#1d4ed8,#4f46e5);padding:24px;border-radius:12px 12px 0 0;text-align:center;">'
                f'<h2 style="color:#fff;">دعوة للانضمام إلى {zone.get("name","")}</h2></div>'
                f'<div style="background:#fff;padding:24px;border:1px solid #e2e8f0;">'
                f'{"<p>مرحباً " + name + "،</p>" if name else ""}'
                f'<p>تمت دعوتك للانضمام إلى نظام إدارة <strong>{zone.get("name","")}</strong>.</p>'
                f'<p style="text-align:center;"><a href="{reg_link}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">انضم الآن</a></p>'
                f'<p style="text-align:center;font-size:12px;color:#64748b;">أو استخدم كود الدعوة: <strong style="font-size:18px;color:#1d4ed8;">{code}</strong></p>'
                f'<p style="font-size:11px;color:#94a3b8;text-align:center;">صالح حتى {expires_at[:10]}</p>'
                f'</div></div>'
            )
            await email_service.send_email(
                to_email=email, to_name=name or email,
                subject=f"دعوة للانضمام إلى {zone.get('name','')}",
                html_content=html,
            )
        except Exception:
            pass

    invite_doc.pop("_id", None)
    return {"success": True, "code": code, "invite": invite_doc, "reg_link": f"https://homemeapp.net/register?gov_invite={code}"}


@router.get("/zones/{zone_id}/invites")
async def get_zone_invites(zone_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    invites = await db.gov_invites.find({"zone_id": zone_id}, {"_id": 0}).to_list(100)
    return {"invites": invites}
