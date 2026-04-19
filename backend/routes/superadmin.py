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
        new_end = datetime.now(timezone.utc) + timedelta(days=days)
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

    gift_record.pop("_id", None)
    return {"success": True, "gift": serialize_datetime(gift_record)}


@router.get("/super-admin/compounds/{compound_id}/full-details")
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

        # الإعلانات
        ads = await db.internal_ads.find({
            "$or": [{"target_compounds": compound_id}, {"target_compounds": []}, {"target_compounds": {"$exists": False}}]
        }, {"_id": 0}).to_list(100)

        # الحوادث الأمنية (إن وجدت)
        incidents_open = await db.security_incidents.count_documents({"compound_id": compound_id, "status": {"$ne": "resolved"}})

        # الاشتراك
        subscription = await db.subscriptions.find_one({"compound_id": compound_id}, {"_id": 0}) or \
                       await db.subscriptions.find_one({"user_id": {"$in": [u.get("id") for u in users if u.get("role") in ["company_admin", "manager", "app_owner"]]}}, {"_id": 0})

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
