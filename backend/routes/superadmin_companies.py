"""
Super Admin — Companies Management (extracted from superadmin.py)
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from datetime import datetime, timezone
import uuid

from database import get_db
from auth_deps import require_super_admin
from helpers import serialize_datetime

router = APIRouter(prefix="/api")


@router.get("/super-admin/companies")
async def list_companies_full(current_user: dict = Depends(require_super_admin)):
    """قائمة شاملة لشركات الإدارة مع كل التفاصيل: المجمعات، المستخدمون، الاشتراكات، الأرقام.
    
    يعالج ذاتياً الروابط المفقودة:
      - يملأ admin_user_id على الشركات المرتبطة بمدير شركة ليس لها مرجع عكسي
      - يعيد قائمة orphan_admins (مدراء شركات دون شركة حقيقية) لعرضها منفصلة في الواجهة
    """
    db = get_db()
    companies = await db.companies.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    compounds_all = await db.compounds.find({}, {"_id": 0}).to_list(1000)
    users_all = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(5000)
    subs_all = await db.user_subscriptions.find({}, {"_id": 0}).to_list(5000)
    sub_by_user = {s.get("user_id"): s for s in subs_all}
    now = datetime.now(timezone.utc)

    # Auto-heal: for every company_admin user, ensure the matching company has admin_user_id set
    companies_by_id = {c.get("id"): c for c in companies}
    healed_ids = set()
    for u in users_all:
        if u.get("role") != "company_admin":
            continue
        cid = u.get("company_id")
        if not cid:
            continue
        co = companies_by_id.get(cid)
        if co and not co.get("admin_user_id"):
            await db.companies.update_one(
                {"id": cid},
                {"$set": {"admin_user_id": u.get("id"), "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            co["admin_user_id"] = u.get("id")
            healed_ids.add(cid)

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

    # Orphan company_admins: role=company_admin whose company_id is missing or points to a non-existent company
    existing_company_ids = set(companies_by_id.keys())
    orphan_admins = []
    for u in users_all:
        if u.get("role") != "company_admin":
            continue
        cid = u.get("company_id")
        if cid and cid in existing_company_ids:
            continue  # properly linked
        orphan_admins.append({
            "id": u.get("id"),
            "username": u.get("username"),
            "full_name": u.get("full_name"),
            "email": u.get("email"),
            "phone": u.get("phone"),
            "company_id": cid,  # may be None or stale reference
            "company_id_missing": bool(cid) and cid not in existing_company_ids,
            "is_active": u.get("is_active", True),
            "created_at": u.get("created_at"),
            "profile_picture_url": u.get("profile_picture_url"),
        })

    return {
        "companies": serialize_datetime(result),
        "total": len(result),
        "orphan_admins": serialize_datetime(orphan_admins),
        "healed_companies": list(healed_ids),
    }


@router.post("/super-admin/companies/from-admin/{user_id}")
async def create_company_from_orphan_admin(user_id: str, payload: dict = None, current_user: dict = Depends(require_super_admin)):
    """تحويل مدير شركة يتيم إلى شركة كاملة بنقرة واحدة.
    
    - إذا كان user.company_id يشير إلى شركة موجودة: يتم ربطها فقط (admin_user_id)
    - إذا كان يشير إلى شركة غير موجودة أو كان None: يتم إنشاء شركة جديدة وربطها
    """
    db = get_db()
    payload = payload or {}
    user = await db.users.find_one({"id": user_id, "role": "company_admin"}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="مدير الشركة غير موجود أو ليس بدور company_admin")

    existing_cid = user.get("company_id")
    if existing_cid:
        existing_company = await db.companies.find_one({"id": existing_cid}, {"_id": 0})
        if existing_company:
            # Just back-link admin if missing
            if not existing_company.get("admin_user_id"):
                await db.companies.update_one(
                    {"id": existing_cid},
                    {"$set": {"admin_user_id": user_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
            return {"success": True, "action": "linked", "company_id": existing_cid}

    # Create a fresh company
    default_name = (payload.get("name") or user.get("full_name") or user.get("username") or "شركة جديدة").strip()
    new_company = {
        "id": str(uuid.uuid4()),
        "name": default_name,
        "email": payload.get("email") or user.get("email", ""),
        "phone": payload.get("phone") or user.get("phone", ""),
        "address": payload.get("address", ""),
        "website": payload.get("website", ""),
        "description": payload.get("description", ""),
        "compound_ids": [],
        "admin_user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id"),
    }
    await db.companies.insert_one(new_company)
    # Update the user to reference the new company
    await db.users.update_one({"id": user_id}, {"$set": {"company_id": new_company["id"]}})
    new_company.pop("_id", None)
    return {"success": True, "action": "created", "company": serialize_datetime(new_company)}


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
        entry = {
            "id": co.get("id"),
            "name": co.get("name"),
            "email": co.get("email", ""),
            "compounds_count": len(cpds),
            "total_users": len(users),
            "active_subs": active_subs,
            "expired_subs": expired_subs,
        }
        # الإيرادات المالية مقصورة على مالك التطبيق فقط
        if current_user.get("role") == "app_owner":
            entry["revenue"] = revenue
        enriched.append(entry)

    # منع السوبر أدمن من الترتيب حسب الإيرادات
    effective_metric = metric
    if metric == "revenue" and current_user.get("role") != "app_owner":
        effective_metric = "compounds"
    sort_keys = {
        "compounds": lambda x: (x["compounds_count"], x["total_users"]),
        "users": lambda x: (x["total_users"], x["compounds_count"]),
        "revenue": lambda x: (x.get("revenue", 0), x["total_users"]),
        "active_subs": lambda x: (x["active_subs"], x["total_users"]),
    }
    key_fn = sort_keys.get(effective_metric, sort_keys["compounds"])
    enriched.sort(key=key_fn, reverse=True)
    top = enriched[:10]

    return {
        "metric": effective_metric,
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

