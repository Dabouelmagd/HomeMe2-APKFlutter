"""
AI Assistant — HomeMe expert chatbot (Gemini 3 Flash via Emergent LLM Key).

Features:
- Multi-turn conversation per user (session_id = user_id)
- 20 messages/day rate limit per user
- HomeMe-aware system prompt with deep-link suggestions
- Stores chat history in MongoDB (collection: ai_chat_messages)
"""
import os
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from database import get_db
from auth_deps import get_current_user

load_dotenv()

router = APIRouter(prefix="/api/ai-assistant", tags=["ai-assistant"])

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
DAILY_MESSAGE_LIMIT = 20
MODEL_NAME = "claude-haiku-4-5-20251001"

# ============================================================================
# System Prompt — HomeMe Expert
# ============================================================================
SYSTEM_PROMPT = """أنت "مساعد HomeMe" — خبير ودود ومحترف في تطبيق HomeMe لإدارة المجمعات السكنية.

دورك الأساسي:
1. تجاوب على أسئلة المستخدمين عن كيفية استخدام التطبيق بإيجاز ووضوح.
2. توجّه المستخدم للصفحة الصح داخل التطبيق عبر اقتراح "deep link".
3. تتكلم عربي فصيح بسيط (أو إنجليزي لو المستخدم سأل بالإنجليزي).

ميزات التطبيق الرئيسية وروابطها:
- لوحة التحكم: /app/dashboard
- إدارة الكمبوند (السكان، الوحدات): /app/compound
- قائمة السكان: /app/residents
- إدارة المستخدمين: /app/users
- المدفوعات والإيصالات: /app/payments
- الإدارة المالية (للأدمن): /app/finances
- العقود: /app/contracts
- نظام الصيانة: /app/maintenance
- إدارة الخدمات: /app/services
- حجز المرافق (نادي، حمام سباحة، إلخ): /app/facility-booking
- التقييمات: /app/satisfaction
- مركز الرسائل: /app/messages
- الإشعارات: /app/notifications
- الإعلانات والفعاليات: /app/events
- العائلة وإضافة أفراد: /app/family ، /app/add-family-member
- دعواتي للزوار: /app/my-invites
- تذاكر الزوار: /app/visitor-passes
- مسح تذكرة زائر (للأمن): /app/security-scan
- إدارة الزوار (للأمن/الأدمن): /app/guests
- معرض الصور: /app/gallery
- المستندات: /app/documents
- التصويت/الاستطلاعات: /app/voting
- تقارير PDF: /app/reports
- التحليلات المتقدمة: /app/analytics
- اشتراكي وخطتي: /app/my-subscription
- الشكاوى والاقتراحات: /app/complaints
- مركز المساعدة: /app/help
- تواصل مع الدعم: /app/support
- الإعدادات: /app/settings

إذا اقترحت صفحة، ضع في آخر الرسالة سطر منفصل بهذا الشكل بالضبط (هذا مهم جداً):
ROUTE: /app/<path>

مثال:
المستخدم: "إزاي أرفع إيصال دفع؟"
ردك: "يمكنك رفع إيصال الدفع من صفحة المدفوعات. اضغط على 'رفع إيصال' واختر صورة الإيصال.
ROUTE: /app/payments"

قواعد مهمة:
- لو السؤال خارج نطاق التطبيق (طبخ، رياضة، إلخ)، اعتذر بلطف وذكّر المستخدم إنك مساعد HomeMe فقط.
- لا تخترع ميزات غير موجودة في القائمة أعلاه.
- لا تطلب معلومات شخصية حساسة (كلمات سر، أرقام كروت ائتمان).
- إذا لم تكن متأكداً، اقترح على المستخدم فتح تذكرة دعم: ROUTE: /app/support
- اجعل ردودك قصيرة ومباشرة (3-5 أسطر كحد أقصى).
"""


# ============================================================================
# Models
# ============================================================================
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None  # If not provided, uses user_id


class ChatMessage(BaseModel):
    id: str
    role: str  # "user" | "assistant"
    text: str
    suggested_route: Optional[str] = None
    created_at: str


class ChatResponse(BaseModel):
    reply: str
    suggested_route: Optional[str] = None
    messages_remaining_today: int
    daily_limit: int = DAILY_MESSAGE_LIMIT


class UsageResponse(BaseModel):
    used_today: int
    remaining_today: int
    daily_limit: int = DAILY_MESSAGE_LIMIT


# ============================================================================
# Helpers
# ============================================================================
def _today_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def _count_today_messages(db, user_id: str) -> int:
    return await db.ai_chat_messages.count_documents({
        "user_id": user_id,
        "role": "user",
        "day": _today_key(),
    })


