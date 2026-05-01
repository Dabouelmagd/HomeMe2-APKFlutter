"""
Company Subscriptions Management for App Owner
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import logging

from database import get_db
from auth_deps import get_current_user
from helpers import serialize_datetime

router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Plans Catalogue — single source of truth for company subscription plans.
# Mirrors the pricing landing page (frontend/src/config/plans.js). Each plan
# exposes `features` — a list of human-readable permission strings we surface
# to the subscriber so they can see exactly what their tier unlocks.
#
# `feature_flags` are machine-readable booleans used by `plan_limits.has_feature`
# and feature-gated endpoints (e.g. PDF reports, AI insights, ad campaigns).
# ---------------------------------------------------------------------------
COMPANY_PLANS_CATALOGUE = [
    {
        "key": "starter",
        "name_ar": "مجاني",
        "name_en": "Free",
        "monthly_egp": 0,
        "max_compounds": 1,
        "max_residents": 50,
        "feature_flags": {
            "billing_payments": False,
            "ads_campaigns": False,
            "pdf_excel_exports": False,
            "ai_financial_insights": False,
            "advanced_dashboard": False,
            "custom_api": False,
            "whitelabel": False,
            "priority_support": False,
        },
        "features_ar": [
            "مجمع واحد فقط",
            "حتى 50 ساكن",
            "إدارة الطلبات الأساسية",
            "إشعارات بسيطة",
            "دعم فني عبر البريد خلال 48 ساعة",
        ],
        "features_en": [
            "Single compound",
            "Up to 50 residents",
            "Basic requests management",
            "Simple notifications",
            "Email support (48h)",
        ],
    },
    {
        "key": "company_startup",
        "name_ar": "شركة ناشئة",
        "name_en": "Startup",
        "monthly_egp": 3500,
        "max_compounds": 3,
        "max_residents": 500,
        "feature_flags": {
            "billing_payments": True,
            "ads_campaigns": True,
            "pdf_excel_exports": False,
            "ai_financial_insights": False,
            "advanced_dashboard": False,
            "custom_api": False,
            "whitelabel": False,
            "priority_support": False,
        },
        "features_ar": [
            "حتى 3 مجتمعات سكنية",
            "عدد مستخدمين غير محدود",
            "إدارة كاملة للطلبات والحوادث",
            "نظام الفواتير والمدفوعات",
            "تقارير أساسية",
            "إعلانات داخلية",
            "دعم فني خلال 24 ساعة",
        ],
        "features_en": [
            "Up to 3 compounds",
            "Unlimited users",
            "Full requests & incidents management",
            "Billing & payments",
            "Basic analytics",
            "Internal ads",
            "24h support",
        ],
    },
    {
        "key": "company_business",
        "name_ar": "شركة متوسطة",
        "name_en": "Business",
        "monthly_egp": 7500,
        "max_compounds": 5,
        "max_residents": 2000,
        "popular": True,
        "feature_flags": {
            "billing_payments": True,
            "ads_campaigns": True,
            "pdf_excel_exports": True,
            "ai_financial_insights": True,
            "advanced_dashboard": True,
            "custom_api": True,
            "whitelabel": False,
            "priority_support": True,
        },
        "features_ar": [
            "1 - 5 مجتمعات سكنية",
            "جميع مزايا الباقة الناشئة",
            "لوحة تحكم متقدمة",
            "تحليلات مالية ذكية (AI)",
            "حملات إعلانية مخصصة",
            "إدارة عدة شركات من حساب واحد",
            "تقارير PDF/Excel قابلة للتصدير",
            "إشعارات فورية عبر Push",
            "دعم فني خلال 12 ساعة",
            "API مخصص للتكامل",
        ],
        "features_en": [
            "1-5 compounds",
            "Everything in Startup",
            "Advanced dashboard",
            "AI-powered financial insights",
            "Custom ad campaigns",
            "Multi-company from one account",
            "PDF/Excel exports",
            "Push notifications",
            "12h support",
            "Custom API",
        ],
    },
    {
        "key": "company_enterprise",
        "name_ar": "شركة كبرى",
        "name_en": "Enterprise",
        "monthly_egp": 20000,
        "max_compounds": -1,
        "max_residents": -1,
        "feature_flags": {
            "billing_payments": True,
            "ads_campaigns": True,
            "pdf_excel_exports": True,
            "ai_financial_insights": True,
            "advanced_dashboard": True,
            "custom_api": True,
            "whitelabel": True,
            "priority_support": True,
        },
        "features_ar": [
            "عدد مجتمعات غير محدود",
            "عدد سكان غير محدود",
            "جميع مزايا باقة Business",
            "حساب مدير حسابات مخصص",
            "أولوية في التطوير (طلبات مخصصة)",
            "SLA موثّق 99.9% Uptime",
            "Training مجاني لفريقك",
            "تقارير مخصصة حسب الطلب",
            "Whitelabel (لوحة باسمك)",
            "دعم فوري 24/7",
        ],
        "features_en": [
            "Unlimited compounds",
            "Unlimited residents",
            "Everything in Business",
            "Dedicated account manager",
            "Priority feature development",
            "Documented 99.9% SLA",
            "Free team training",
            "Custom reports",
            "Whitelabel",
            "24/7 support",
        ],
    },
]


@router.get("/owner/company-plans")
async def get_company_plans(current_user: dict = Depends(get_current_user)):
    """Return the catalogue of company plans (public to authenticated users)."""
    return {"plans": COMPANY_PLANS_CATALOGUE}


async def _log_sub_change(db, company_id, user, action, description, details=None):
    """Log subscription changes for audit trail"""
    company = await db.companies.find_one({"id": company_id}, {"_id": 0, "name": 1})
    log = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "company_name": company.get("name", "") if company else "",
        "action": action,
        "description": description,
        "details": details or {},
        "performed_by": user.get("id", ""),
        "performed_by_name": user.get("full_name", user.get("username", "")),
        "performed_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.subscription_changelog.insert_one(log)


@router.get("/owner/subscription-changelog")
async def get_subscription_changelog(
    company_id: str = "",
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get subscription change log - visible to owner and compound admins"""
    db = get_db()
    query = {}

    role = current_user.get("role", "")
    if role in ["app_owner", "super_admin"]:
        if company_id:
            query["company_id"] = company_id
    else:
        # Compound admins can only see their own company changes
        user_compound = current_user.get("compound_id", "")
        if user_compound:
            cc = await db.compound_companies.find_one({"compound_id": user_compound}, {"_id": 0, "company_id": 1})
            if cc:
                query["company_id"] = cc["company_id"]
            else:
                return {"logs": []}
        else:
            return {"logs": []}

    logs = await db.subscription_changelog.find(query, {"_id": 0}).sort("performed_at", -1).to_list(limit)
    return {"logs": logs}


