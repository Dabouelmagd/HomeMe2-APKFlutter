"""
Company Admin Routes — endpoints for `company_admin` role to manage their own compounds & residents.

Each company_admin user has a `company_id` field linking them to exactly one management company.
They can:
  - GET their company info
  - GET/POST/PUT/DELETE compounds inside their company
  - GET/POST users (residents/managers/security) inside any compound under their company
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
import uuid
import bcrypt

from database import get_db
from auth_deps import get_current_user
from helpers import serialize_datetime

router = APIRouter(prefix="/api")


async def _require_company_admin(current_user: dict = Depends(get_current_user)):
    """Allow company_admin AND app_owner/super_admin (for impersonation/support)."""
    role = current_user.get("role")
    if role not in ("company_admin", "app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="هذه الخدمة متاحة لمديري الشركات فقط")
    return current_user


async def _resolve_company_id(current_user: dict, override_company_id: Optional[str] = None) -> str:
    """Return the company_id the user has access to.
    company_admin → their own company_id.
    app_owner/super_admin → either override_company_id (if provided) or raise 400 asking for it.
    """
    role = current_user.get("role")
    if role == "company_admin":
        cid = current_user.get("company_id")
        if not cid:
            raise HTTPException(status_code=400, detail="حسابك غير مرتبط بشركة. راجع المالك.")
        return cid
    # owner / super_admin
    if not override_company_id:
        raise HTTPException(status_code=400, detail="company_id query param مطلوب لهذا الحساب")
    return override_company_id


@router.get("/company-admin/me")
async def company_admin_me(current_user: dict = Depends(_require_company_admin), company_id: Optional[str] = None):
    """معلومات الشركة المرتبطة + ملخص سريع."""
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    company = await db.companies.find_one({"id": cid}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="الشركة غير موجودة")
    compound_ids = company.get("compound_ids") or []
    compounds_count = len(compound_ids)
    total_users = 0
    if compound_ids:
        total_users = await db.users.count_documents({"compound_id": {"$in": compound_ids}})
    return {
        "company": serialize_datetime(company),
        "stats": {
            "compounds_count": compounds_count,
            "total_users": total_users,
        }
    }


@router.get("/company-admin/compounds")
async def company_admin_list_compounds(current_user: dict = Depends(_require_company_admin), company_id: Optional[str] = None):
    """قائمة مجمعات الشركة مع عدد السكان لكل مجمع."""
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    compounds = await db.compounds.find({"company_id": cid}, {"_id": 0}).to_list(length=500)
    # Also include compounds registered via companies.compound_ids (legacy)
    company = await db.companies.find_one({"id": cid}, {"_id": 0, "compound_ids": 1})
    legacy_ids = [x for x in (company.get("compound_ids") or []) if x not in {c["id"] for c in compounds}]
    if legacy_ids:
        extras = await db.compounds.find({"id": {"$in": legacy_ids}}, {"_id": 0}).to_list(length=500)
        compounds.extend(extras)

    result = []
    for cpd in compounds:
        users_count = await db.users.count_documents({"compound_id": cpd["id"]})
        residents = await db.users.count_documents({"compound_id": cpd["id"], "role": "resident"})
        managers = await db.users.count_documents({"compound_id": cpd["id"], "role": {"$in": ["manager", "admin"]}})
        security = await db.users.count_documents({"compound_id": cpd["id"], "role": "security"})
        cpd["users_count"] = users_count
        cpd["residents"] = residents
        cpd["managers"] = managers
        cpd["security"] = security
        result.append(serialize_datetime(cpd))
    return {"compounds": result, "company_id": cid, "total": len(result)}


@router.get("/company-admin/plan-usage")
async def company_admin_plan_usage(current_user: dict = Depends(_require_company_admin), company_id: Optional[str] = None):
    """Return the company's current plan + usage vs limits for the Upgrade panel."""
    from plan_limits import get_company_plan_limits
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    plan = await get_company_plan_limits(cid)
    # Current usage
    current_compounds = await db.compounds.count_documents({
        "$or": [{"company_id": cid}, {"management_company_id": cid}]
    })
    compound_ids = await db.compounds.find(
        {"$or": [{"company_id": cid}, {"management_company_id": cid}]},
        {"_id": 0, "id": 1},
    ).to_list(length=2000)
    cids = [c["id"] for c in compound_ids]
    current_residents = await db.users.count_documents({
        "role": "resident", "compound_id": {"$in": cids}
    }) if cids else 0

    # Subscription expiry / status — used by the header badge to show days remaining
    sub = await db.company_subscriptions.find_one({"company_id": cid}, {"_id": 0}) or {}
    status = sub.get("status", "active" if plan["plan"] == "starter" else "pending_payment")
    expires_at = sub.get("expires_at")
    days_remaining = None
    if expires_at:
        try:
            exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            delta = exp_dt - datetime.now(timezone.utc)
            days_remaining = max(0, int(delta.total_seconds() // 86400))
        except Exception:
            days_remaining = None

    return {
        "company_id": cid,
        "plan": plan["plan"],
        "plan_name_ar": plan["plan_name_ar"],
        "max_compounds": plan["max_compounds"],
        "max_residents": plan["max_residents"],
        "feature_flags": plan.get("feature_flags", {}),
        "current_compounds": current_compounds,
        "current_residents": current_residents,
        "can_add_compound": plan["max_compounds"] == -1 or current_compounds < plan["max_compounds"],
        "can_add_resident": plan["max_residents"] == -1 or current_residents < plan["max_residents"],
        "status": status,
        "expires_at": expires_at,
        "days_remaining": days_remaining,
    }


@router.post("/company-admin/compounds")
async def company_admin_create_compound(payload: dict, current_user: dict = Depends(_require_company_admin), company_id: Optional[str] = None):
    """إنشاء مجمع جديد تحت شركة المدير."""
    from plan_limits import assert_can_add_compound
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="اسم المجمع مطلوب")
    # Plan-limit enforcement — raises 403 with structured detail if over limit
    await assert_can_add_compound(cid)
    compound_doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "location": payload.get("location") or "",
        "address": payload.get("address") or "",
        "description": payload.get("description") or "",
        "company_id": cid,
        "management_company_id": cid,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id"),
        "is_active": True,
    }
    await db.compounds.insert_one(compound_doc)
    await db.companies.update_one({"id": cid}, {"$addToSet": {"compound_ids": compound_doc["id"]}})
    compound_doc.pop("_id", None)
    return {"success": True, "compound": serialize_datetime(compound_doc)}


