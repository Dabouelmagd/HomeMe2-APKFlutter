"""
Daily Blog Post Scheduler — HomeMe
Runs every day at 09:00 Cairo time
Uses Claude AI (Anthropic) to generate Arabic blog posts
"""
import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
import httpx

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CAIRO_TZ_OFFSET = 2  # UTC+2 (Egypt Standard Time)

BLOG_TOPICS = [
    "نصائح إدارة المجمعات السكنية والتعامل مع السكان",
    "كيفية تحسين التحصيل المالي في المجمعات السكنية",
    "أهمية الأمن والسلامة في المجمعات السكنية",
    "كيف يُحسّن الذكاء الاصطناعي إدارة العقارات",
    "إدارة طلبات الصيانة بكفاءة في الكمبوندات",
    "أفضل ممارسات التواصل بين الإدارة والسكان",
    "التحول الرقمي في إدارة المجمعات السكنية",
    "نظام الزوار الإلكتروني وفوائده الأمنية",
    "إدارة الميزانية وتوزيع المصروفات في الكمبوندات",
    "أحدث اتجاهات العقارات السكنية في مصر 2026",
    "كيفية اختيار نظام إدارة المجمع السكني المناسب",
    "فوائد تطبيقات إدارة المجمعات للسكان والمديرين",
    "كيف تخفض تكاليف صيانة المجمعات السكنية",
    "أهمية رضا السكان في نجاح المجمعات السكنية",
    "مستقبل المجمعات السكنية الذكية في مصر",
    "إدارة العمال والصنايعية في الكمبوندات بكفاءة",
    "حماية خصوصية بيانات السكان في الأنظمة الرقمية",
    "نصائح للتعامل مع الشكاوى والاقتراحات في المجمعات",
    "كيف تُحقق شركات إدارة العقارات أعلى عائد",
    "دور المساحات الإعلانية في تمويل المجمعات السكنية",
    "الاستدامة البيئية في المجمعات السكنية الحديثة",
    "كيف تبني مجتمعاً متماسكاً داخل المجمعات السكنية",
    "أفضل طرق تحصيل الخدمات والفواتير من السكان",
    "دليل الشركات لإدارة عدة مجمعات بكفاءة",
    "تأثير جودة الصيانة على قيمة العقارات السكنية",
    "كيف تختار عمال ومزودين موثوقين لمجمعك السكني",
    "دور التقارير المالية في صنع القرار الإداري",
    "مزايا الدفع الإلكتروني في المجمعات السكنية",
    "كيف تدير الفعاليات والأحداث في الكمبوند",
    "نصائح لإدارة الوحدات السكنية الفارغة والإيجارات",
]

USED_TOPICS_KEY = "blog_used_topics"