@router.get("/owner/company-subscriptions")
async def get_company_subscriptions(
    search: str = "",
    status_filter: str = "all",
    page: int = 1,
    per_page: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get all company subscriptions for app owner"""
    if current_user.get("role") not in ["app_owner", "super_admin"]:
        raise HTTPException(403, "App Owner access required")

    db = get_db()

    # Get all companies
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"company_code": {"$regex": search, "$options": "i"}},
            {"contact_email": {"$regex": search, "$options": "i"}},
        ]

    companies = await db.companies.find(query, {"_id": 0}).to_list(length=10000)

    # Enrich with subscription and compound data
    results = []
    total_revenue = 0
    active_count = 0
    expired_count = 0

    for company in companies:
        cid = company.get("id", "")

        # Get subscription
        sub = await db.company_subscriptions.find_one(
            {"company_id": cid}, {"_id": 0}
        )

        # Get compounds
        compounds = await db.compound_companies.find(
            {"company_id": cid, "status": "active"}, {"_id": 0}
        ).to_list(length=10000)

        # Count residents across all compounds
        compound_ids = [c.get("id", c.get("compound_id", "")) for c in compounds]
        total_residents = 0
        total_families = 0
        if compound_ids:
            total_residents = await db.users.count_documents({
                "compound_id": {"$in": compound_ids},
                "role": "resident",
                "is_active": True
            })
            total_families = await db.families.count_documents({
                "compound_id": {"$in": compound_ids}
            })

        # Determine status
        is_active = True
        if sub:
            if sub.get("status") == "cancelled":
                is_active = False
            else:
                end_date = sub.get("current_period_end")
                if end_date:
                    if isinstance(end_date, str):
                        try:
                            end_date = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                        except Exception:
                            end_date = None
                    if isinstance(end_date, datetime):
                        if end_date.tzinfo is None:
                            end_date = end_date.replace(tzinfo=timezone.utc)
                        is_active = end_date > datetime.now(timezone.utc)

        if is_active:
            active_count += 1
        else:
            expired_count += 1

        plan_price = sub.get("plan_price", 0) if sub else 0
        total_revenue += plan_price

        # Attach plan catalogue metadata (features, limits) for this company
        plan_key = sub.get("plan", "starter") if sub else "starter"
        plan_meta = next((p for p in COMPANY_PLANS_CATALOGUE if p["key"] == plan_key), None)

        entry = {
            "id": cid,
            "name": company.get("name", ""),
            "company_code": company.get("company_code", ""),
            "contact_email": company.get("contact_email", ""),
            "contact_phone": company.get("contact_phone", ""),
            "created_at": company.get("created_at"),
            "plan": plan_key,
            "plan_price": plan_price,
            "plan_meta": plan_meta,  # full catalogue entry with features
            "subscription_start": sub.get("current_period_start") if sub else None,
            "subscription_end": sub.get("current_period_end") if sub else None,
            "is_active": is_active,
            "total_compounds": len(compounds),
            "total_residents": total_residents,
            "total_families": total_families,
            "compounds": [{"id": c.get("id", c.get("compound_id", "")), "name": c.get("name", "")} for c in compounds],
            "applied_coupon": sub.get("applied_coupon", "") if sub else "",
            "discount_desc": sub.get("discount_desc", "") if sub else "",
        }
        results.append(serialize_datetime(entry))

    # Filter by status
    if status_filter == "active":
        results = [r for r in results if r["is_active"]]
    elif status_filter == "expired":
        results = [r for r in results if not r["is_active"]]

    total = len(results)
    start = (page - 1) * per_page
    paginated = results[start:start + per_page]

    return {
        "companies": paginated,
        "total": total,
        "page": page,
        "per_page": per_page,
        "stats": {
            "total_companies": len(companies),
            "active": active_count,
            "expired": expired_count,
            "total_monthly_revenue": total_revenue,
        }
    }


@router.put("/owner/company-subscriptions/{company_id}")
async def update_company_subscription(
    company_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update company subscription (change plan, renew, suspend)"""
    if current_user.get("role") not in ["app_owner", "super_admin"]:
        raise HTTPException(403, "App Owner access required")

    db = get_db()
    action = body.get("action")

    if action == "change_plan":
        new_plan = body.get("plan")
        if not new_plan:
            raise HTTPException(400, "Plan is required")
        sub = await db.company_subscriptions.find_one({"company_id": company_id}, {"_id": 0})
        old_plan = sub.get("plan", "starter") if sub else "starter"
        await db.company_subscriptions.update_one(
            {"company_id": company_id},
            {"$set": {"plan": new_plan, "updated_at": datetime.now(timezone.utc)}}
        )
        await _log_sub_change(db, company_id, current_user, "change_plan", f"تغيير الخطة من {old_plan} إلى {new_plan}", {"old_plan": old_plan, "new_plan": new_plan})
        return {"status": "ok", "message": "Plan updated"}

    elif action == "renew":
        months = body.get("months", 12)
        await db.company_subscriptions.update_one(
            {"company_id": company_id},
            {"$set": {
                "current_period_end": datetime.now(timezone.utc) + timedelta(days=30 * months),
                "status": "active",
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        await _log_sub_change(db, company_id, current_user, "renew", f"تجديد {months} شهر", {"months": months})
        return {"status": "ok", "message": f"Renewed for {months} months"}

    elif action == "suspend":
        await db.company_subscriptions.update_one(
            {"company_id": company_id},
            {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc)}}
        )
        await _log_sub_change(db, company_id, current_user, "suspend", "إيقاف الاشتراك")
        return {"status": "ok", "message": "Subscription suspended"}

    elif action == "activate":
        await db.company_subscriptions.update_one(
            {"company_id": company_id},
            {"$set": {
                "status": "active",
                "current_period_end": datetime.now(timezone.utc) + timedelta(days=365),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        await _log_sub_change(db, company_id, current_user, "activate", "Subscription activated")
        return {"status": "ok", "message": "Subscription activated"}

    elif action == "apply_coupon":
        coupon_code = body.get("coupon_code", "").strip().upper()
        if not coupon_code:
            raise HTTPException(400, "Coupon code is required")
        coupon = await db.coupons.find_one({"code": coupon_code, "is_active": True}, {"_id": 0})
        if not coupon:
            raise HTTPException(404, "كوبون غير صالح أو غير نشط")
        if coupon.get("max_uses", 100) <= coupon.get("times_used", 0):
            raise HTTPException(400, "الكوبون وصل الحد الأقصى للاستخدام")

        sub = await db.company_subscriptions.find_one({"company_id": company_id}, {"_id": 0})
        discount_type = coupon.get("discount_type", "percentage")
        discount_value = coupon.get("discount_value", 0)
        old_price = sub.get("plan_price", 0) if sub else 0

        if discount_type == "percentage":
            new_price = max(0, old_price - (old_price * discount_value / 100))
            desc = f"خصم {discount_value}% بكوبون {coupon_code}"
        else:
            new_price = max(0, old_price - discount_value)
            desc = f"خصم {discount_value} بكوبون {coupon_code}"

        await db.company_subscriptions.update_one(
            {"company_id": company_id},
            {"$set": {
                "plan_price": new_price,
                "applied_coupon": coupon_code,
                "discount_desc": desc,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        await db.coupons.update_one({"code": coupon_code}, {"$inc": {"times_used": 1}})
        await _log_sub_change(db, company_id, current_user, "apply_coupon", desc, {"coupon": coupon_code, "old_price": old_price, "new_price": new_price})
        return {"status": "ok", "message": desc, "new_price": new_price}

    elif action == "update_price":
        new_price = body.get("price")
        if new_price is None or new_price < 0:
            raise HTTPException(400, "Invalid price")
        note = body.get("note", "")
        sub = await db.company_subscriptions.find_one({"company_id": company_id}, {"_id": 0})
        old_price = sub.get("plan_price", 0) if sub else 0
        await db.company_subscriptions.update_one(
            {"company_id": company_id},
            {"$set": {"plan_price": new_price, "updated_at": datetime.now(timezone.utc)}}
        )
        await _log_sub_change(db, company_id, current_user, "update_price", f"تعديل السعر من {old_price} إلى {new_price}" + (f" - {note}" if note else ""), {"old_price": old_price, "new_price": new_price})
        return {"status": "ok", "message": f"Price updated to {new_price}"}

    elif action == "extend":
        days = body.get("days", 30)
        if days <= 0:
            raise HTTPException(400, "Invalid days")
        note = body.get("note", "")
        sub = await db.company_subscriptions.find_one({"company_id": company_id}, {"_id": 0})
        end_raw = sub.get("current_period_end") if sub else None
        if isinstance(end_raw, str):
            try:
                end_date = datetime.fromisoformat(end_raw.replace("Z", "+00:00"))
            except Exception:
                end_date = datetime.now(timezone.utc)
        elif isinstance(end_raw, datetime):
            end_date = end_raw if end_raw.tzinfo else end_raw.replace(tzinfo=timezone.utc)
        else:
            end_date = datetime.now(timezone.utc)

        new_end = end_date + timedelta(days=days)
        await db.company_subscriptions.update_one(
            {"company_id": company_id},
            {"$set": {"current_period_end": new_end, "status": "active", "updated_at": datetime.now(timezone.utc)}}
        )
        await _log_sub_change(db, company_id, current_user, "extend", f"تمديد {days} يوم" + (f" - {note}" if note else ""), {"days": days})
        return {"status": "ok", "message": f"Extended by {days} days"}

    else:
        raise HTTPException(400, f"Unknown action: {action}")
