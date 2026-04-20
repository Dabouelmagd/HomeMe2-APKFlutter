"""
Centralized Alerts Dashboard — aggregates urgent items across all sources.

Sources:
  - Management contracts expiring within N days
  - Companies with zero compounds ("empty companies")
  - Advertiser ads awaiting approval
  - User subscriptions expiring
  - Compound invites nearing capacity/expiry

Each alert: { id, type, severity, title, description, action:{label, href}, meta:{...}, created_at }
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api")


def _severity_for_days(days_left: int) -> str:
    if days_left < 0:
        return "critical"
    if days_left <= 3:
        return "critical"
    if days_left <= 7:
        return "high"
    if days_left <= 30:
        return "medium"
    return "low"


def _parse_dt(value):
    if not value:
        return None
    try:
        if isinstance(value, str):
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        else:
            dt = value
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


@router.get("/alerts/dashboard")
async def alerts_dashboard(current_user: dict = Depends(get_current_user)):
    """
    Returns grouped + flat alerts + summary.
    Owner/super_admin see everything; company_admin sees alerts scoped to their company.
    """
    role = current_user.get("role")
    if role not in ("app_owner", "super_admin", "company_admin"):
        return {"alerts": [], "summary": {"total": 0, "critical": 0, "high": 0, "medium": 0, "low": 0}, "by_type": {}}

    db = get_db()
    now = datetime.now(timezone.utc)
    scope_company_id = current_user.get("company_id") if role == "company_admin" else None

    alerts: List[Dict[str, Any]] = []

    # --- 1) Management contracts expiring ---
    q = {"status": {"$ne": "cancelled"}}
    if scope_company_id:
        q["company_id"] = scope_company_id
    contracts = await db.management_contracts.find(q, {"_id": 0}).to_list(length=1000)
    for c in contracts:
        end_dt = _parse_dt(c.get("end_date"))
        if not end_dt:
            continue
        days_left = (end_dt - now).days
        if days_left > 30:  # only surface contracts within next 30 days
            continue
        alerts.append({
            "id": f"contract_expiry_{c['id']}",
            "type": "contract_expiring",
            "severity": _severity_for_days(days_left),
            "title": "عقد إدارة ينتهي قريبًا" if days_left >= 0 else "عقد إدارة منتهٍ",
            "description": f"العقد بين {c.get('company_name','—')} و {c.get('compound_name','—')} " + (f"ينتهي خلال {days_left} يوم." if days_left >= 0 else f"انتهى منذ {abs(days_left)} يوم."),
            "action": {"label": "فتح العقد", "href": f"/app/super-admin?tab=companies&contract={c['id']}"},
            "meta": {"contract_id": c["id"], "company_id": c.get("company_id"), "compound_id": c.get("compound_id"), "days_left": days_left},
            "created_at": c.get("created_at"),
        })

    # --- 2) Empty companies (no compounds) ---
    if role in ("app_owner", "super_admin"):
        empty_cos = await db.companies.find(
            {"$or": [{"compound_ids": {"$size": 0}}, {"compound_ids": {"$exists": False}}]},
            {"_id": 0, "id": 1, "name": 1, "created_at": 1},
        ).to_list(length=200)
        for co in empty_cos:
            alerts.append({
                "id": f"empty_company_{co['id']}",
                "type": "empty_company",
                "severity": "medium",
                "title": "شركة بدون مجمعات",
                "description": f"الشركة \"{co.get('name','—')}\" لا تدير أي مجمع حاليًا.",
                "action": {"label": "إضافة مجمع", "href": f"/app/super-admin?tab=companies&company={co['id']}"},
                "meta": {"company_id": co["id"]},
                "created_at": co.get("created_at"),
            })

    # --- 3) Advertiser ads pending approval ---
    if role in ("app_owner", "super_admin"):
        pending_ads = await db.advertiser_ads.find(
            {"status": "pending_approval"}, {"_id": 0}
        ).sort("paid_at", 1).to_list(length=200)
        for ad in pending_ads:
            paid_dt = _parse_dt(ad.get("paid_at"))
            hours_waiting = int(((now - paid_dt).total_seconds() / 3600)) if paid_dt else 0
            severity = "high" if hours_waiting >= 48 else "medium" if hours_waiting >= 24 else "low"
            alerts.append({
                "id": f"pending_ad_{ad['id']}",
                "type": "pending_ad",
                "severity": severity,
                "title": "إعلان ينتظر الموافقة",
                "description": f"الإعلان \"{ad.get('title','—')}\" من {ad.get('advertiser_name','—')} ينتظر الموافقة" + (f" منذ {hours_waiting} ساعة." if hours_waiting else "."),
                "action": {"label": "مراجعة الإعلان", "href": "/app/super-admin?tab=advertiser_ads"},
                "meta": {"ad_id": ad["id"], "hours_waiting": hours_waiting, "amount": ad.get("amount_due")},
                "created_at": ad.get("paid_at") or ad.get("created_at"),
            })

    # --- 4) User subscriptions expiring ---
    sub_q = {"status": "active"}
    if scope_company_id:
        # scope by users belonging to this company's compounds
        company = await db.companies.find_one({"id": scope_company_id}, {"_id": 0, "compound_ids": 1})
        compound_ids = (company or {}).get("compound_ids", [])
        if compound_ids:
            users_in_scope = await db.users.find({"compound_id": {"$in": compound_ids}}, {"_id": 0, "id": 1}).to_list(length=5000)
            sub_q["user_id"] = {"$in": [u["id"] for u in users_in_scope]}
        else:
            sub_q["user_id"] = {"$in": []}  # empty → no results
    subs = await db.user_subscriptions.find(sub_q, {"_id": 0}).to_list(length=2000)
    for s in subs:
        end_dt = _parse_dt(s.get("end_date") or s.get("expires_at"))
        if not end_dt:
            continue
        days_left = (end_dt - now).days
        if days_left > 14 or days_left < -1:  # only within next 14 days (or just expired)
            continue
        alerts.append({
            "id": f"sub_expiry_{s.get('id','?')}",
            "type": "sub_expiring",
            "severity": _severity_for_days(days_left),
            "title": "اشتراك مستخدم ينتهي قريبًا" if days_left >= 0 else "اشتراك مستخدم منتهٍ",
            "description": f"اشتراك {s.get('plan_name') or s.get('plan') or 'مستخدم'} " + (f"ينتهي خلال {days_left} يوم." if days_left >= 0 else "انتهى اليوم."),
            "action": {"label": "فتح الاشتراكات", "href": "/app/super-admin?tab=user_subs"},
            "meta": {"subscription_id": s.get("id"), "user_id": s.get("user_id"), "days_left": days_left},
            "created_at": s.get("created_at"),
        })

    # --- 5) Compound invites nearing limit/expiry ---
    inv_q = {"is_active": True}
    if scope_company_id:
        inv_q["company_id"] = scope_company_id
    invites = await db.compound_invites.find(inv_q, {"_id": 0}).to_list(length=500)
    for inv in invites:
        exp_dt = _parse_dt(inv.get("expires_at"))
        days_left = (exp_dt - now).days if exp_dt else None
        used = int(inv.get("used_count") or 0)
        max_uses = inv.get("max_uses")
        near_cap = max_uses is not None and max_uses - used <= 1 and used < max_uses
        soon_expire = days_left is not None and 0 <= days_left <= 3
        if not (near_cap or soon_expire):
            continue
        reason = "قارب على الاستنفاد" if near_cap else f"ينتهي خلال {days_left} يوم"
        alerts.append({
            "id": f"invite_{inv['id']}",
            "type": "invite_alert",
            "severity": "high" if near_cap else _severity_for_days(days_left or 999),
            "title": "رابط دعوة يحتاج انتباه",
            "description": f"رابط مجمع \"{inv.get('compound_name','—')}\" {reason} (استُخدم {used}/{max_uses or '∞'}).",
            "action": {"label": "إدارة الدعوات", "href": f"/app/super-admin?tab=companies&compound={inv.get('compound_id')}"},
            "meta": {"invite_id": inv["id"], "compound_id": inv.get("compound_id"), "used": used, "max_uses": max_uses, "days_left": days_left},
            "created_at": inv.get("created_at"),
        })

    # Sort by severity then creation time
    sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    alerts.sort(key=lambda a: (sev_order.get(a["severity"], 9), a.get("created_at") or ""))

    # Summary
    summary = {"total": len(alerts),
               "critical": sum(1 for a in alerts if a["severity"] == "critical"),
               "high": sum(1 for a in alerts if a["severity"] == "high"),
               "medium": sum(1 for a in alerts if a["severity"] == "medium"),
               "low": sum(1 for a in alerts if a["severity"] == "low")}
    by_type: Dict[str, int] = {}
    for a in alerts:
        by_type[a["type"]] = by_type.get(a["type"], 0) + 1

    return {"alerts": alerts, "summary": summary, "by_type": by_type, "generated_at": now.isoformat()}
