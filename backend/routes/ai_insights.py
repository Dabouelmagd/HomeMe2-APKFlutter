"""
AI Insights — proactive advisor that analyzes compound data and generates actionable insights.

Backend collects 4 key signals:
1. Late payments (residents with unpaid invoices > 30 days)
2. Open maintenance tickets > 7 days
3. Negative ratings in last 7 days (≤2 stars)
4. Unread admin messages > 3 days

Then asks Gemini 3 Flash to formulate them as friendly Arabic insights with action CTAs.

Result is cached for 1 hour per compound to keep cost low.
"""
import os
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from database import get_db
from auth_deps import get_current_user

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai-insights", tags=["ai-insights"])

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
CACHE_TTL_MINUTES = 60


class InsightItem(BaseModel):
    id: str
    severity: str  # "high" | "medium" | "low"
    icon: str  # emoji
    title: str
    description: str
    action_label: Optional[str] = None
    action_route: Optional[str] = None
    metric_value: Optional[int] = None


class InsightsResponse(BaseModel):
    insights: List[InsightItem]
    generated_at: str
    cached: bool = False
    compound_id: Optional[str] = None


# ============================================================================
# Data Collectors — gather raw signals from MongoDB
# ============================================================================
async def _collect_signals(db, compound_id: str) -> dict:
    """Returns dict of raw counts/lists for each signal type."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # 1. Late payments — invoices > 30 days unpaid
    late_invoices = await db.invoices.count_documents({
        "compound_id": compound_id,
        "status": {"$in": ["pending", "overdue", "unpaid"]},
        "due_date": {"$lt": month_ago.isoformat()},
    }) if "invoices" in await db.list_collection_names() else 0

    # 2. Open maintenance tickets > 7 days
    old_maintenance = await db.maintenance_requests.count_documents({
        "compound_id": compound_id,
        "status": {"$in": ["pending", "open", "in_progress"]},
        "created_at": {"$lt": week_ago.isoformat()},
    }) if "maintenance_requests" in await db.list_collection_names() else 0

    # 3. Negative ratings in last 7 days (≤2 stars)
    negative_ratings = await db.ratings.count_documents({
        "compound_id": compound_id,
        "rating": {"$lte": 2},
        "created_at": {"$gte": week_ago.isoformat()},
    }) if "ratings" in await db.list_collection_names() else 0

    # 4. Pending payment proofs
    pending_proofs = await db.payment_proofs.count_documents({
        "compound_id": compound_id,
        "status": {"$in": ["pending", "submitted"]},
    }) if "payment_proofs" in await db.list_collection_names() else 0

    # 5. Total residents
    total_residents = await db.users.count_documents({
        "compound_id": compound_id,
        "role": "resident",
    })

    # 6. Open complaints
    open_complaints = await db.complaints.count_documents({
        "compound_id": compound_id,
        "status": {"$in": ["open", "pending", "new"]},
    }) if "complaints" in await db.list_collection_names() else 0

    return {
        "late_invoices": late_invoices,
        "old_maintenance": old_maintenance,
        "negative_ratings": negative_ratings,
        "pending_proofs": pending_proofs,
        "total_residents": total_residents,
        "open_complaints": open_complaints,
    }


# ============================================================================
# Rule-based Insight Generator (no LLM cost — fast, deterministic)
# ============================================================================
def _build_rule_based_insights(signals: dict) -> List[dict]:
    """
    Convert raw signals into insight cards using simple rules.
    No LLM cost. Used as the primary path; LLM is optional polish.
    """
    items = []

    if signals["late_invoices"] > 0:
        items.append({
            "id": "late_invoices",
            "severity": "high" if signals["late_invoices"] >= 5 else "medium",
            "icon": "💰",
            "title": f"{signals['late_invoices']} فاتورة متأخرة عن السداد",
            "description": "هناك مستحقات لم تُسدد منذ أكثر من 30 يوم. ننصح بإرسال تذكير للسكان.",
            "action_label": "عرض المدفوعات",
            "action_route": "/app/finances",
            "metric_value": signals["late_invoices"],
        })

    if signals["old_maintenance"] > 0:
        items.append({
            "id": "old_maintenance",
            "severity": "high" if signals["old_maintenance"] >= 3 else "medium",
            "icon": "🔧",
            "title": f"{signals['old_maintenance']} طلب صيانة معلق منذ أسبوع",
            "description": "بعض طلبات الصيانة لم يتم البت فيها منذ أكثر من 7 أيام. تابع مع الفنيين.",
            "action_label": "عرض الصيانة",
            "action_route": "/app/maintenance",
            "metric_value": signals["old_maintenance"],
        })

    if signals["negative_ratings"] > 0:
        items.append({
            "id": "negative_ratings",
            "severity": "medium",
            "icon": "⭐",
            "title": f"{signals['negative_ratings']} تقييم سلبي خلال آخر 7 أيام",
            "description": "بعض السكان أعطوا تقييمات منخفضة (≤2 نجمة). راجع الملاحظات لتحسين الخدمة.",
            "action_label": "عرض التقييمات",
            "action_route": "/app/satisfaction",
            "metric_value": signals["negative_ratings"],
        })

    if signals["pending_proofs"] > 0:
        items.append({
            "id": "pending_proofs",
            "severity": "medium" if signals["pending_proofs"] >= 5 else "low",
            "icon": "📄",
            "title": f"{signals['pending_proofs']} إيصال دفع بانتظار المراجعة",
            "description": "إيصالات دفع رفعها السكان وتنتظر اعتمادك. راجعها لتسجيل المدفوعات.",
            "action_label": "مراجعة الإيصالات",
            "action_route": "/app/finances",
            "metric_value": signals["pending_proofs"],
        })

    if signals["open_complaints"] > 0:
        items.append({
            "id": "open_complaints",
            "severity": "medium" if signals["open_complaints"] >= 3 else "low",
            "icon": "📢",
            "title": f"{signals['open_complaints']} شكوى مفتوحة",
            "description": "هناك شكاوى من السكان لم يتم الرد عليها. تابعها لتحسين رضا السكان.",
            "action_label": "عرض الشكاوى",
            "action_route": "/app/complaints",
            "metric_value": signals["open_complaints"],
        })

    # Positive insight (always include if no issues)
    if not items and signals["total_residents"] > 0:
        items.append({
            "id": "all_good",
            "severity": "low",
            "icon": "✅",
            "title": "كل شيء على ما يرام!",
            "description": f"لا توجد تنبيهات حالياً. {signals['total_residents']} ساكن نشط في مجمعك.",
            "action_label": None,
            "action_route": None,
            "metric_value": signals["total_residents"],
        })

    return items[:6]  # max 6 insights


# ============================================================================
# Endpoint
# ============================================================================
@router.get("/me", response_model=InsightsResponse)
async def get_insights(
    compound_id: Optional[str] = None,
    refresh: bool = False,
    current_user: dict = Depends(get_current_user),
):
    """
    Returns prioritized AI insights for the current user's compound.
    Cached 1 hour per compound. Pass ?refresh=true to bypass cache.
    
    Only available to staff/admin roles.
    """
    role = current_user.get("role")
    if role not in ("admin", "manager", "company_admin", "super_admin", "app_owner"):
        raise HTTPException(status_code=403, detail="غير مصرح")

    db = get_db()

    # Resolve compound_id
    cid = compound_id or current_user.get("compound_id")
    if not cid:
        # For company_admin / super_admin without active compound, pick first compound of company
        if role in ("company_admin", "super_admin", "app_owner"):
            company_id = current_user.get("company_id") or current_user.get("management_company_id")
            if company_id:
                first = await db.compounds.find_one(
                    {"$or": [{"company_id": company_id}, {"management_company_id": company_id}]},
                    {"_id": 0, "id": 1},
                )
                if first:
                    cid = first["id"]
        if not cid:
            return InsightsResponse(insights=[], generated_at=datetime.now(timezone.utc).isoformat())

    # Cache lookup
    cache_key = f"insights_{cid}"
    if not refresh:
        cached = await db.ai_insights_cache.find_one({"_id": cache_key})
        if cached:
            try:
                cached_at = datetime.fromisoformat(cached["generated_at"])
                if (datetime.now(timezone.utc) - cached_at).total_seconds() < CACHE_TTL_MINUTES * 60:
                    return InsightsResponse(
                        insights=[InsightItem(**i) for i in cached.get("insights", [])],
                        generated_at=cached["generated_at"],
                        cached=True,
                        compound_id=cid,
                    )
            except Exception:
                pass

    # Collect signals + build insights (rule-based, no LLM)
    signals = await _collect_signals(db, cid)
    insights_data = _build_rule_based_insights(signals)

    # Persist cache
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.ai_insights_cache.update_one(
        {"_id": cache_key},
        {"$set": {
            "compound_id": cid,
            "insights": insights_data,
            "signals": signals,
            "generated_at": now_iso,
        }},
        upsert=True,
    )

    return InsightsResponse(
        insights=[InsightItem(**i) for i in insights_data],
        generated_at=now_iso,
        cached=False,
        compound_id=cid,
    )