@router.put("/company-admin/compounds/{compound_id}")
async def company_admin_update_compound(compound_id: str, payload: dict, current_user: dict = Depends(_require_company_admin), company_id: Optional[str] = None):
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="المجمع غير موجود")
    # Ownership check
    if compound.get("company_id") != cid and compound.get("management_company_id") != cid:
        raise HTTPException(status_code=403, detail="هذا المجمع لا ينتمي لشركتك")
    allowed = ["name", "location", "address", "description"]
    update = {k: payload[k] for k in allowed if k in payload}
    if "name" in update and not (update["name"] or "").strip():
        raise HTTPException(status_code=400, detail="اسم المجمع مطلوب")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.compounds.update_one({"id": compound_id}, {"$set": update})
    refreshed = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    return {"success": True, "compound": serialize_datetime(refreshed)}


@router.delete("/company-admin/compounds/{compound_id}")
async def company_admin_delete_compound(compound_id: str, force: bool = False, current_user: dict = Depends(_require_company_admin), company_id: Optional[str] = None):
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="المجمع غير موجود")
    if compound.get("company_id") != cid and compound.get("management_company_id") != cid:
        raise HTTPException(status_code=403, detail="هذا المجمع لا ينتمي لشركتك")
    users_count = await db.users.count_documents({"compound_id": compound_id})
    if users_count > 0 and not force:
        raise HTTPException(status_code=400, detail=f"المجمع به {users_count} مستخدم. استخدم force=true للحذف مع إلغاء ربط المستخدمين.")
    if users_count > 0 and force:
        await db.users.update_many({"compound_id": compound_id}, {"$set": {"compound_id": None}})
    await db.compounds.delete_one({"id": compound_id})
    await db.companies.update_one({"id": cid}, {"$pull": {"compound_ids": compound_id}})
    await db.management_contracts.delete_many({"compound_id": compound_id})
    return {"success": True, "unlinked_users": users_count if force else 0}


