"""
Company Admin Routes — endpoints for `company_admin` role to manage their own compounds & residents.

Each company_admin user has a `company_id` field linking them to exactly one management company.
They can:
  - GET their company info
  - GET/POST/PUT/DELETE compounds inside their company
  - GET/POST users (residents/managers/security) inside any compound under their company
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import base64
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


@router.put("/company-admin/logo")
async def company_admin_upload_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(_require_company_admin),
    company_id: Optional[str] = None,
):
    """رفع لوجو الشركة (يُحفظ كـ data:image/...;base64 داخل companies.logo_url)."""
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="الملف يجب أن يكون صورة")
    raw = await file.read()
    # 5MB hard cap to keep documents small
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="حجم الصورة يتجاوز 5MB")
    mime = file.content_type or "image/png"
    logo_url = f"data:{mime};base64,{base64.b64encode(raw).decode('utf-8')}"

    await db.companies.update_one(
        {"id": cid},
        {"$set": {"logo_url": logo_url, "logo_updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "تم رفع اللوجو بنجاح", "logo_url": logo_url}


@router.delete("/company-admin/logo")
async def company_admin_delete_logo(
    current_user: dict = Depends(_require_company_admin),
    company_id: Optional[str] = None,
):
    """حذف لوجو الشركة."""
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    await db.companies.update_one(
        {"id": cid},
        {"$unset": {"logo_url": "", "logo_updated_at": ""}}
    )
    return {"message": "تم حذف اللوجو"}


@router.put("/company-admin/compounds/{compound_id}/logo")
async def company_admin_upload_compound_logo(
    compound_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(_require_company_admin),
    company_id: Optional[str] = None,
):
    """رفع لوجو لمجمع تابع للشركة."""
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    compound = await db.compounds.find_one({"id": compound_id})
    if not compound:
        raise HTTPException(status_code=404, detail="المجمع غير موجود")
    # Check ownership: either compound.company_id matches, or compound is in legacy company.compound_ids
    company = await db.companies.find_one({"id": cid}, {"_id": 0, "compound_ids": 1})
    legacy_ids = company.get("compound_ids") or [] if company else []
    if compound.get("company_id") != cid and compound_id not in legacy_ids:
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية على هذا المجمع")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="الملف يجب أن يكون صورة")
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="حجم الصورة يتجاوز 5MB")
    mime = file.content_type or "image/png"
    logo_url = f"data:{mime};base64,{base64.b64encode(raw).decode('utf-8')}"

    await db.compounds.update_one(
        {"id": compound_id},
        {"$set": {"logo_url": logo_url, "logo_updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "تم رفع لوجو المجمع", "logo_url": logo_url}


@router.delete("/company-admin/compounds/{compound_id}/logo")
async def company_admin_delete_compound_logo(
    compound_id: str,
    current_user: dict = Depends(_require_company_admin),
    company_id: Optional[str] = None,
):
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    compound = await db.compounds.find_one({"id": compound_id})
    if not compound:
        raise HTTPException(status_code=404, detail="المجمع غير موجود")
    company = await db.companies.find_one({"id": cid}, {"_id": 0, "compound_ids": 1})
    legacy_ids = company.get("compound_ids") or [] if company else []
    if compound.get("company_id") != cid and compound_id not in legacy_ids:
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية على هذا المجمع")
    await db.compounds.update_one(
        {"id": compound_id},
        {"$unset": {"logo_url": "", "logo_updated_at": ""}}
    )
    return {"message": "تم حذف لوجو المجمع"}


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


@router.get("/company-admin/compounds/attention-summary")
async def company_admin_attention_summary(
    current_user: dict = Depends(_require_company_admin),
    company_id: Optional[str] = None,
):
    """للكل كمبوند تابع لشركة الإدارة: عدد العناصر التي تحتاج اهتمام.
    - `expiring_contracts`: عقود مدّتها تنتهي خلال 30 يوماً.
    - `open_complaints`: شكاوى بحالة open/pending/in_progress.
    - `late_payments`: مدفوعات متأخرة.
    - `total`: مجموع المؤشرات الثلاثة.
    """
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)

    # Resolve compounds under this company (same strategy as list endpoint)
    compounds = await db.compounds.find({"company_id": cid}, {"_id": 0, "id": 1}).to_list(length=500)
    company = await db.companies.find_one({"id": cid}, {"_id": 0, "compound_ids": 1}) or {}
    legacy_ids = [x for x in (company.get("compound_ids") or []) if x not in {c["id"] for c in compounds}]
    if legacy_ids:
        extras = await db.compounds.find({"id": {"$in": legacy_ids}}, {"_id": 0, "id": 1}).to_list(length=500)
        compounds.extend(extras)

    now = datetime.now(timezone.utc)
    soon = now + timedelta(days=30)
    now_iso = now.isoformat()
    soon_iso = soon.isoformat()
    today_date = now.date().isoformat()

    per_compound = {}
    grand_total = 0
    for cpd in compounds:
        cid_one = cpd["id"]

        # Expiring contracts (end_date within next 30 days, still active)
        expiring_contracts = await db.contracts.count_documents({
            "compound_id": cid_one,
            "status": {"$nin": ["cancelled", "terminated", "expired"]},
            "end_date": {"$gte": now_iso, "$lte": soon_iso},
        })

        # Open complaints
        open_complaints = await db.complaints.count_documents({
            "compound_id": cid_one,
            "status": {"$in": ["open", "pending", "in_progress", "new"]},
        })

        # Late payments
        late_payments = await db.resident_payments.count_documents({
            "compound_id": cid_one,
            "$or": [
                {"status": "overdue"},
                {"status": {"$in": ["pending", "unpaid"]}, "due_date": {"$lt": today_date}},
            ],
        })

        total = expiring_contracts + open_complaints + late_payments
        grand_total += total
        per_compound[cid_one] = {
            "total": total,
            "expiring_contracts": expiring_contracts,
            "open_complaints": open_complaints,
            "late_payments": late_payments,
        }

    return {
        "total": grand_total,
        "per_compound": per_compound,
        "company_id": cid,
    }


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
        # ✨ Iter 141 — revenue/occupancy for side-by-side compound comparison
        "monthly_revenue": 0.0,
        "total_units": c.get("total_units") or 0,
        "occupied_units": 0,  # filled in from families count below
    } for c in compounds}

    totals = {
        "compounds_count": len(compounds),
        "users": 0, "residents": 0, "managers": 0, "security": 0, "accountants": 0,
        "unpaid_charges_amount": 0.0, "unpaid_charges_count": 0,
        "open_obligations_amount": 0.0, "open_obligations_count": 0,
        "open_complaints": 0, "pending_maintenance": 0,
        "monthly_revenue": 0.0,
        "total_units": sum(c.get("total_units") or 0 for c in compounds),
        "occupied_units": 0,
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

    # --- Monthly revenue (paid invoices this calendar month) — Iter 141 ---
    try:
        from datetime import datetime as _dt, timezone as _tz
        _now = _dt.now(_tz.utc)
        month_start = _dt(_now.year, _now.month, 1, tzinfo=_tz.utc)
        async for inv in db.invoices.find(
            {"compound_id": {"$in": cids}, "status": "paid", "paid_at": {"$gte": month_start}},
            {"_id": 0, "compound_id": 1, "amount": 1}
        ):
            pcid = inv.get("compound_id")
            amount = float(inv.get("amount") or 0)
            if pcid in per:
                per[pcid]["monthly_revenue"] += amount
            totals["monthly_revenue"] += amount
    except Exception:
        pass

    # --- Occupancy: occupied_units = families count per compound ---
    try:
        async for fam in db.families.find({"compound_id": {"$in": cids}}, {"_id": 0, "compound_id": 1}):
            pcid = fam.get("compound_id")
            if pcid in per:
                per[pcid]["occupied_units"] += 1
            totals["occupied_units"] += 1
    except Exception:
        pass

    return {
        "company_id": cid,
        "company_name": company.get("name") if company else None,
        "totals": totals,
        "per_compound": serialize_datetime(list(per.values())),
    }



@router.get("/company-admin/compounds-trend")
async def company_admin_compounds_trend(
    current_user: dict = Depends(_require_company_admin),
    company_id: Optional[str] = None,
    months: int = 6,
):
    """6-month KPI trend per compound (Iter 142 – Feature #36).

    Returns a per-compound array of `{compound_id, name, points: [{month, label,
    revenue, residents, complaints, maintenance}]}` so the frontend can render a
    multi-line chart with one line per compound and a metric switcher.
    """
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    months = max(1, min(int(months or 6), 12))

    # Resolve compounds under this company
    compounds = await db.compounds.find(
        {"$or": [{"company_id": cid}, {"management_company_id": cid}]},
        {"_id": 0, "id": 1, "name": 1}
    ).to_list(length=500)
    company = await db.companies.find_one({"id": cid}, {"_id": 0, "compound_ids": 1, "name": 1})
    if company:
        legacy_ids = [x for x in (company.get("compound_ids") or []) if x not in {c["id"] for c in compounds}]
        if legacy_ids:
            extras = await db.compounds.find(
                {"id": {"$in": legacy_ids}}, {"_id": 0, "id": 1, "name": 1}
            ).to_list(length=500)
            compounds.extend(extras)
    cids = [c["id"] for c in compounds]
    if not cids:
        return {"company_id": cid, "months": [], "compounds": []}

    # Build month buckets: oldest → newest (inclusive of current month)
    from datetime import datetime as _dt, timezone as _tz
    now = _dt.now(_tz.utc)
    bucket_starts = []  # list of (year, month, start_iso, end_iso, label)
    for back in range(months - 1, -1, -1):
        # compute month-start `back` months ago
        y = now.year
        m = now.month - back
        while m <= 0:
            m += 12
            y -= 1
        start = _dt(y, m, 1, tzinfo=_tz.utc)
        # end = start of next month
        if m == 12:
            end = _dt(y + 1, 1, 1, tzinfo=_tz.utc)
        else:
            end = _dt(y, m + 1, 1, tzinfo=_tz.utc)
        ar_months = [
            "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
            "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
        ]
        label = f"{ar_months[m - 1]} {y % 100:02d}"
        bucket_starts.append((y, m, start, end, label))

    # Initialise per compound, per month
    per = {
        c["id"]: {
            "compound_id": c["id"],
            "name": c.get("name") or "—",
            "points": [
                {
                    "month": f"{by}-{bm:02d}",
                    "label": blabel,
                    "revenue": 0.0,
                    "residents": 0,
                    "complaints": 0,
                    "maintenance": 0,
                }
                for (by, bm, _s, _e, blabel) in bucket_starts
            ],
        }
        for c in compounds
    }

    earliest_start = bucket_starts[0][2]
    latest_end = bucket_starts[-1][3]

    def _idx_for(dt_val):
        """Find bucket index for a given datetime. Returns -1 if out of range."""
        if not dt_val:
            return -1
        try:
            if isinstance(dt_val, str):
                d = _dt.fromisoformat(dt_val.replace("Z", "+00:00"))
            else:
                d = dt_val
            if d.tzinfo is None:
                d = d.replace(tzinfo=_tz.utc)
        except Exception:
            return -1
        if d < earliest_start or d >= latest_end:
            return -1
        for i, (_y, _m, s, e, _l) in enumerate(bucket_starts):
            if s <= d < e:
                return i
        return -1

    # ---- Revenue: paid invoices per compound per month ----
    try:
        async for inv in db.invoices.find(
            {
                "compound_id": {"$in": cids},
                "status": "paid",
                "paid_at": {"$gte": earliest_start, "$lt": latest_end},
            },
            {"_id": 0, "compound_id": 1, "amount": 1, "paid_at": 1},
        ):
            pcid = inv.get("compound_id")
            if pcid not in per:
                continue
            i = _idx_for(inv.get("paid_at"))
            if i >= 0:
                per[pcid]["points"][i]["revenue"] += float(inv.get("amount") or 0)
    except Exception:
        pass

    # ---- Residents: cumulative count of users created up to end-of-month ----
    # cheaper to fetch all residents once and bucket-cumulate
    try:
        all_residents = []
        async for u in db.users.find(
            {"compound_id": {"$in": cids}, "role": "resident"},
            {"_id": 0, "compound_id": 1, "created_at": 1, "id": 1},
        ):
            all_residents.append(u)
        # cumulative counts: for each compound, for each bucket, count residents
        # whose created_at < bucket_end
        for pcid, pdata in per.items():
            rs = [u for u in all_residents if u.get("compound_id") == pcid]
            for i, (_y, _m, _s, e, _l) in enumerate(bucket_starts):
                cnt = 0
                for u in rs:
                    cdt = u.get("created_at")
                    if not cdt:
                        cnt += 1  # legacy users without created_at — assume pre-existing
                        continue
                    try:
                        d = _dt.fromisoformat(str(cdt).replace("Z", "+00:00"))
                        if d.tzinfo is None:
                            d = d.replace(tzinfo=_tz.utc)
                        if d < e:
                            cnt += 1
                    except Exception:
                        cnt += 1
                pdata["points"][i]["residents"] = cnt
    except Exception:
        pass

    # ---- Complaints: count opened per month ----
    try:
        async for co in db.complaints.find(
            {"compound_id": {"$in": cids}, "created_at": {"$gte": earliest_start, "$lt": latest_end}},
            {"_id": 0, "compound_id": 1, "created_at": 1},
        ):
            pcid = co.get("compound_id")
            if pcid not in per:
                continue
            i = _idx_for(co.get("created_at"))
            if i >= 0:
                per[pcid]["points"][i]["complaints"] += 1
    except Exception:
        pass

    # ---- Maintenance: count opened per month ----
    try:
        async for mr in db.maintenance_requests.find(
            {"compound_id": {"$in": cids}, "created_at": {"$gte": earliest_start, "$lt": latest_end}},
            {"_id": 0, "compound_id": 1, "created_at": 1},
        ):
            pcid = mr.get("compound_id")
            if pcid not in per:
                continue
            i = _idx_for(mr.get("created_at"))
            if i >= 0:
                per[pcid]["points"][i]["maintenance"] += 1
    except Exception:
        pass

    months_list = [
        {"month": f"{y}-{m:02d}", "label": label}
        for (y, m, _s, _e, label) in bucket_starts
    ]
    return {
        "company_id": cid,
        "months": months_list,
        "compounds": list(per.values()),
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

    # Count total private notes on users under these compounds via a single aggregation
    # join on user_notes → users. Avoids loading all user_ids into memory.
    notes_total = 0
    try:
        pipeline2 = [
            {"$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "id",
                "as": "u",
                "pipeline": [{"$project": {"_id": 0, "compound_id": 1}}],
            }},
            {"$unwind": "$u"},
            {"$match": {"u.compound_id": {"$in": cids}}},
            {"$count": "total"},
        ]
        async for d in db.user_notes.aggregate(pipeline2):
            notes_total = d.get("total", 0)
    except Exception:
        notes_total = 0

    return {
        "company_id": cid,
        "tag_counts": tag_counts,
        "vip_users": serialize_datetime(vip_users),
        "late_payers": serialize_datetime(late_payers),
        "notes_total": notes_total,
    }




# ─────────────────────────────────────────────────────────────────────
# Trial / Coupon / Subscription-Code activation flows for company_admin
# ─────────────────────────────────────────────────────────────────────
from pydantic import BaseModel, Field


class CouponPreviewIn(BaseModel):
    plan_key: str = Field(..., min_length=1)
    coupon_code: str = Field(..., min_length=1, max_length=64)


class RedeemCodeIn(BaseModel):
    code: str = Field(..., min_length=1, max_length=64)


class ActivateTrialIn(BaseModel):
    plan_key: Optional[str] = Field(None, description="company_business or company_enterprise")


@router.post("/company-admin/activate-trial")
async def company_admin_activate_trial(
    payload: Optional[ActivateTrialIn] = None,
    current_user: dict = Depends(_require_company_admin),
):
    """Activate a 14-day free trial for the company on a chosen paid plan.
    Allowed plan_key values: `company_business` (default) or `company_enterprise`.
    Once-per-company (idempotent block)."""
    db = get_db()
    cid = await _resolve_company_id(current_user, None) if current_user.get("role") == "company_admin" else None
    if not cid:
        raise HTTPException(status_code=400, detail="هذا الإجراء متاح لمدير الشركة فقط")

    # Validate requested plan
    ALLOWED_TRIAL_PLANS = {"company_startup", "company_business", "company_enterprise"}
    requested_plan = (payload.plan_key if payload else None) or "company_business"
    if requested_plan not in ALLOWED_TRIAL_PLANS:
        raise HTTPException(
            status_code=400,
            detail="التجربة المجانية متاحة على الخطة الناشئة أو المتوسطة أو الكبرى",
        )

    sub = await db.company_subscriptions.find_one({"company_id": cid}) or {}
    if sub.get("trial_used"):
        raise HTTPException(status_code=400, detail="تم استخدام التجربة المجانية لهذه الشركة من قبل")

    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=14)
    update = {
        "company_id": cid,
        "plan": requested_plan,
        "status": "trial",
        "trial_used": True,
        "trial_plan": requested_plan,
        "trial_started_at": now.isoformat(),
        "expires_at": expires.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.company_subscriptions.update_one(
        {"company_id": cid},
        {"$set": update, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now.isoformat()}},
        upsert=True,
    )
    plan_labels = {
        "company_startup": "الناشئة",
        "company_business": "المتوسطة",
        "company_enterprise": "الكبرى",
    }
    plan_label = plan_labels.get(requested_plan, requested_plan)
    return {
        "success": True,
        "plan_key": requested_plan,
        "trial_days": 14,
        "expires_at": expires.isoformat(),
        "message": f"تم تفعيل التجربة المجانية لمدة 14 يوم على الخطة {plan_label} 🎉",
    }


@router.post("/company-admin/preview-coupon")
async def company_admin_preview_coupon(payload: CouponPreviewIn, current_user: dict = Depends(_require_company_admin)):
    """Validate a coupon against the target plan and return discount preview.
    Does NOT consume usage — only the actual checkout (or apply-coupon) does."""
    db = get_db()
    code = payload.coupon_code.strip().upper()
    coupon = await db.coupons.find_one({"code": code, "is_active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="كوبون غير صالح أو غير مفعّل")

    if coupon.get("times_used", 0) >= coupon.get("max_uses", 100):
        raise HTTPException(status_code=400, detail="انتهى الحد الأقصى لاستخدام هذا الكوبون")
    if coupon.get("expires_at"):
        try:
            exp = datetime.fromisoformat(coupon["expires_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp:
                raise HTTPException(status_code=400, detail="انتهت صلاحية هذا الكوبون")
        except ValueError:
            pass
    if coupon.get("applicable_plans") and payload.plan_key not in coupon["applicable_plans"]:
        raise HTTPException(status_code=400, detail="هذا الكوبون لا ينطبق على هذه الخطة")

    PRICES_EGP = {
        "starter": 0,
        "company_startup": 3500,
        "company_business": 7500,
        "company_enterprise": 20000,
    }
    original = PRICES_EGP.get(payload.plan_key, 0)
    if coupon["discount_type"] == "percentage":
        discount = round(original * (coupon["discount_value"] / 100), 2)
    else:
        discount = min(coupon["discount_value"], original)
    final = max(0, original - discount)

    return {
        "valid": True,
        "coupon_code": coupon["code"],
        "plan_key": payload.plan_key,
        "discount_type": coupon["discount_type"],
        "discount_value": coupon["discount_value"],
        "original_price": original,
        "discount_amount": discount,
        "final_price": final,
        "currency": "EGP",
    }


@router.post("/company-admin/redeem-subscription-code")
async def company_admin_redeem_code(payload: RedeemCodeIn, current_user: dict = Depends(_require_company_admin)):
    """Redeem a subscription code that grants the company a paid plan for a fixed duration.
    Looks up the code in `subscription_codes` collection. Code shape:
       {code, plan_key, duration_days, max_uses, times_used, is_active, expires_at}
    """
    db = get_db()
    cid = await _resolve_company_id(current_user, None) if current_user.get("role") == "company_admin" else None
    if not cid:
        raise HTTPException(status_code=400, detail="هذا الإجراء متاح لمدير الشركة فقط")

    code = payload.code.strip().upper()
    sc = await db.subscription_codes.find_one({"code": code}, {"_id": 0})
    if not sc:
        raise HTTPException(status_code=404, detail="كود اشتراك غير صحيح")
    if not sc.get("is_active", True):
        raise HTTPException(status_code=400, detail="هذا الكود غير مفعّل")
    if sc.get("times_used", 0) >= sc.get("max_uses", 1):
        raise HTTPException(status_code=400, detail="تم استخدام هذا الكود الحد الأقصى")
    if sc.get("expires_at"):
        try:
            exp = datetime.fromisoformat(sc["expires_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp:
                raise HTTPException(status_code=400, detail="انتهت صلاحية هذا الكود")
        except ValueError:
            pass

    plan_key = sc.get("plan_key") or sc.get("type") or "company_startup"
    duration_days = int(sc.get("duration_days") or 30)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=duration_days)

    await db.company_subscriptions.update_one(
        {"company_id": cid},
        {
            "$set": {
                "company_id": cid,
                "plan": plan_key,
                "status": "active",
                "expires_at": expires.isoformat(),
                "code_used": code,
                "updated_at": now.isoformat(),
            },
            "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now.isoformat()},
        },
        upsert=True,
    )
    await db.subscription_codes.update_one(
        {"code": code},
        {"$inc": {"times_used": 1}, "$set": {"last_used_at": now.isoformat(), "last_used_by_company": cid}},
    )

    return {
        "success": True,
        "plan_key": plan_key,
        "duration_days": duration_days,
        "expires_at": expires.isoformat(),
        "message": f"تم تفعيل خطتك حتى {expires.date().isoformat()} ✨",
    }


# ==================== Company-Level Assistants ====================

@router.get("/company-admin/assistants")
async def list_company_assistants(
    current_user: dict = Depends(_require_company_admin),
    company_id: Optional[str] = None,
):
    """قائمة مساعدي الشركة (على مستوى الشركة كلها)."""
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    assistants = await db.users.find(
        {
            "company_id": cid,
            "role": {"$in": ["admin", "manager", "assistant_manager", "accountant"]},
            "compound_id": {"$in": [None, "", "default-compound"]},
        },
        {"_id": 0, "password_hash": 0},
    ).to_list(length=500)
    # Also get those explicitly flagged as company_assistant
    flagged = await db.users.find(
        {"company_id": cid, "is_company_assistant": True},
        {"_id": 0, "password_hash": 0},
    ).to_list(length=500)
    # Merge deduplicated
    seen = {a["id"] for a in assistants}
    for a in flagged:
        if a["id"] not in seen:
            assistants.append(a)
            seen.add(a["id"])
    return {"assistants": serialize_datetime(assistants), "total": len(assistants)}


@router.post("/company-admin/assistants")
async def add_company_assistant(
    payload: dict,
    current_user: dict = Depends(_require_company_admin),
    company_id: Optional[str] = None,
):
    """إضافة مساعد على مستوى شركة الإدارة (لا يتبع كمبوند بعينه)."""
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)

    username  = (payload.get("username") or "").strip()
    email     = (payload.get("email") or "").strip().lower()
    password  = payload.get("password") or ""
    full_name = (payload.get("full_name") or "").strip()
    role      = payload.get("role") or "assistant_manager"
    permissions = payload.get("permissions") or []

    valid_roles = ["admin", "manager", "assistant_manager", "accountant"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"الدور غير مقبول، الأدوار المتاحة: {valid_roles}")
    if not all([username, email, password, full_name]):
        raise HTTPException(status_code=400, detail="الحقول المطلوبة: full_name, username, email, password")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور 6 أحرف على الأقل")

    existing = await db.users.find_one({"$or": [{"username": username}, {"email": email}]})
    if existing:
        raise HTTPException(status_code=400, detail="اسم المستخدم أو البريد مستخدم بالفعل")

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user_doc = {
        "id": str(uuid.uuid4()),
        "username": username,
        "email": email,
        "password_hash": password_hash,
        "role": role,
        "company_id": cid,
        "compound_id": "company-level",  # No specific compound
        "is_company_assistant": True,
        "permissions": permissions,
        "full_name": full_name,
        "phone": payload.get("phone", "") or "",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id"),
    }
    await db.users.insert_one(user_doc)
    user_doc.pop("_id", None)
    user_doc.pop("password_hash", None)
    return {"success": True, "assistant": serialize_datetime(user_doc)}


@router.put("/company-admin/assistants/{user_id}")
async def update_company_assistant(
    user_id: str,
    payload: dict,
    current_user: dict = Depends(_require_company_admin),
    company_id: Optional[str] = None,
):
    """تعديل بيانات أو صلاحيات مساعد."""
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    assistant = await db.users.find_one({"id": user_id, "company_id": cid})
    if not assistant:
        raise HTTPException(status_code=404, detail="المساعد غير موجود أو لا ينتمي لشركتك")

    update_fields = {}
    for field in ["full_name", "phone", "role", "permissions", "is_active"]:
        if field in payload:
            update_fields[field] = payload[field]

    if update_fields:
        await db.users.update_one({"id": user_id}, {"$set": update_fields})
    return {"success": True, "message": "تم التحديث بنجاح"}


@router.delete("/company-admin/assistants/{user_id}")
async def remove_company_assistant(
    user_id: str,
    current_user: dict = Depends(_require_company_admin),
    company_id: Optional[str] = None,
):
    """حذف مساعد من الشركة."""
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    assistant = await db.users.find_one({"id": user_id, "company_id": cid})
    if not assistant:
        raise HTTPException(status_code=404, detail="المساعد غير موجود")
    await db.users.delete_one({"id": user_id})
    return {"success": True, "message": "تم حذف المساعد"}


# ==================== Compound Team Management ====================

@router.get("/company-admin/compounds/{compound_id}/team")
async def get_compound_team(
    compound_id: str,
    current_user: dict = Depends(_require_company_admin),
    company_id: Optional[str] = None,
):
    """فريق عمل كمبوند محدد (مدير + مساعدون + أمن)."""
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="الكمبوند غير موجود")
    if compound.get("company_id") != cid and compound.get("management_company_id") != cid:
        raise HTTPException(status_code=403, detail="هذا الكمبوند لا ينتمي لشركتك")

    team = await db.users.find(
        {
            "compound_id": compound_id,
            "role": {"$in": ["admin", "manager", "assistant_manager", "accountant", "security"]},
        },
        {"_id": 0, "password_hash": 0},
    ).to_list(length=200)

    # Group by role
    grouped = {"admin": [], "manager": [], "assistant_manager": [], "accountant": [], "security": []}
    for member in team:
        role = member.get("role", "manager")
        if role in grouped:
            grouped[role].append(serialize_datetime(member))

    return {
        "compound_id": compound_id,
        "compound_name": compound.get("name", ""),
        "team": grouped,
        "total": len(team),
    }


@router.post("/company-admin/compounds/{compound_id}/team")
async def add_compound_team_member(
    compound_id: str,
    payload: dict,
    current_user: dict = Depends(_require_company_admin),
    company_id: Optional[str] = None,
):
    """إضافة عضو لفريق عمل كمبوند محدد."""
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="الكمبوند غير موجود")
    if compound.get("company_id") != cid and compound.get("management_company_id") != cid:
        raise HTTPException(status_code=403, detail="هذا الكمبوند لا ينتمي لشركتك")

    username  = (payload.get("username") or "").strip()
    email     = (payload.get("email") or "").strip().lower()
    password  = payload.get("password") or ""
    full_name = (payload.get("full_name") or "").strip()
    role      = payload.get("role") or "manager"
    valid_roles = ["admin", "manager", "assistant_manager", "accountant", "security"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"الدور غير مقبول: {valid_roles}")
    if not all([username, email, password, full_name]):
        raise HTTPException(status_code=400, detail="الحقول المطلوبة: full_name, username, email, password")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور 6 أحرف على الأقل")

    existing = await db.users.find_one({"$or": [{"username": username}, {"email": email}]})
    if existing:
        raise HTTPException(status_code=400, detail="اسم المستخدم أو البريد مستخدم بالفعل")

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user_doc = {
        "id": str(uuid.uuid4()),
        "username": username,
        "email": email,
        "password_hash": password_hash,
        "role": role,
        "company_id": cid,
        "compound_id": compound_id,
        "full_name": full_name,
        "phone": payload.get("phone", "") or "",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id"),
    }
    await db.users.insert_one(user_doc)
    user_doc.pop("_id", None)
    user_doc.pop("password_hash", None)
    return {"success": True, "member": serialize_datetime(user_doc)}
