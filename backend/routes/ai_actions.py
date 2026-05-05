"""
AI Actions — proactive executor that turns insights into actual outbound messages.

Flow:
1. POST /api/ai-actions/draft — backend resolves recipients + asks Gemini 3 Flash to write
   a polite Arabic message for the insight type. Returns preview {message, recipients}.
2. POST /api/ai-actions/execute — admin confirms (and may have edited the message).
   Sends emails via SMTP to all recipients. Logs audit_log entry.

Rate limit: 5 executes/hour per admin to prevent abuse.
"""
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from database import get_db
from auth_deps import get_current_user
from email_service import email_service

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai-actions", tags=["ai-actions"])

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
HOURLY_EXECUTE_LIMIT = 5

# ============================================================================
# Action Types Catalog
# ============================================================================
ACTION_CATALOG = {
    "late_invoices": {
        "title": "تذكير دفع للمتأخرين",
        "tone": "ودود ومحترم لتذكير السكان بسداد المستحقات المتأخرة",
        "subject": "تذكير ودي بسداد المستحقات - HomeMe",
    },
    "old_maintenance": {
        "title": "تنبيه الفنيين بطلبات الصيانة المعلقة",
        "tone": "احترافي وعاجل لتنبيه الفنيين بمتابعة طلبات الصيانة المعلقة",
        "subject": "متابعة طلبات الصيانة المعلقة - HomeMe",
    },
    "negative_ratings": {
        "title": "رسالة اعتذار للسكان الذين أعطوا تقييماً منخفضاً",
        "tone": "متعاطف ومهني، نعتذر للساكن ونعده بتحسين الخدمة",
        "subject": "نقدّر ملاحظاتك ونعمل على تحسين الخدمة - HomeMe",
    },
}


# ============================================================================
# Models
# ============================================================================
class Recipient(BaseModel):
    user_id: str
    name: str
    email: str
    extra: Optional[str] = None  # e.g. "5,000 جنيه متأخرة" or "تقييم: 2 نجوم"


class DraftRequest(BaseModel):
    insight_id: Literal["late_invoices", "old_maintenance", "negative_ratings"]
    compound_id: str = Field(..., min_length=1)


class DraftResponse(BaseModel):
    insight_id: str
    title: str
    subject: str
    message: str
    recipients: List[Recipient]


class ExecuteRequest(BaseModel):
    insight_id: Literal["late_invoices", "old_maintenance", "negative_ratings"]
    compound_id: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)
    recipient_user_ids: List[str] = Field(..., min_items=1, max_items=200)


class ExecuteResponse(BaseModel):
    sent: int
    failed: int
    failed_emails: List[str]


# ============================================================================
# Recipient Resolvers
# ============================================================================
async def _resolve_recipients(db, insight_id: str, compound_id: str) -> List[Recipient]:
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    if insight_id == "late_invoices":
        # Find users with overdue invoices
        invoices = await db.invoices.find(
            {
                "compound_id": compound_id,
                "status": {"$in": ["pending", "overdue", "unpaid"]},
                "due_date": {"$lt": month_ago.isoformat()},
            },
            {"_id": 0, "user_id": 1, "amount": 1},
        ).to_list(length=500)
        # Group by user_id, sum amount
        owed = {}
        for inv in invoices:
            uid = inv.get("user_id")
            if not uid:
                continue
            owed[uid] = owed.get(uid, 0) + float(inv.get("amount") or 0)
        if not owed:
            return []
        users = await db.users.find(
            {"id": {"$in": list(owed.keys())}, "is_active": True},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1},
        ).to_list(length=500)
        return [
            Recipient(
                user_id=u["id"],
                name=u.get("full_name") or "ساكن",
                email=u.get("email") or "",
                extra=f"{int(owed[u['id']]):,} جنيه متأخرة",
            )
            for u in users
            if u.get("email")
        ]

    if insight_id == "old_maintenance":
        # Recipients = admins/managers in this compound
        users = await db.users.find(
            {
                "compound_id": compound_id,
                "role": {"$in": ["admin", "manager"]},
                "is_active": True,
            },
            {"_id": 0, "id": 1, "full_name": 1, "email": 1},
        ).to_list(length=50)
        # Count pending tickets (for context in the email)
        pending_count = await db.maintenance_requests.count_documents({
            "compound_id": compound_id,
            "status": {"$in": ["pending", "open", "in_progress"]},
            "created_at": {"$lt": week_ago.isoformat()},
        })
        return [
            Recipient(
                user_id=u["id"],
                name=u.get("full_name") or "مدير",
                email=u.get("email") or "",
                extra=f"{pending_count} طلب معلق",
            )
            for u in users
            if u.get("email")
        ]

    if insight_id == "negative_ratings":
        # Users who rated ≤2 in last 7 days
        ratings = await db.ratings.find(
            {
                "compound_id": compound_id,
                "rating": {"$lte": 2},
                "created_at": {"$gte": week_ago.isoformat()},
            },
            {"_id": 0, "user_id": 1, "rating": 1, "comment": 1},
        ).to_list(length=200)
        if not ratings:
            return []
        # Dedupe by user_id, keep lowest rating
        per_user = {}
        for r in ratings:
            uid = r.get("user_id")
            if not uid:
                continue
            cur = per_user.get(uid)
            if not cur or r["rating"] < cur["rating"]:
                per_user[uid] = r
        users = await db.users.find(
            {"id": {"$in": list(per_user.keys())}, "is_active": True},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1},
        ).to_list(length=200)
        return [
            Recipient(
                user_id=u["id"],
                name=u.get("full_name") or "ساكن",
                email=u.get("email") or "",
                extra=f"تقييم: {per_user[u['id']]['rating']} نجوم",
            )
            for u in users
            if u.get("email")
        ]

    return []


