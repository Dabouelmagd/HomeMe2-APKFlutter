"""
Global Search API
=================
GET /api/search?q=<query>&limit=20

يبحث في:
- السكان والمستخدمين (الاسم + اسم المستخدم + الهاتف + الإيميل)
- الكمبوندات (الاسم + العنوان)
- الشركات (الاسم)
- طلبات الصيانة (العنوان + الوصف)
- الفواتير (رقم الفاتورة + اسم السكن)
- الإعلانات (العنوان)
- العقود (الاسم)

يعمل مع كل الأدوار — scope حسب compound_id / company_id.
"""

from fastapi import APIRouter, Query, Depends
from datetime import datetime, timezone
import re

from database import get_db
from auth_deps import get_current_user
from helpers import serialize_datetime

router = APIRouter(prefix="/api")


def _highlight(text: str, q: str) -> str:
    """Wrap matching term in ** for bold display."""
    if not text or not q:
        return text or ""
    return re.sub(f"({re.escape(q)})", r"**\1**", text, flags=re.IGNORECASE)


def _scope_query(current_user: dict) -> dict:
    role = current_user.get("role", "")
    if role in ("app_owner", "super_admin"):
        return {}
    if role == "company_admin" and current_user.get("company_id"):
        return {"company_id": current_user["company_id"]}
    if current_user.get("compound_id"):
        return {"compound_id": current_user["compound_id"]}
    return {}


@router.get("/search")
async def global_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    q = q.strip()
    if not q:
        return {"results": [], "total": 0}

    scope = _scope_query(current_user)
    role = current_user.get("role", "")
    regex = {"$regex": q, "$options": "i"}
    results = []

    # ── 1. Users / Residents ──────────────────────────────────────────────────
    user_query = {
        **scope,
        "$or": [
            {"full_name": regex},
            {"username": regex},
            {"phone": regex},
            {"email": regex},
            {"unit_number": regex},
            {"national_id": regex},
        ]
    }
    users = await db.users.find(user_query, {"_id": 0, "password_hash": 0}).limit(10).to_list(10)
    for u in users:
        role_labels = {
            "resident": "ساكن", "family_head": "رب أسرة", "admin": "مدير",
            "manager": "مشرف", "security": "أمن", "accountant": "محاسب",
            "company_admin": "مدير شركة", "super_admin": "سوبر أدمن",
            "app_owner": "مالك التطبيق",
        }
        results.append({
            "type": "user",
            "icon": "👤",
            "title": u.get("full_name") or u.get("username", ""),
            "subtitle": f"{role_labels.get(u.get('role',''), u.get('role',''))} • {u.get('unit_number', '')} • {u.get('phone', '')}".strip(" •"),
            "id": u.get("id"),
            "href": f"/app/residents",
            "relevance": 10 if q.lower() in (u.get("full_name") or "").lower() else 7,
        })

    # ── 2. Compounds ──────────────────────────────────────────────────────────
    if role in ("app_owner", "super_admin", "company_admin"):
        compound_q = {"$or": [{"name": regex}, {"address": regex}, {"city": regex}]}
        if scope.get("company_id"):
            compound_q = {**compound_q, "$or": [
                {"company_id": scope["company_id"]},
                {"management_company_id": scope["company_id"]},
            ]}
        compounds = await db.compounds.find(compound_q, {"_id": 0}).limit(5).to_list(5)
        for c in compounds:
            results.append({
                "type": "compound",
                "icon": "🏘️",
                "title": c.get("name", ""),
                "subtitle": f"كمبوند • {c.get('address', '')} {c.get('city', '')}".strip(" •"),
                "id": c.get("id"),
                "href": "/app/dashboard",
                "relevance": 9,
            })

    # ── 3. Maintenance Requests ───────────────────────────────────────────────
    maint_q = {**scope, "$or": [{"title": regex}, {"description": regex}, {"unit_number": regex}]}
    maints = await db.maintenance_requests.find(
        maint_q, {"_id": 0, "id": 1, "title": 1, "status": 1, "unit_number": 1, "created_at": 1}
    ).limit(5).to_list(5)
    STATUS_AR = {"pending": "جديد", "in_progress": "قيد التنفيذ", "completed": "مكتمل", "cancelled": "ملغي"}
    for m in maints:
        results.append({
            "type": "maintenance",
            "icon": "🔧",
            "title": m.get("title", ""),
            "subtitle": f"صيانة • وحدة {m.get('unit_number', '')} • {STATUS_AR.get(m.get('status', ''), m.get('status', ''))}",
            "id": m.get("id"),
            "href": "/app/maintenance",
            "relevance": 6,
        })

    # ── 4. Invoices / Payments ────────────────────────────────────────────────
    invoice_q = {**scope, "$or": [{"invoice_number": regex}, {"resident_name": regex}, {"unit_number": regex}]}
    invoices = await db.invoices.find(
        invoice_q, {"_id": 0, "id": 1, "invoice_number": 1, "resident_name": 1, "total_amount": 1, "status": 1}
    ).limit(5).to_list(5)
    for inv in invoices:
        results.append({
            "type": "invoice",
            "icon": "💰",
            "title": f"فاتورة #{inv.get('invoice_number', '')}",
            "subtitle": f"{inv.get('resident_name', '')} • {inv.get('total_amount', 0)} ج.م • {inv.get('status', '')}",
            "id": inv.get("id"),
            "href": "/app/finances",
            "relevance": 5,
        })

    # ── 5. Ads ────────────────────────────────────────────────────────────────
    if role in ("app_owner", "super_admin"):
        ads_q = {"$or": [{"title": regex}, {"description": regex}]}
        ads = await db.internal_ads.find(ads_q, {"_id": 0, "id": 1, "title": 1, "is_active": 1}).limit(3).to_list(3)
        for a in ads:
            results.append({
                "type": "ad",
                "icon": "📢",
                "title": a.get("title", ""),
                "subtitle": f"إعلان • {'نشط' if a.get('is_active') else 'متوقف'}",
                "id": a.get("id"),
                "href": "/app/super-admin?tab=ads",
                "relevance": 4,
            })

    # ── 6. Companies ──────────────────────────────────────────────────────────
    if role in ("app_owner", "super_admin"):
        comp_q = {"$or": [{"name": regex}, {"email": regex}, {"phone": regex}]}
        companies = await db.companies.find(comp_q, {"_id": 0, "id": 1, "name": 1, "plan": 1}).limit(3).to_list(3)
        for co in companies:
            results.append({
                "type": "company",
                "icon": "🏢",
                "title": co.get("name", ""),
                "subtitle": f"شركة • خطة {co.get('plan', '')}",
                "id": co.get("id"),
                "href": "/app/super-admin?tab=companies",
                "relevance": 8,
            })

    # ── 7. Announcements ──────────────────────────────────────────────────────
    ann_q = {**scope, "$or": [{"title": regex}, {"content": regex}]}
    anns = await db.announcements.find(
        ann_q, {"_id": 0, "id": 1, "title": 1, "created_at": 1}
    ).limit(3).to_list(3)
    for a in anns:
        results.append({
            "type": "announcement",
            "icon": "📣",
            "title": a.get("title", ""),
            "subtitle": "إعلان للسكان",
            "id": a.get("id"),
            "href": "/app/announcements",
            "relevance": 4,
        })

    # Sort by relevance
    results.sort(key=lambda x: x.get("relevance", 0), reverse=True)

    return {
        "results": results[:limit],
        "total": len(results),
        "query": q,
    }