def _extract_route(text: str) -> tuple:
    """Pull 'ROUTE: /app/...' suffix out of LLM reply."""
    match = re.search(r"ROUTE:\s*(/app/[\w\-/?=&]+)\s*$", text.strip(), re.IGNORECASE | re.MULTILINE)
    if match:
        route = match.group(1).strip()
        clean_text = re.sub(r"\n?\s*ROUTE:\s*/app/[\w\-/?=&]+\s*$", "", text, flags=re.IGNORECASE | re.MULTILINE).strip()
        return clean_text, route
    return text.strip(), None


# ============================================================================
# Endpoints
# ============================================================================
@router.get("/usage", response_model=UsageResponse)
async def get_usage(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    used = await _count_today_messages(db, user_id)
    return UsageResponse(
        used_today=used,
        remaining_today=max(0, DAILY_MESSAGE_LIMIT - used),
    )


@router.get("/history")
async def get_history(limit: int = 50, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    cursor = db.ai_chat_messages.find(
        {"user_id": user_id},
        {"_id": 0},
    ).sort("created_at", -1).limit(min(limit, 100))
    items = await cursor.to_list(length=limit)
    items.reverse()
    return {"messages": items}


@router.delete("/history")
async def clear_history(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    await db.ai_chat_messages.delete_many({"user_id": user_id})
    return {"status": "ok"}


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    if not os.environ.get("ANTHROPIC_API_KEY"):
        # Graceful fallback — return helpful message instead of error
        fallback = "مرحباً! خدمة المساعد الذكي غير مفعّلة حالياً. للمساعدة، تواصل مع إدارة الكمبوند أو فريق الدعم الفني عبر الزرار الأخضر 💬"
        now = datetime.now(timezone.utc).isoformat()
        msg = {"id": str(uuid.uuid4()), "role": "assistant", "content": fallback, "route": None, "created_at": now}
        await db.ai_chat_messages.insert_one({**msg, "user_id": current_user["id"], "compound_id": current_user.get("compound_id", "")})
        msg.pop("_id", None)
        return ChatResponse(reply=fallback, route=None, usage_today=1, limit=20)

    db = get_db()
    user_id = current_user["id"]

    # Rate limit check
    used = await _count_today_messages(db, user_id)
    if used >= DAILY_MESSAGE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"وصلت للحد اليومي ({DAILY_MESSAGE_LIMIT} رسالة). جرّب تاني بكره."
        )

    session_id = req.session_id or f"user_{user_id}_{_today_key()}"

    # Build history context (last 10 messages from same session)
    history_cursor = db.ai_chat_messages.find(
        {"user_id": user_id, "session_id": session_id},
        {"_id": 0, "role": 1, "text": 1},
    ).sort("created_at", -1).limit(10)
    history_msgs = await history_cursor.to_list(length=10)
    history_msgs.reverse()

    # Augment system prompt with user role context
    role = current_user.get("role", "resident")
    role_label = {
        "app_owner": "مالك التطبيق",
        "super_admin": "سوبر أدمن",
        "company_admin": "مدير شركة الإدارة",
        "admin": "مدير المجمع",
        "manager": "مدير",
        "security": "موظف أمن",
        "resident": "ساكن",
    }.get(role, "مستخدم")
    augmented_prompt = f"{SYSTEM_PROMPT}\n\nالمستخدم الحالي دوره: {role_label}"

    # Call Anthropic Claude API directly
    try:
        import httpx
        
        # Build messages for multi-turn context
        messages = []
        for m in history_msgs[-6:]:
            messages.append({
                "role": m["role"],  # "user" or "assistant"
                "content": m["text"]
            })
        # Add current message
        messages.append({"role": "user", "content": req.message})

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": os.environ.get("ANTHROPIC_API_KEY", ""),
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 1024,
                    "system": augmented_prompt,
                    "messages": messages,
                }
            )
        
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"AI API error: {resp.text[:200]}")
        
        data = resp.json()
        raw_reply = data.get("content", [{}])[0].get("text", "")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)[:200]}")

    reply_text, suggested_route = _extract_route(raw_reply or "")
    if not reply_text:
        reply_text = "عذراً، لم أتمكن من توليد رد. حاول مرة أخرى."

    now = datetime.now(timezone.utc).isoformat()
    day = _today_key()

    # Persist user msg
    await db.ai_chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_id": session_id,
        "role": "user",
        "text": req.message,
        "day": day,
        "created_at": now,
    })
    # Persist assistant reply
    await db.ai_chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_id": session_id,
        "role": "assistant",
        "text": reply_text,
        "suggested_route": suggested_route,
        "day": day,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return ChatResponse(
        reply=reply_text,
        suggested_route=suggested_route,
        messages_remaining_today=max(0, DAILY_MESSAGE_LIMIT - (used + 1)),
    )