async def get_unused_topic(db) -> str:
    """Pick a topic not used recently."""
    used_doc = await db.blog_scheduler_state.find_one({"_id": "topics"})
    used = used_doc.get("used", []) if used_doc else []
    # Reset if all used
    if len(used) >= len(BLOG_TOPICS):
        used = []
    remaining = [t for t in BLOG_TOPICS if t not in used]
    import random
    topic = random.choice(remaining)
    # Save
    await db.blog_scheduler_state.update_one(
        {"_id": "topics"},
        {"$set": {"used": used + [topic], "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return topic


async def generate_blog_post(topic: str) -> dict | None:
    """Generate a blog post using Claude AI."""
    if not ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set — skipping blog generation")
        return None

    prompt = f"""اكتب مقالة مدونة احترافية باللغة العربية عن: "{topic}"

المقالة يجب أن:
- تكون بين 600-900 كلمة
- تحتوي على مقدمة جذابة، 4-5 نقاط رئيسية مع عناوين فرعية، وخاتمة
- تُذكر HomeMe كحل متكامل لإدارة المجمعات السكنية بشكل طبيعي
- تكون عملية ومفيدة للقراء في مصر والعالم العربي
- أسلوبها واضح ومهني

أعطني الرد بتنسيق JSON بالضبط:
{{
  "title": "عنوان المقالة",
  "excerpt": "ملخص قصير 2-3 جمل",
  "content": "محتوى المقالة الكامل بتنسيق HTML بسيط (h2, p, ul, li)",
  "tags": ["وسم1", "وسم2", "وسم3"],
  "seo_keywords": "كلمات مفتاحية للسيو",
  "read_time": 5
}}

أعطني JSON فقط بدون أي نص إضافي."""

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5",
                    "max_tokens": 2000,
                    "messages": [{"role": "user", "content": prompt}],
                }
            )
            data = resp.json()
            raw = data["content"][0]["text"].strip()
            # Clean JSON
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            import json
            post_data = json.loads(raw.strip())
            return post_data
    except Exception as e:
        logger.error(f"Blog generation error: {e}")
        return None


def slugify_ar(title: str) -> str:
    """Create URL-safe slug from Arabic title."""
    import re
    slug = re.sub(r'[^\w\s-]', '', title, flags=re.UNICODE)
    slug = re.sub(r'[\s_-]+', '-', slug)
    slug = slug.strip('-')
    # Add timestamp for uniqueness
    ts = datetime.now().strftime('%Y%m%d')
    return f"post-{ts}-{str(uuid.uuid4())[:8]}"


async def publish_daily_post(db):
    """Main function: generate + save + notify."""
    logger.info("📝 Starting daily blog post generation...")

    topic = await get_unused_topic(db)
    logger.info(f"Topic: {topic}")

    post_data = await generate_blog_post(topic)
    if not post_data:
        logger.error("Failed to generate blog post")
        return

    now = datetime.now(timezone.utc).isoformat()
    slug = slugify_ar(post_data.get("title", topic))

    doc = {
        "id": str(uuid.uuid4()),
        "slug": slug,
        "title": post_data.get("title", topic),
        "excerpt": post_data.get("excerpt", ""),
        "content": post_data.get("content", ""),
        "tags": post_data.get("tags", ["إدارة المجمعات"]),
        "seo_keywords": post_data.get("seo_keywords", ""),
        "read_time": post_data.get("read_time", 5),
        "author": "HomeMe AI",
        "author_avatar": "/homeme-logo.png",
        "published": True,
        "created_at": now,
        "published_at": now,
        "category": "إدارة المجمعات",
        "cover_image": f"https://homemeapp.net/images/blog-{datetime.now().strftime('%m')}.jpg",
        "source": "ai_auto",
        "topic": topic,
    }

    await db.blog_posts.insert_one(doc)
    logger.info(f"✅ Blog post saved: {doc['title']}")

    # Send push notifications to all FCM tokens
    try:
        fcm_tokens = await db.fcm_tokens.find(
            {"active": True}, {"_id": 0, "token": 1}
        ).to_list(10000)

        tokens = [t["token"] for t in fcm_tokens if t.get("token")]
        if tokens:
            logger.info(f"Sending blog notification to {len(tokens)} devices")
            # Store notification for display in app
            await db.notifications.insert_many([{
                "id": str(uuid.uuid4()),
                "type": "new_blog_post",
                "title": "مقالة جديدة على المدونة 📖",
                "body": doc["title"],
                "data": {"slug": slug, "url": f"/blog/{slug}"},
                "read": False,
                "created_at": now,
            }])
    except Exception as e:
        logger.error(f"Notification error: {e}")

    logger.info("✅ Daily blog post published successfully")
    return doc


async def run_blog_scheduler(db):
    """Run forever — publishes at 09:00 Cairo time daily."""
    logger.info("🕒 Blog scheduler started")

    # Check if today's post already exists — if not, publish immediately
    try:
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        existing = await db.blog_posts.find_one(
            {"published_at": {"$gte": today}},
            {"_id": 0, "id": 1}
        )
        if not existing:
            logger.info("📝 No post for today — publishing immediately on startup")
            await asyncio.sleep(5)  # Wait for DB to fully initialize
            await publish_daily_post(db)
        else:
            logger.info(f"✅ Today's blog post already exists — waiting for tomorrow")
    except Exception as e:
        logger.error(f"Startup blog check error: {e}")

    while True:
        try:
            now_utc = datetime.now(timezone.utc)
            # Cairo = UTC+2
            now_cairo = now_utc + timedelta(hours=CAIRO_TZ_OFFSET)

            # Target: next 09:00 Cairo
            target = now_cairo.replace(hour=9, minute=0, second=0, microsecond=0)
            if now_cairo >= target:
                target += timedelta(days=1)

            wait_seconds = (target - now_cairo).total_seconds()
            logger.info(f"Next blog post at {target.strftime('%Y-%m-%d 09:00 Cairo')} — sleeping {wait_seconds/3600:.1f}h")

            await asyncio.sleep(wait_seconds)

            await publish_daily_post(db)

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Blog scheduler error: {e}")
            await asyncio.sleep(3600)  # retry in 1 hour
