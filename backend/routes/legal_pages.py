"""
Legal Pages — Multi-lingual (AR/EN/FR) markdown serving + Owner editor + AI translation.

Files: /app/memory/legal/{slug}_{lang}.md  (e.g. about_ar.md, about_en.md, about_fr.md)
- Backwards compat: legacy `/app/memory/legal/{slug}.md` is treated as the AR file.
- If a non-AR locale is requested but missing, fall back to AR with a `fallback_lang` flag.

Owner-only endpoints:
- POST /api/legal/{slug}?lang=X       → save markdown content
- POST /api/legal/{slug}/translate    → auto-generate EN+FR from AR via Gemini
"""
import os
import logging
from typing import Optional, Literal
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field

from auth_deps import require_app_owner

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/legal", tags=["legal"])

LEGAL_DIR = "/app/memory/legal"
ALLOWED_PAGES = {"about", "privacy", "terms", "contact"}
ALLOWED_LANGS = {"ar", "en", "fr"}

PAGE_META = {
    "about": {
        "title": {"ar": "من نحن", "en": "About Us", "fr": "À propos"},
        "subtitle": {"ar": "تعرّف على Data Life وHomeMe", "en": "Get to know Data Life and HomeMe", "fr": "Découvrez Data Life et HomeMe"},
        "icon": "🏢",
    },
    "privacy": {
        "title": {"ar": "سياسة الخصوصية", "en": "Privacy Policy", "fr": "Politique de confidentialité"},
        "subtitle": {"ar": "كيف نحمي بياناتك", "en": "How we protect your data", "fr": "Comment nous protégeons vos données"},
        "icon": "🔐",
    },
    "terms": {
        "title": {"ar": "شروط الاستخدام", "en": "Terms of Service", "fr": "Conditions d'utilisation"},
        "subtitle": {"ar": "الشروط والأحكام المعمول بها", "en": "Terms and conditions in effect", "fr": "Termes et conditions applicables"},
        "icon": "📄",
    },
    "contact": {
        "title": {"ar": "اتصل بنا", "en": "Contact Us", "fr": "Contactez-nous"},
        "subtitle": {"ar": "نحن هنا للإجابة على أسئلتك", "en": "We're here to answer your questions", "fr": "Nous sommes là pour répondre à vos questions"},
        "icon": "📞",
    },
}


def _file_path(slug: str, lang: str) -> str:
    """Returns the disk path for the (slug,lang) pair, with legacy fallback for AR."""
    return os.path.join(LEGAL_DIR, f"{slug}_{lang}.md")


def _legacy_path(slug: str) -> str:
    return os.path.join(LEGAL_DIR, f"{slug}.md")


def _read_content(slug: str, lang: str) -> tuple[str, str, bool]:
    """
    Returns (content, served_lang, fallback_used).
    Tries: locale-specific → ar (locale-specific) → legacy unsuffixed → empty.
    """
    paths_to_try = [
        (_file_path(slug, lang), lang, False),
    ]
    if lang != "ar":
        paths_to_try.append((_file_path(slug, "ar"), "ar", True))
        paths_to_try.append((_legacy_path(slug), "ar", True))
    else:
        paths_to_try.append((_legacy_path(slug), "ar", False))

    for path, served, fb in paths_to_try:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return f.read(), served, fb
            except Exception as e:
                logger.error(f"Failed to read {path}: {e}")
    return "", lang, True


# ============================================================================
# Models
# ============================================================================
class SaveRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=200_000)


# ============================================================================
# Public endpoints
# ============================================================================
@router.get("/pages")
async def list_pages(lang: str = Query("ar")):
    if lang not in ALLOWED_LANGS:
        lang = "ar"
    return [
        {
            "slug": slug,
            "title": meta["title"].get(lang, meta["title"]["ar"]),
            "subtitle": meta["subtitle"].get(lang, meta["subtitle"]["ar"]),
            "icon": meta["icon"],
        }
        for slug, meta in PAGE_META.items()
    ]