@router.post("/company-admin/compounds/{compound_id}/users")
async def company_admin_add_user_to_compound(compound_id: str, payload: dict, current_user: dict = Depends(_require_company_admin), company_id: Optional[str] = None):
    """إضافة ساكن / إداري / أمن داخل مجمع تابع للشركة."""
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="المجمع غير موجود")
    if compound.get("company_id") != cid and compound.get("management_company_id") != cid:
        raise HTTPException(status_code=403, detail="هذا المجمع لا ينتمي لشركتك")

    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip()
    password = payload.get("password") or ""
    full_name = (payload.get("full_name") or "").strip()
    role = payload.get("role") or "resident"
    valid_roles = ["resident", "family_head", "manager", "security", "admin", "accountant", "assistant_manager"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"دور غير صالح: {valid_roles}")
    if not username or not email or not password or not full_name:
        raise HTTPException(status_code=400, detail="الحقول المطلوبة: full_name, username, email, password")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور 6 أحرف على الأقل")
    existing = await db.users.find_one({"$or": [{"username": username}, {"email": email.lower()}]})
    if existing:
        raise HTTPException(status_code=400, detail="اسم المستخدم أو البريد مستخدم بالفعل")

    # Plan-limit enforcement only for residents (other roles are admin/staff)
    if role == "resident":
        from plan_limits import assert_can_add_resident
        await assert_can_add_resident(cid)

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user_doc = {
        "id": str(uuid.uuid4()),
        "username": username,
        "email": email,
        "password_hash": password_hash,
        "role": role,
        "compound_id": compound_id,
        "company_id": cid,  # Also attach company_id for traceability
        "family_id": None,
        "full_name": full_name,
        "phone": payload.get("phone", "") or "",
        "unit_number": payload.get("unit_number", "") or "",
        "is_family_head": False,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id"),
        "profile_picture_url": None,
    }
    await db.users.insert_one(user_doc)
    user_doc.pop("_id", None)
    user_doc.pop("password_hash", None)
    return {"success": True, "user": serialize_datetime(user_doc)}


@router.get("/company-admin/compounds/{compound_id}/users")
async def company_admin_list_compound_users(compound_id: str, current_user: dict = Depends(_require_company_admin), company_id: Optional[str] = None):
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="المجمع غير موجود")
    if compound.get("company_id") != cid and compound.get("management_company_id") != cid:
        raise HTTPException(status_code=403, detail="هذا المجمع لا ينتمي لشركتك")
    users = await db.users.find({"compound_id": compound_id}, {"_id": 0, "password_hash": 0}).to_list(length=2000)
    return {"users": serialize_datetime(users), "total": len(users)}


# ==================== Onboarding: Bulk Compound Creation ====================

@router.post("/company-admin/compounds/bulk")
async def company_admin_bulk_create_compounds(payload: dict, current_user: dict = Depends(_require_company_admin), company_id: Optional[str] = None):
    """إنشاء مجموعة كمبوندات دفعة واحدة (Onboarding Wizard).
    
    payload = {"compounds": [{"name": str, "location": str, "address": str, "description": str}, ...]}
    - يتحقق من حدود الباقة قبل الإدراج
    - يتجاهل العناصر بدون name
    """
    from plan_limits import get_company_plan_limits
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    items = payload.get("compounds") or []
    if not isinstance(items, list) or not items:
        raise HTTPException(status_code=400, detail="قائمة الكمبوندات مطلوبة")

    # Plan-limit check (one-shot)
    plan = await get_company_plan_limits(cid)
    current_cpds = await db.compounds.count_documents({
        "$or": [{"company_id": cid}, {"management_company_id": cid}]
    })
    valid_items = [it for it in items if (it.get("name") or "").strip()]
    if plan["max_compounds"] != -1 and (current_cpds + len(valid_items)) > plan["max_compounds"]:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "plan_limit_compounds",
                "message": f"باقتك تسمح بـ {plan['max_compounds']} كمبوند فقط. لديك حالياً {current_cpds} وتحاول إضافة {len(valid_items)}.",
                "current": current_cpds,
                "max": plan["max_compounds"],
            }
        )

    created = []
    now = datetime.now(timezone.utc).isoformat()
    for it in valid_items:
        doc = {
            "id": str(uuid.uuid4()),
            "name": it["name"].strip(),
            "location": (it.get("location") or "").strip(),
            "address": (it.get("address") or "").strip(),
            "description": (it.get("description") or "").strip(),
            "company_id": cid,
            "management_company_id": cid,
            "created_at": now,
            "created_by": current_user.get("id"),
            "is_active": True,
        }
        await db.compounds.insert_one(doc)
        doc.pop("_id", None)
        created.append(doc)

    if created:
        await db.companies.update_one(
            {"id": cid},
            {"$addToSet": {"compound_ids": {"$each": [c["id"] for c in created]}}}
        )

    return {"success": True, "created": serialize_datetime(created), "count": len(created)}


# ==================== Aggregated Dashboard Stats ====================

