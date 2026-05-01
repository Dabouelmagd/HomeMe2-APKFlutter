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

# Helper imported from the extracted module — used by auto-renewal email flow below
from routes.superadmin_gifts import _build_gift_email  # noqa: E402

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

        # الأرقام المالية مقصورة على مالك التطبيق فقط
        is_owner = current_user.get("role") == "app_owner"
        stats = {
            "total_compounds": total_compounds,
            "total_users": total_users,
            "total_residents": total_residents,
            "total_admins": total_admins,
        }
        if is_owner:
            stats.update({
                "total_revenue": round(total_revenue, 2),
                "total_expenses": round(total_expenses, 2),
                "net_balance": round(total_revenue - total_expenses, 2),
            })

        return serialize_datetime({
            "stats": stats,
            "compounds": compound_stats,
            "recent_users": recent_users,
            "can_view_finance": is_owner,
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
    company_id = user_data.get("company_id")
    phone = user_data.get("phone", "")
    unit_number = user_data.get("unit_number", "")

    if not username or not email or not password or not full_name:
        raise HTTPException(status_code=400, detail="username, email, password, full_name مطلوبة")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب ألا تقل عن 6 أحرف")

    # When role is company_admin, company_id is MANDATORY and must reference an existing company
    if role == "company_admin":
        if not company_id:
            raise HTTPException(status_code=400, detail="company_id مطلوب عند إنشاء مدير شركة. اختر الشركة التي سيديرها.")
        company = await db.companies.find_one({"id": company_id})
        if not company:
            raise HTTPException(status_code=400, detail="الشركة المحددة غير موجودة")

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
        "company_id": company_id if role == "company_admin" else user_data.get("company_id"),
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
    # Back-link admin_user_id on the target company so SuperAdmin UI can list the pair
    if role == "company_admin" and company_id:
        await db.companies.update_one(
            {"id": company_id, "$or": [{"admin_user_id": None}, {"admin_user_id": {"$exists": False}}]},
            {"$set": {"admin_user_id": user_doc["id"], "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    user_doc.pop("_id", None)
    user_doc.pop("password_hash", None)
    return {"success": True, "user": serialize_datetime(user_doc)}


@router.post("/super-admin/users/bulk")
async def super_admin_bulk_create_users(payload: dict, current_user: dict = Depends(require_super_admin)):
    """إنشاء متعدد للمستخدمين (CSV / Paste list).

    payload = {
        compound_id: str,
        role: str,                 # default role for all rows
        rows: [ { full_name, username, email, password, phone?, unit_number? }, ... ]
    }
    Returns: { created: [...], failed: [ {row_index, row, error} ] }
    """
    db = get_db()
    compound_id = payload.get("compound_id")
    default_role = payload.get("role") or "resident"
    rows = payload.get("rows") or []

    if not isinstance(rows, list) or len(rows) == 0:
        raise HTTPException(status_code=400, detail="لا توجد صفوف لإنشائها")
    if len(rows) > 500:
        raise HTTPException(status_code=400, detail="الحد الأقصى 500 صف في الدفعة الواحدة")

    valid_roles = ["super_admin", "company_admin", "admin", "manager", "security", "resident", "family_head", "family_member", "app_owner"]
    if default_role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"دور غير صالح: {valid_roles}")

    if compound_id:
        compound = await db.compounds.find_one({"id": compound_id})
        if not compound:
            raise HTTPException(status_code=400, detail="المجمع غير موجود")

    created = []
    failed = []

    # Pre-load existing usernames/emails to fail fast on duplicates (batch-scope)
    all_usernames = [((r.get("username") or "").strip()) for r in rows]
    all_emails = [((r.get("email") or "").strip().lower()) for r in rows]
    existing = await db.users.find(
        {"$or": [{"username": {"$in": [u for u in all_usernames if u]}},
                 {"email": {"$in": [e for e in all_emails if e]}}]},
        {"_id": 0, "username": 1, "email": 1},
    ).to_list(1000)
    taken_usernames = {u.get("username") for u in existing}
    taken_emails = {(u.get("email") or "").lower() for u in existing}

    batch_usernames = set()
    batch_emails = set()

    for idx, row in enumerate(rows):
        try:
            username = (row.get("username") or "").strip()
            email = (row.get("email") or "").strip()
            password = row.get("password") or ""
            full_name = (row.get("full_name") or "").strip()
            role = row.get("role") or default_role
            phone = row.get("phone", "") or ""
            unit_number = row.get("unit_number", "") or ""

            if not username or not email or not password or not full_name:
                raise ValueError("الحقول المطلوبة: full_name, username, email, password")
            if len(password) < 6:
                raise ValueError("كلمة المرور يجب ألا تقل عن 6 أحرف")
            if role not in valid_roles:
                raise ValueError(f"دور غير صالح: {role}")
            if username in taken_usernames or username in batch_usernames:
                raise ValueError("اسم المستخدم مستخدم بالفعل")
            if email.lower() in taken_emails or email.lower() in batch_emails:
                raise ValueError("البريد الإلكتروني مستخدم بالفعل")

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
            batch_usernames.add(username)
            batch_emails.add(email.lower())
            user_doc.pop("_id", None)
            user_doc.pop("password_hash", None)
            created.append(serialize_datetime(user_doc))
        except Exception as e:
            failed.append({"row_index": idx, "row": row, "error": str(e)})

    return {"success": True, "created_count": len(created), "failed_count": len(failed),
            "created": created, "failed": failed}


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
        
        # المبالغ المالية (الإيرادات والمدفوعات) مقصورة على مالك التطبيق فقط
        is_owner = current_user.get("role") == "app_owner"
        result = {
            "total_users": len(users),
            "active_subscriptions": len(active_subs),
            "free_users": len([u for u in users if not u.get("subscription_active")]),
            "by_plan": by_plan,
            "by_type": by_type,
            "expiring_soon": expiring_soon[:20],
            "trial_users": len([u for u in users if u.get("subscription_type") == "trial"]),
            "can_view_finance": is_owner,
        }
        if is_owner:
            result["monthly_revenue_estimate"] = revenue_estimate
            result["recent_payments"] = transactions
        return serialize_datetime(result)
    except Exception as e:
        logging.error(f"Subscription analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed")


# ==================== Management Companies CRUD (Super Admin) ====================

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



# -----------------------------------------------------------------------------
# Manual trigger: Subscription renewal reminders (7/3/0 days)
# -----------------------------------------------------------------------------
@router.post("/super-admin/trigger-renewals")
async def trigger_renewal_reminders(current_user: dict = Depends(require_super_admin)):
    """
    Run one pass of the renewal-reminder loop on demand.
    Useful for manual testing / re-sending missed milestones.
    """
    try:
        from renewal_reminders import run_renewal_reminders_once
        sent = await run_renewal_reminders_once()
        return {
            "status": "ok",
            "emails_dispatched": sent,
            "triggered_by": current_user.get("username"),
            "triggered_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        logging.error(f"trigger-renewals failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Renewal trigger failed: {str(e)}")