@router.get("/{slug}")
async def get_page(slug: str, lang: str = Query("ar")):
    if slug not in ALLOWED_PAGES:
        raise HTTPException(status_code=404, detail="Page not found")
    if lang not in ALLOWED_LANGS:
        lang = "ar"

    content, served_lang, fallback_used = _read_content(slug, lang)
    if not content:
        raise HTTPException(status_code=404, detail="Page content missing")

    meta = PAGE_META[slug]
    return {
        "slug": slug,
        "lang_requested": lang,
        "lang_served": served_lang,
        "fallback_used": fallback_used,
        "title": meta["title"].get(served_lang, meta["title"]["ar"]),
        "subtitle": meta["subtitle"].get(served_lang, meta["subtitle"]["ar"]),
        "icon": meta["icon"],
        "content": content,
    }


# ============================================================================
# Owner-only edit endpoints
# ============================================================================
@router.get("/{slug}/raw")
async def get_raw(
    slug: str,
    lang: str = Query("ar"),
    current_user: dict = Depends(require_app_owner),
):
    """Owner-only — get all 3 versions for the editor at once."""
    if slug not in ALLOWED_PAGES:
        raise HTTPException(status_code=404, detail="Page not found")
    versions = {}
    for L in ALLOWED_LANGS:
        path = _file_path(slug, L)
        if not os.path.exists(path) and L == "ar":
            path = _legacy_path(slug)
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    versions[L] = f.read()
            except Exception:
                versions[L] = ""
        else:
            versions[L] = ""
    return {
        "slug": slug,
        "icon": PAGE_META[slug]["icon"],
        "title": PAGE_META[slug]["title"],
        "versions": versions,
    }


@router.put("/{slug}")
async def save_page(
    slug: str,
    body: SaveRequest,
    lang: str = Query(...),
    current_user: dict = Depends(require_app_owner),
):
    """Owner-only — save markdown for a (slug, lang) pair."""
    if slug not in ALLOWED_PAGES:
        raise HTTPException(status_code=404, detail="Page not found")
    if lang not in ALLOWED_LANGS:
        raise HTTPException(status_code=400, detail="Unsupported language")

    os.makedirs(LEGAL_DIR, exist_ok=True)
    path = _file_path(slug, lang)
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(body.content)
        # If saving AR and a legacy unsuffixed file exists, update it too for backwards compat
        if lang == "ar":
            legacy = _legacy_path(slug)
            try:
                with open(legacy, "w", encoding="utf-8") as f:
                    f.write(body.content)
            except Exception:
                pass
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Write failed: {e}")

    return {
        "ok": True,
        "slug": slug,
        "lang": lang,
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "actor_id": current_user.get("id"),
    }


@router.post("/{slug}/translate")
async def translate_page(
    slug: str,
    target_lang: str = Query(..., description="en or fr"),
    source_lang: str = Query("ar"),
    current_user: dict = Depends(require_app_owner),
):
    """Owner-only — auto-translate a page from source_lang into target_lang via Gemini AI."""
    if slug not in ALLOWED_PAGES:
        raise HTTPException(status_code=404, detail="Page not found")
    if target_lang not in {"en", "fr"} or source_lang not in ALLOWED_LANGS:
        raise HTTPException(status_code=400, detail="Bad lang")
    if target_lang == source_lang:
        raise HTTPException(status_code=400, detail="Source equals target")

    src_content, _, _ = _read_content(slug, source_lang)
    if not src_content:
        raise HTTPException(status_code=400, detail=f"No source content for {source_lang}")

    from services.translation_service import translate_markdown
    translated = await translate_markdown(src_content, source_lang, target_lang)

    # Persist
    os.makedirs(LEGAL_DIR, exist_ok=True)
    path = _file_path(slug, target_lang)
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(translated)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Write failed: {e}")

    return {
        "ok": True,
        "slug": slug,
        "source_lang": source_lang,
        "target_lang": target_lang,
        "char_count": len(translated),
        "translated_content": translated,
    }
