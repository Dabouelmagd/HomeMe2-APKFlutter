"""
Blog Routes — Comments + CMS posts + AI SEO suggestions.

Comments:
- POST /api/blog/comments               (public; submission queued for moderation)
- GET  /api/blog/posts/{slug}/comments  (public; returns approved comments only)
- GET  /api/super-admin/blog/comments   (super_admin; full moderation queue)
- PATCH /api/super-admin/blog/comments/{id}   (super_admin; approve/reject)
- DELETE /api/super-admin/blog/comments/{id}  (super_admin; permanent delete)

CMS Posts:
- GET /api/blog/posts                   (public; returns all published DB posts; hardcoded ones are merged on the frontend)
- POST /api/super-admin/blog/posts      (super_admin; create draft/published post)
- PATCH /api/super-admin/blog/posts/{slug}  (super_admin; update)
- DELETE /api/super-admin/blog/posts/{slug} (super_admin; delete)

AI:
- POST /api/super-admin/blog/ai-seo-suggest  (super_admin; Gemini 3 Flash refines title/excerpt/keywords)
"""
import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from auth_deps import get_current_user
from database import get_db

logger = logging.getLogger(__name__)
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

router = APIRouter(prefix="/api", tags=["blog"])


# ---------------------------- Pydantic Models ---------------------------- #

class CommentSubmission(BaseModel):
    post_slug: str = Field(..., min_length=1, max_length=200)
    name: str = Field(..., min_length=2, max_length=80)
    email: Optional[EmailStr] = None
    content: str = Field(..., min_length=4, max_length=2000)


class CommentModerationAction(BaseModel):
    action: str  # "approve" | "reject"


class BlogPostInput(BaseModel):
    title: str = Field(..., min_length=4, max_length=200)
    slug: Optional[str] = None  # auto-generated if missing
    excerpt: str = Field(..., min_length=10, max_length=400)
    body: str = Field(..., min_length=100)
    category: str = Field(..., min_length=2, max_length=50)
    author: str = Field("فريق HomeMe", min_length=2, max_length=80)
    cover: str = Field(..., min_length=8)
    reading_minutes: int = Field(5, ge=1, le=60)
    keywords: list[str] = Field(default_factory=list)
    published: bool = True


# ---------------------------- Helpers ---------------------------- #

def _slugify(text: str) -> str:
    """Simple slug generator that preserves Arabic and Latin letters/digits."""
    text = text.strip().lower()
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"[^\w\u0600-\u06ff-]", "", text)
    return text[:120] or f"post-{uuid.uuid4().hex[:6]}"


def _doc_to_comment(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "post_slug": doc["post_slug"],
        "name": doc["name"],
        "email": doc.get("email"),
        "content": doc["content"],
        "status": doc.get("status", "pending"),
        "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


def _doc_to_post(doc: dict) -> dict:
    return {
        "slug": doc["slug"],
        "title": doc["title"],
        "excerpt": doc["excerpt"],
        "body": doc["body"],
        "category": doc["category"],
        "author": doc.get("author", "فريق HomeMe"),
        "cover": doc["cover"],
        "reading_minutes": doc.get("reading_minutes", 5),
        "keywords": doc.get("keywords", []),
        "published": doc.get("published", True),
        "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
        "date": doc.get("date", doc["created_at"].strftime("%Y-%m-%d") if isinstance(doc.get("created_at"), datetime) else None),
    }


def _ensure_super_admin(current_user: dict):
    role = current_user.get("role")
    if role not in ("super_admin", "app_owner"):
        raise HTTPException(403, "Only super_admin can perform this action")


# ---------------------------- Public Comments ---------------------------- #

@router.post("/blog/comments", status_code=201)
async def submit_comment(payload: CommentSubmission, request: Request):
    """Public endpoint. Anyone can submit; comments are held for moderation."""
    db = get_db()

    # Basic spam guard: same IP cannot submit > 5 comments in 10 min
    client_ip = request.client.host if request.client else "unknown"
    ten_min_ago = datetime.now(timezone.utc).timestamp() - 600
    recent = await db.blog_comments.count_documents({
        "submitter_ip": client_ip,
        "created_at_ts": {"$gt": ten_min_ago},
    })
    if recent >= 5:
        raise HTTPException(429, "Too many submissions; please wait before commenting again.")

    now = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()),
        "post_slug": payload.post_slug,
        "name": payload.name.strip(),
        "email": payload.email,
        "content": payload.content.strip(),
        "status": "pending",
        "submitter_ip": client_ip,
        "created_at": now,
        "created_at_ts": now.timestamp(),
    }
    await db.blog_comments.insert_one(doc)
    return {
        "id": doc["id"],
        "status": "pending",
        "message": "تم استلام تعليقك وسيظهر بعد المراجعة.",
    }


