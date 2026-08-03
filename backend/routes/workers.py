"""
Workers & Craftsmen System — عمال وصنايعية
- الساكن يضيف عامل بعد تجربته
- الأدمن يوافق قبل النشر
- تقييم + ملاحظات
- القائمة السوداء (Blacklist)
- يظهر داخل الكمبوند + شركة الإدارة + داشبورد الأونر
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from datetime import datetime, timezone
from typing import Optional, List
import uuid, os, aiofiles

from database import get_db
from auth_deps import get_current_user, require_admin

router = APIRouter(prefix="/api/workers", tags=["workers"])
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/uploads")

SPECIALTIES = [
    "سباكة", "كهرباء", "نجارة", "دهانات", "تكييف",
    "حدادة", "بلاط وسيراميك", "جبس", "أعمال ألمنيوم",
    "صيانة عامة", "نظافة", "بستنة", "أخرى"
]


# ── Add worker (resident) ──────────────────────────────────────────
@router.post("")
async def add_worker(
    name: str = Form(...),
    specialty: str = Form(...),
    phone: str = Form(""),
    description: str = Form(""),
    rating: float = Form(5.0),
    review: str = Form(""),
    compound_id: str = Form(""),
    photo: UploadFile = File(None),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    effective_compound = compound_id or current_user.get("compound_id", "")
    if not effective_compound or effective_compound == "default-compound":
        raise HTTPException(status_code=400, detail="compound_id مطلوب")

    photo_url = None
    if photo and photo.filename:
        os.makedirs(f"{UPLOAD_DIR}/workers", exist_ok=True)
        ext = photo.filename.rsplit(".", 1)[-1].lower()
        fname = f"worker_{uuid.uuid4().hex[:8]}.{ext}"
        content = await photo.read()
        async with aiofiles.open(f"{UPLOAD_DIR}/workers/{fname}", "wb") as f:
            await f.write(content)
        photo_url = f"/api/files/workers/{fname}"

    role = current_user.get("role", "")
    auto_approve = role in ("app_owner", "super_admin", "admin", "company_admin", "manager")

    worker = {
        "id": str(uuid.uuid4()),
        "compound_id": effective_compound,
        "name": name,
        "specialty": specialty,
        "phone": phone,
        "description": description,
        "photo_url": photo_url,
        "status": "active" if auto_approve else "pending",
        "blacklisted": False,
        "blacklist_reason": None,
        "added_by": current_user["id"],
        "added_by_name": current_user.get("full_name") or current_user.get("username"),
        "added_by_role": role,
        "reviews": [{
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "user_name": current_user.get("full_name") or current_user.get("username"),
            "rating": min(5.0, max(1.0, float(rating))),
            "review": review,
            "created_at": now,
        }] if review or rating else [],
        "avg_rating": float(rating) if rating else None,
        "total_reviews": 1 if review or rating else 0,
        "created_at": now,
        "updated_at": now,
    }
    await db.workers.insert_one(worker)
    worker.pop("_id", None)

    # Notify admin if pending
    if not auto_approve:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "compound_id": effective_compound,
            "target_role": "admin",
            "type": "worker_approval",
            "title": "طلب إضافة عامل/صنايعي",
            "body": f"{worker['added_by_name']} أضاف {name} ({specialty}) — بانتظار موافقتك",
            "worker_id": worker["id"],
            "read": False,
            "created_at": now,
        })

    return {"success": True, "worker": worker, "status": worker["status"]}


# ── List workers ───────────────────────────────────────────────────
@router.get("")
async def list_workers(
    compound_id: Optional[str] = None,
    specialty: Optional[str] = None,
    status: Optional[str] = "active",
    blacklisted: Optional[bool] = False,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    role = current_user.get("role", "")
    query: dict = {"blacklisted": blacklisted or False}

    # Scope
    if compound_id:
        query["compound_id"] = compound_id
    elif role in ("app_owner", "super_admin"):
        pass
    elif role == "company_admin" and current_user.get("company_id"):
        compounds = await db.compounds.find(
            {"$or": [{"company_id": current_user["company_id"]},
                     {"management_company_id": current_user["company_id"]}]},
            {"_id": 0, "id": 1}
        ).to_list(200)
        query["compound_id"] = {"$in": [c["id"] for c in compounds]}
    else:
        query["compound_id"] = current_user.get("compound_id", "")

    if status:
        query["status"] = status
    if specialty:
        query["specialty"] = specialty

    workers = await db.workers.find(query, {"_id": 0}).sort("avg_rating", -1).limit(limit).to_list(limit)
    return {"workers": workers, "total": len(workers)}


# ── Get pending (admin) ────────────────────────────────────────────
@router.get("/pending")
async def get_pending(current_user: dict = Depends(require_admin)):
    db = get_db()
    role = current_user.get("role", "")
    query = {"status": "pending"}
    if role not in ("app_owner", "super_admin"):
        query["compound_id"] = current_user.get("compound_id", "")
    items = await db.workers.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"workers": items, "total": len(items)}


# ── Approve / Reject ───────────────────────────────────────────────
@router.put("/{worker_id}/approve")
async def approve_worker(
    worker_id: str,
    body: dict,
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    action = body.get("action", "approve")
    reason = body.get("reason", "")
    update = {
        "status": "active" if action == "approve" else "rejected",
        "rejection_reason": reason if action != "approve" else None,
        "approved_by": current_user["id"],
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.workers.update_one({"id": worker_id}, {"$set": update})
    return {"success": True, "status": update["status"]}


# ── Add review ─────────────────────────────────────────────────────
@router.post("/{worker_id}/reviews")
async def add_review(
    worker_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    worker = await db.workers.find_one({"id": worker_id})
    if not worker:
        raise HTTPException(status_code=404, detail="العامل غير موجود")

    # Prevent duplicate review from same user
    existing = [r for r in worker.get("reviews", []) if r.get("user_id") == current_user["id"]]
    if existing:
        raise HTTPException(status_code=400, detail="لقد قيّمت هذا العامل مسبقاً")

    rating = min(5.0, max(1.0, float(body.get("rating", 5))))
    review_obj = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": current_user.get("full_name") or current_user.get("username"),
        "rating": rating,
        "review": body.get("review", "").strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    all_reviews = worker.get("reviews", []) + [review_obj]
    avg = round(sum(r["rating"] for r in all_reviews) / len(all_reviews), 2)

    await db.workers.update_one(
        {"id": worker_id},
        {"$push": {"reviews": review_obj},
         "$set": {"avg_rating": avg, "total_reviews": len(all_reviews),
                  "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "avg_rating": avg, "total_reviews": len(all_reviews)}


# ── Blacklist ──────────────────────────────────────────────────────
@router.put("/{worker_id}/blacklist")
async def blacklist_worker(
    worker_id: str,
    body: dict,
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    worker = await db.workers.find_one({"id": worker_id})
    if not worker:
        raise HTTPException(status_code=404, detail="غير موجود")

    action = body.get("action", "blacklist")  # blacklist / remove
    is_blacklisted = action == "blacklist"
    reason = body.get("reason", "")

    await db.workers.update_one(
        {"id": worker_id},
        {"$set": {
            "blacklisted": is_blacklisted,
            "blacklist_reason": reason if is_blacklisted else None,
            "blacklisted_by": current_user["id"] if is_blacklisted else None,
            "blacklisted_by_name": (current_user.get("full_name") or current_user.get("username")) if is_blacklisted else None,
            "blacklisted_at": datetime.now(timezone.utc).isoformat() if is_blacklisted else None,
            "status": "blacklisted" if is_blacklisted else "active",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    return {"success": True, "blacklisted": is_blacklisted}


# ── Stats for dashboards ───────────────────────────────────────────
@router.get("/stats/summary")
async def get_stats(
    compound_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    role = current_user.get("role", "")
    if role in ("app_owner", "super_admin"):
        scope = {}
    elif role == "company_admin" and current_user.get("company_id"):
        compounds = await db.compounds.find(
            {"$or": [{"company_id": current_user["company_id"]},
                     {"management_company_id": current_user["company_id"]}]},
            {"_id": 0, "id": 1}
        ).to_list(200)
        scope = {"compound_id": {"$in": [c["id"] for c in compounds]}}
    else:
        scope = {"compound_id": compound_id or current_user.get("compound_id", "")}

    total = await db.workers.count_documents(scope)
    active = await db.workers.count_documents({**scope, "status": "active"})
    pending = await db.workers.count_documents({**scope, "status": "pending"})
    blacklisted = await db.workers.count_documents({**scope, "blacklisted": True})

    by_specialty = {}
    for sp in SPECIALTIES:
        count = await db.workers.count_documents({**scope, "specialty": sp, "status": "active"})
        if count > 0:
            by_specialty[sp] = count

    return {
        "total": total,
        "active": active,
        "pending": pending,
        "blacklisted": blacklisted,
        "by_specialty": by_specialty,
        "specialties": SPECIALTIES,
    }


# ── Delete ─────────────────────────────────────────────────────────
@router.delete("/{worker_id}")
async def delete_worker(worker_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    w = await db.workers.find_one({"id": worker_id})
    if not w:
        raise HTTPException(status_code=404, detail="غير موجود")
    role = current_user.get("role", "")
    if w["added_by"] != current_user["id"] and role not in ("app_owner", "super_admin", "admin", "company_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    await db.workers.delete_one({"id": worker_id})
    return {"success": True}