@router.get("/company-admin/aggregated-stats")
async def company_admin_aggregated_stats(current_user: dict = Depends(_require_company_admin), company_id: Optional[str] = None):
    """إحصائيات شاملة لكل كمبوندات الشركة (للوحة تحكم مدير الشركة).
    
    يُرجع:
      - totals: إجماليات المستخدمين، السكان، الأمن، الإداريين
      - finance: إجمالي الرسوم غير المدفوعة (unit_charges)، الالتزامات المفتوحة (obligations)
      - issues: شكاوى مفتوحة + طلبات صيانة معلّقة
      - per_compound: تفصيل لكل كمبوند (نفس المقاييس)
    """
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)

    # Resolve all compounds under this company
    compounds = await db.compounds.find(
        {"$or": [{"company_id": cid}, {"management_company_id": cid}]},
        {"_id": 0}
    ).to_list(length=500)
    # Include legacy via companies.compound_ids
    company = await db.companies.find_one({"id": cid}, {"_id": 0, "compound_ids": 1, "name": 1})
    legacy_ids = [x for x in (company.get("compound_ids") or []) if x not in {c["id"] for c in compounds}]
    if legacy_ids:
        extras = await db.compounds.find({"id": {"$in": legacy_ids}}, {"_id": 0}).to_list(length=500)
        compounds.extend(extras)

    cids = [c["id"] for c in compounds]
    per = {c["id"]: {
        "id": c["id"],
        "name": c.get("name"),
        "location": c.get("location") or c.get("address") or "",
        "users": 0, "residents": 0, "managers": 0, "security": 0, "accountants": 0,
        "unpaid_charges_amount": 0.0, "unpaid_charges_count": 0,
        "open_obligations_amount": 0.0, "open_obligations_count": 0,
        "open_complaints": 0, "pending_maintenance": 0,
    } for c in compounds}

    totals = {
        "compounds_count": len(compounds),
        "users": 0, "residents": 0, "managers": 0, "security": 0, "accountants": 0,
        "unpaid_charges_amount": 0.0, "unpaid_charges_count": 0,
        "open_obligations_amount": 0.0, "open_obligations_count": 0,
        "open_complaints": 0, "pending_maintenance": 0,
    }

    if not cids:
        return {"company_id": cid, "company_name": company.get("name") if company else None,
                "totals": totals, "per_compound": []}

    # --- Users aggregation ---
    users_by_cpd = {}
    async for u in db.users.find({"compound_id": {"$in": cids}}, {"_id": 0, "password_hash": 0}):
        pcid = u.get("compound_id")
        if pcid not in per:
            continue
        role = u.get("role") or ""
        per[pcid]["users"] += 1
        totals["users"] += 1
        if role == "resident":
            per[pcid]["residents"] += 1; totals["residents"] += 1
        elif role in ("manager", "assistant_manager"):
            per[pcid]["managers"] += 1; totals["managers"] += 1
        elif role == "security":
            per[pcid]["security"] += 1; totals["security"] += 1
        elif role == "accountant":
            per[pcid]["accountants"] += 1; totals["accountants"] += 1
        users_by_cpd.setdefault(pcid, []).append(u.get("id"))

    # --- Finance: unpaid unit_charges ---
    try:
        async for ch in db.unit_charges.find(
            {"compound_id": {"$in": cids}, "status": {"$in": ["unpaid", "pending", "overdue"]}},
            {"_id": 0, "compound_id": 1, "amount": 1, "status": 1}
        ):
            pcid = ch.get("compound_id")
            amt = float(ch.get("amount") or 0)
            if pcid in per:
                per[pcid]["unpaid_charges_amount"] += amt
                per[pcid]["unpaid_charges_count"] += 1
            totals["unpaid_charges_amount"] += amt
            totals["unpaid_charges_count"] += 1
    except Exception:
        pass

    # --- Finance: open obligations (maintenance dues, etc.) ---
    try:
        async for ob in db.financial_obligations.find(
            {"compound_id": {"$in": cids}, "status": {"$in": ["pending", "open", "unpaid", "partial"]}},
            {"_id": 0, "compound_id": 1, "amount": 1, "amount_paid": 1, "status": 1}
        ):
            pcid = ob.get("compound_id")
            remaining = float(ob.get("amount") or 0) - float(ob.get("amount_paid") or 0)
            if remaining < 0:
                remaining = 0
            if pcid in per:
                per[pcid]["open_obligations_amount"] += remaining
                per[pcid]["open_obligations_count"] += 1
            totals["open_obligations_amount"] += remaining
            totals["open_obligations_count"] += 1
    except Exception:
        pass

    # --- Complaints (open) ---
    try:
        async for co in db.complaints.find(
            {"compound_id": {"$in": cids}, "status": {"$in": ["open", "pending", "in_progress", "new"]}},
            {"_id": 0, "compound_id": 1}
        ):
            pcid = co.get("compound_id")
            if pcid in per:
                per[pcid]["open_complaints"] += 1
            totals["open_complaints"] += 1
    except Exception:
        pass

    # --- Maintenance requests (pending) ---
    try:
        async for mr in db.maintenance_requests.find(
            {"compound_id": {"$in": cids}, "status": {"$in": ["pending", "open", "in_progress", "assigned", "new"]}},
            {"_id": 0, "compound_id": 1}
        ):
            pcid = mr.get("compound_id")
            if pcid in per:
                per[pcid]["pending_maintenance"] += 1
            totals["pending_maintenance"] += 1
    except Exception:
        pass

    return {
        "company_id": cid,
        "company_name": company.get("name") if company else None,
        "totals": totals,
        "per_compound": serialize_datetime(list(per.values())),
    }