@router.get("/blog/posts/{slug}/comments")
async def list_post_comments(slug: str):
    """Public: returns only approved comments for a post."""
    db = get_db()
    cursor = db.blog_comments.find(
        {"post_slug": slug, "status": "approved"},
        {"_id": 0, "submitter_ip": 0, "created_at_ts": 0},
    ).sort("created_at", 1)
    docs = await cursor.to_list(500)
    return {"comments": [_doc_to_comment(d) for d in docs]}


# ---------------------------- Super-Admin Comment Moderation ---------------------------- #

@router.get("/super-admin/blog/comments")
async def admin_list_comments(
    status: str = "pending",
    current_user: dict = Depends(get_current_user),
):
    """Moderation queue. status=pending|approved|rejected|all"""
    _ensure_super_admin(current_user)
    db = get_db()
    query = {} if status == "all" else {"status": status}
    cursor = db.blog_comments.find(query, {"_id": 0, "submitter_ip": 0, "created_at_ts": 0}).sort("created_at", -1)
    docs = await cursor.to_list(500)
    return {"comments": [_doc_to_comment(d) for d in docs]}


@router.patch("/super-admin/blog/comments/{comment_id}")
async def admin_moderate_comment(
    comment_id: str,
    payload: CommentModerationAction,
    current_user: dict = Depends(get_current_user),
):
    _ensure_super_admin(current_user)
    if payload.action not in ("approve", "reject"):
        raise HTTPException(400, "action must be 'approve' or 'reject'")
    new_status = "approved" if payload.action == "approve" else "rejected"
    db = get_db()
    result = await db.blog_comments.update_one(
        {"id": comment_id},
        {"$set": {"status": new_status, "moderated_at": datetime.now(timezone.utc), "moderated_by": current_user["id"]}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Comment not found")
    return {"id": comment_id, "status": new_status}


@router.delete("/super-admin/blog/comments/{comment_id}")
async def admin_delete_comment(
    comment_id: str,
    current_user: dict = Depends(get_current_user),
):
    _ensure_super_admin(current_user)
    db = get_db()
    result = await db.blog_comments.delete_one({"id": comment_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Comment not found")
    return {"deleted": True}


# ---------------------------- Public Posts ---------------------------- #

@router.get("/blog/posts")
async def list_blog_posts():
    """Public: returns all DB-stored, published blog posts. The frontend merges
    these with the hardcoded `blogPosts.js` posts so existing 10 articles are
    always available even without a DB."""
    db = get_db()
    cursor = db.blog_posts.find({"published": True}, {"_id": 0}).sort("created_at", -1)
    docs = await cursor.to_list(500)
    return {"posts": [_doc_to_post(d) for d in docs]}


@router.get("/blog/posts/{slug}")
async def get_blog_post(slug: str):
    db = get_db()
    doc = await db.blog_posts.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Post not found")
    return _doc_to_post(doc)


# ---------------------------- Super-Admin CMS ---------------------------- #

@router.get("/super-admin/blog/posts")
async def admin_list_posts(current_user: dict = Depends(get_current_user)):
    _ensure_super_admin(current_user)
    db = get_db()
    cursor = db.blog_posts.find({}, {"_id": 0}).sort("created_at", -1)
    docs = await cursor.to_list(500)
    return {"posts": [_doc_to_post(d) for d in docs]}


@router.post("/super-admin/blog/posts", status_code=201)
async def admin_create_post(payload: BlogPostInput, current_user: dict = Depends(get_current_user)):
    _ensure_super_admin(current_user)
    db = get_db()
    slug = payload.slug or _slugify(payload.title)
    existing = await db.blog_posts.find_one({"slug": slug})
    if existing:
        raise HTTPException(409, f"Post with slug '{slug}' already exists")

    now = datetime.now(timezone.utc)
    doc = {
        "slug": slug,
        "title": payload.title.strip(),
        "excerpt": payload.excerpt.strip(),
        "body": payload.body,
        "category": payload.category.strip(),
        "author": payload.author.strip(),
        "cover": payload.cover.strip(),
        "reading_minutes": payload.reading_minutes,
        "keywords": payload.keywords,
        "published": payload.published,
        "created_at": now,
        "date": now.strftime("%Y-%m-%d"),
        "created_by": current_user["id"],
    }
    await db.blog_posts.insert_one(doc)
    return _doc_to_post(doc)


@router.patch("/super-admin/blog/posts/{slug}")
async def admin_update_post(slug: str, payload: BlogPostInput, current_user: dict = Depends(get_current_user)):
    _ensure_super_admin(current_user)
    db = get_db()
    update_doc = {
        "title": payload.title.strip(),
        "excerpt": payload.excerpt.strip(),
        "body": payload.body,
        "category": payload.category.strip(),
        "author": payload.author.strip(),
        "cover": payload.cover.strip(),
        "reading_minutes": payload.reading_minutes,
        "keywords": payload.keywords,
        "published": payload.published,
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.blog_posts.update_one({"slug": slug}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(404, "Post not found")
    return {"slug": slug, "updated": True}


@router.delete("/super-admin/blog/posts/{slug}")
async def admin_delete_post(slug: str, current_user: dict = Depends(get_current_user)):
    _ensure_super_admin(current_user)
    db = get_db()
    result = await db.blog_posts.delete_one({"slug": slug})
    if result.deleted_count == 0:
        raise HTTPException(404, "Post not found")
    # Cascade delete its comments
    await db.blog_comments.delete_many({"post_slug": slug})
    return {"deleted": True}


# ---------------------------- AI SEO Suggestion ---------------------------- #

class AISuggestionInput(BaseModel):
    title: str = Field(..., min_length=4)
    body: str = Field(..., min_length=50)
    category: Optional[str] = None


@router.post("/super-admin/blog/ai-seo-suggest")
async def ai_seo_suggest(payload: AISuggestionInput, current_user: dict = Depends(get_current_user)):
    """Uses Gemini 3 Flash to suggest SEO improvements for a draft article.
    Returns: { title (improved), excerpt, keywords[], category, reading_minutes }
    """
    _ensure_super_admin(current_user)

    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "AI service is not configured. Set EMERGENT_LLM_KEY.")

    # Truncate body to avoid token bloat — first 4000 chars are enough for SEO context.
    body_excerpt = payload.body[:4000]

    prompt = f"""أنت خبير SEO وكاتب محتوى محترف للمدوّنات العربية المتخصصة في إدارة المجمعات السكنية.

المقال المسوّدة:
العنوان الحالي: {payload.title}
التصنيف المقترح: {payload.category or 'غير محدد'}

نص المقال (مقتطف):
{body_excerpt}

مهمتك: تحليل المسوّدة وإرجاع تحسينات SEO. أرجع **JSON صالح فقط** بالشكل التالي بدون أي نص آخر قبله أو بعده:

{{
  "title": "عنوان محسّن جاذب ومُحسّن للبحث (50-65 حرفًا)، يبدأ بفائدة أو رقم لو ممكن",
  "excerpt": "ملخّص جذّاب لـ meta description (140-160 حرفًا) يجعل القارئ يضغط",
  "keywords": ["كلمة مفتاحية 1", "كلمة 2", "كلمة 3", "كلمة 4", "كلمة 5"],
  "category": "أحد التصنيفات التالية فقط: إدارة | المالية | الأمن | تجربة المستخدم | التحول الرقمي",
  "reading_minutes": رقم_صحيح_بين_3_و_15
}}

ملاحظات مهمة:
- العنوان يجب أن يحتوي على كلمة مفتاحية أساسية بشكل طبيعي.
- الكلمات المفتاحية يجب أن تكون عبارات يبحث عنها مديرو الكمباوندات فعلًا (long-tail keywords).
- الملخّص يجب ألا يحتوي على ".." أو "؟" في النهاية.

أرجع JSON فقط بدون أي شرح."""

    try:
        from homeme_integrations.llm.chat import LlmChat, UserMessage  # type: ignore
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"blog_seo_{datetime.now(timezone.utc).timestamp()}",
            system_message="أنت خبير SEO وكاتب محتوى متخصص في المدوّنات العربية. ترجع JSON صالح فقط.",
        ).with_model("gemini", "gemini-3-flash-preview")
        resp = await chat.send_message(UserMessage(text=prompt))
        raw = (resp or "").strip()

        # Strip markdown fences if the model returned them anyway
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()

        try:
            suggestion = json.loads(raw)
        except json.JSONDecodeError:
            # Try to extract the first JSON object from the response
            m = re.search(r"\{.*\}", raw, flags=re.DOTALL)
            if not m:
                raise HTTPException(502, "AI returned a non-JSON response. Try again.")
            suggestion = json.loads(m.group(0))

        # Sanitize / normalize
        allowed_categories = {"إدارة", "المالية", "الأمن", "تجربة المستخدم", "التحول الرقمي"}
        category = suggestion.get("category")
        if category not in allowed_categories:
            category = payload.category if payload.category in allowed_categories else "إدارة"

        return {
            "title": str(suggestion.get("title") or payload.title).strip()[:200],
            "excerpt": str(suggestion.get("excerpt") or "").strip()[:300],
            "keywords": [str(k).strip() for k in (suggestion.get("keywords") or [])][:8],
            "category": category,
            "reading_minutes": int(suggestion.get("reading_minutes") or 5),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"AI SEO suggest failed: {e}")
        raise HTTPException(502, f"AI service error: {str(e)[:200]}")


@router.post("/super-admin/blog/trigger-now")
async def trigger_blog_now(current_user: dict = Depends(get_current_user)):
    """Owner: manually trigger blog post generation (for testing)."""
    _ensure_super_admin(current_user)
    from blog_scheduler import publish_daily_post
    from database import get_db as _get_db
    db = _get_db()
    result = await publish_daily_post(db)
    if result:
        return {"success": True, "post": {"title": result.get("title"), "slug": result.get("slug")}}
    return {"success": False, "message": "تأكد من إعداد ANTHROPIC_API_KEY في بيئة التشغيل"}