# ============================================================================
# LLM Message Generation
# ============================================================================
async def _generate_message(insight_id: str, recipient_count: int, compound_name: Optional[str]) -> str:
    """Ask Gemini to draft a polite Arabic message for the insight type."""
    if not EMERGENT_LLM_KEY:
        # Fallback: static templates
        return _fallback_message(insight_id, recipient_count, compound_name)

    cat = ACTION_CATALOG[insight_id]
    compound_line = f"المجمع: {compound_name}" if compound_name else ""

    prompt = f"""اكتب رسالة بريد إلكتروني بالعربية الفصحى البسيطة لـ {recipient_count} شخص.
الموضوع: {cat['title']}
النبرة: {cat['tone']}
{compound_line}

شروط:
- ابدأ بـ "السلام عليكم،" أو "تحية طيبة،"
- استخدم اسم المستلم بشكل عام مثل "عزيزي الساكن" أو "عزيزي الفني" (سيتم استبدالها لاحقاً بالاسم الفعلي عبر متغير {{name}}).
- الجسم 3-4 أسطر فقط (لا أطول).
- اختم بـ "مع خالص الشكر،" ثم سطر "إدارة المجمع - HomeMe".
- لا تضع أي بريد إلكتروني أو رقم هاتف وهمي.
- لا تستخدم emoji.
- لا تذكر مبالغ مالية محددة (سيتم إضافتها لاحقاً عبر متغير {{extra}} إن لزم).

ابدأ مباشرة بالرسالة بدون أي مقدمة منك."""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"action_{insight_id}_{datetime.now(timezone.utc).timestamp()}",
            system_message="أنت كاتب محترف لرسائل بريد إلكتروني عربية مهذبة وقصيرة.",
        ).with_model("gemini", "gemini-3-flash-preview")
        resp = await chat.send_message(UserMessage(text=prompt))
        return (resp or "").strip() or _fallback_message(insight_id, recipient_count, compound_name)
    except Exception as e:
        logger.warning(f"AI message generation failed: {e}")
        return _fallback_message(insight_id, recipient_count, compound_name)


def _fallback_message(insight_id: str, count: int, compound_name: Optional[str]) -> str:
    suffix = f"\nمع خالص الشكر،\nإدارة المجمع{f' - {compound_name}' if compound_name else ''} - HomeMe"
    if insight_id == "late_invoices":
        return (
            "السلام عليكم عزيزي الساكن {name},\n\n"
            "نذكّركم بسداد المستحقات المتأخرة عن مجمعكم السكني. حضوركم وسدادكم في الموعد يساعدنا في تقديم خدمة أفضل.\n"
            "يمكنكم سداد المستحقات من خلال صفحة المدفوعات في تطبيق HomeMe.\n"
            f"{suffix}"
        )
    if insight_id == "old_maintenance":
        return (
            "تحية طيبة {name},\n\n"
            "نلاحظ وجود طلبات صيانة معلقة منذ أكثر من أسبوع. نرجو متابعتها مع الفنيين في أقرب وقت لتلبية احتياجات السكان.\n"
            f"{suffix}"
        )
    if insight_id == "negative_ratings":
        return (
            "عزيزي الساكن {name},\n\n"
            "وصلنا تقييمكم وتعليقكم، ونعتذر إن لم تكن الخدمة بمستوى توقعاتكم. نأخذ ملاحظاتكم بجدية ونعمل على تحسين الخدمة.\n"
            "نرحّب بأي تفاصيل إضافية لمساعدتنا في الوصول للحل الأفضل لكم.\n"
            f"{suffix}"
        )
    return "رسالة من إدارة HomeMe."


