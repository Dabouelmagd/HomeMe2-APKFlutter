"""
Legal Pages — serves Markdown-based static legal/info pages.

Pages: about, privacy, terms, contact
Files live in /app/memory/legal/{page}.md and are read fresh on each request,
so the Owner can update them without redeploying.
"""
import os
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/legal", tags=["legal"])

LEGAL_DIR = "/app/memory/legal"
ALLOWED_PAGES = {"about", "privacy", "terms", "contact"}

PAGE_META = {
    "about": {
        "title": "من نحن",
        "subtitle": "تعرّف على Data Life وHomeMe",
        "icon": "🏢",
    },
    "privacy": {
        "title": "سياسة الخصوصية",
        "subtitle": "كيف نحمي بياناتك",
        "icon": "🔐",
    },
    "terms": {
        "title": "شروط الاستخدام",
        "subtitle": "الشروط والأحكام المعمول بها",
        "icon": "📄",
    },
    "contact": {
        "title": "اتصل بنا",
        "subtitle": "نحن هنا للإجابة على أسئلتك",
        "icon": "📞",
    },
}


@router.get("/pages")
async def list_pages():
    """Return all available legal pages with their metadata."""
    return [
        {"slug": slug, **meta}
        for slug, meta in PAGE_META.items()
    ]


@router.get("/{slug}")
async def get_page(slug: str):
    """Return raw markdown + metadata for a single page."""
    if slug not in ALLOWED_PAGES:
        raise HTTPException(status_code=404, detail="Page not found")
    path = os.path.join(LEGAL_DIR, f"{slug}.md")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Page content missing")
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read page: {e}")

    return {
        "slug": slug,
        **PAGE_META[slug],
        "content": content,
    }