@router.get("/company-admin/crm-summary")
async def company_admin_crm_summary(current_user: dict = Depends(_require_company_admin), company_id: Optional[str] = None):
    """ملخص CRM لكل الكمبوندات تحت الشركة.

    يرجع:
      - tag_counts: عدد المستخدمين لكل تاغ (VIP, late_payer, …) عبر كل المجمعات
      - vip_users: قائمة سريعة (أقصى 10) لمستخدمي VIP
      - late_payers: قائمة سريعة (أقصى 10) لأصحاب تاغ late_payer
      - notes_total: إجمالي عدد الملاحظات الإدارية المضافة
    """
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)

    compounds = await db.compounds.find(
        {"$or": [{"company_id": cid}, {"management_company_id": cid}]},
        {"_id": 0, "id": 1, "name": 1}
    ).to_list(length=500)
    company = await db.companies.find_one({"id": cid}, {"_id": 0, "compound_ids": 1})
    legacy_ids = [x for x in (company.get("compound_ids") or []) if x not in {c["id"] for c in compounds}]
    if legacy_ids:
        extras = await db.compounds.find({"id": {"$in": legacy_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(length=500)
        compounds.extend(extras)

    cids = [c["id"] for c in compounds]
    compound_name = {c["id"]: c.get("name") for c in compounds}

    if not cids:
        return {
            "company_id": cid,
            "tag_counts": {},
            "vip_users": [],
            "late_payers": [],
            "notes_total": 0,
        }

    # Aggregate tags across all residents of managed compounds
    pipeline = [
        {"$match": {"compound_id": {"$in": cids}, "crm_tags": {"$exists": True, "$ne": []}}},
        {"$unwind": "$crm_tags"},
        {"$group": {"_id": "$crm_tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    tag_counts = {}
    async for d in db.users.aggregate(pipeline):
        tag_counts[d["_id"]] = d["count"]

    # VIP list (top 10)
    vip_users = []
    async for u in db.users.find(
        {"compound_id": {"$in": cids}, "crm_tags": "vip"},
        {"_id": 0, "id": 1, "username": 1, "full_name": 1, "unit_number": 1,
         "compound_id": 1, "phone": 1, "email": 1}
    ).limit(10):
        u["compound_name"] = compound_name.get(u.get("compound_id"))
        vip_users.append(u)

    # Late payers (top 10)
    late_payers = []
    async for u in db.users.find(
        {"compound_id": {"$in": cids}, "crm_tags": "late_payer"},
        {"_id": 0, "id": 1, "username": 1, "full_name": 1, "unit_number": 1,
         "compound_id": 1, "phone": 1, "email": 1}
    ).limit(10):
        u["compound_name"] = compound_name.get(u.get("compound_id"))
        late_payers.append(u)

    # Count total private notes on users under these compounds
    user_ids = [u["id"] async for u in db.users.find({"compound_id": {"$in": cids}}, {"_id": 0, "id": 1})]
    notes_total = 0
    if user_ids:
        try:
            notes_total = await db.user_notes.count_documents({"user_id": {"$in": user_ids}})
        except Exception:
            notes_total = 0

    return {
        "company_id": cid,
        "tag_counts": tag_counts,
        "vip_users": serialize_datetime(vip_users),
        "late_payers": serialize_datetime(late_payers),
        "notes_total": notes_total,
    }