# ============================================================================
# Rate Limiting
# ============================================================================
async def _check_rate_limit(db, user_id: str):
    hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    count = await db.ai_action_log.count_documents({
        "actor_id": user_id,
        "type": "execute",
        "created_at": {"$gte": hour_ago.isoformat()},
    })
    if count >= HOURLY_EXECUTE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"وصلت للحد الأقصى ({HOURLY_EXECUTE_LIMIT} إجراءات/ساعة). جرّب لاحقاً.",
        )


def _require_admin_role(current_user: dict):
    role = current_user.get("role")
    if role not in ("admin", "manager", "company_admin", "super_admin", "app_owner"):
        raise HTTPException(status_code=403, detail="غير مصرح")


# ============================================================================
# Endpoints
# ============================================================================
@router.post("/draft", response_model=DraftResponse)
async def draft_action(req: DraftRequest, current_user: dict = Depends(get_current_user)):
    """Generate a draft email for an insight: returns recipients + AI-written message."""
    _require_admin_role(current_user)
    db = get_db()

    recipients = await _resolve_recipients(db, req.insight_id, req.compound_id)
    if not recipients:
        raise HTTPException(status_code=404, detail="لا يوجد مستلمين مؤهلين لهذا الإجراء")

    compound = await db.compounds.find_one(
        {"id": req.compound_id}, {"_id": 0, "name": 1}
    )
    compound_name = (compound or {}).get("name")

    cat = ACTION_CATALOG[req.insight_id]
    message = await _generate_message(req.insight_id, len(recipients), compound_name)

    # Audit-log the draft (no PII besides counts)
    await db.ai_action_log.insert_one({
        "actor_id": current_user["id"],
        "actor_name": current_user.get("full_name"),
        "type": "draft",
        "insight_id": req.insight_id,
        "compound_id": req.compound_id,
        "recipient_count": len(recipients),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return DraftResponse(
        insight_id=req.insight_id,
        title=cat["title"],
        subject=cat["subject"],
        message=message,
        recipients=recipients,
    )


def _personalize(template: str, recipient: Recipient) -> str:
    return (
        template
        .replace("{name}", recipient.name)
        .replace("{extra}", recipient.extra or "")
    )


def _wrap_html(body_text: str, subject: str) -> str:
    """Wrap plain Arabic text in a clean RTL HTML email shell."""
    paragraphs = "".join(
        f'<p style="margin:0 0 12px;color:#374151;line-height:1.8;">{line}</p>'
        for line in body_text.strip().split("\n") if line.strip()
    )
    return f"""<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
        <tr><td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:24px 28px;text-align:center;color:#fff;">
          <h1 style="margin:0;font-size:18px;font-weight:700;">🏠 HomeMe</h1>
        </td></tr>
        <tr><td style="padding:28px;text-align:right;">{paragraphs}</td></tr>
        <tr><td style="background:#f9fafb;padding:14px 28px;text-align:center;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:11px;">
          منصة إدارة المجمعات السكنية الذكية
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


@router.post("/execute", response_model=ExecuteResponse)
async def execute_action(req: ExecuteRequest, current_user: dict = Depends(get_current_user)):
    """Send the (possibly edited) email to all selected recipients via SMTP."""
    _require_admin_role(current_user)
    db = get_db()
    await _check_rate_limit(db, current_user["id"])

    # Validate placeholder safety (reject scripts)
    if "<script" in req.message.lower() or "<iframe" in req.message.lower():
        raise HTTPException(status_code=400, detail="نص الرسالة يحتوي على HTML غير مسموح")

    # Re-resolve recipients to ensure we only send to valid users (no spoofing)
    all_recipients = await _resolve_recipients(db, req.insight_id, req.compound_id)
    by_id = {r.user_id: r for r in all_recipients}
    selected = [by_id[uid] for uid in req.recipient_user_ids if uid in by_id]
    if not selected:
        raise HTTPException(status_code=400, detail="لا يوجد مستلمين صالحين")

    sent = 0
    failed = 0
    failed_emails: List[str] = []
    for r in selected:
        try:
            personalized = _personalize(req.message, r)
            html = _wrap_html(personalized, req.subject)
            ok = await email_service.send_email(r.email, req.subject, html)
            if ok:
                sent += 1
            else:
                failed += 1
                failed_emails.append(r.email)
        except Exception as e:
            failed += 1
            failed_emails.append(r.email)
            logger.error(f"AI action email to {r.email} failed: {e}")

    # Audit log
    await db.ai_action_log.insert_one({
        "actor_id": current_user["id"],
        "actor_name": current_user.get("full_name"),
        "type": "execute",
        "insight_id": req.insight_id,
        "compound_id": req.compound_id,
        "subject": req.subject,
        "recipient_count": len(selected),
        "sent": sent,
        "failed": failed,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Invalidate insight cache so dashboard shows updated state
    await db.ai_insights_cache.delete_one({"_id": f"insights_{req.compound_id}"})

    return ExecuteResponse(sent=sent, failed=failed, failed_emails=failed_emails)
