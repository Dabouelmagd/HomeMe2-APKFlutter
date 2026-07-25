"""
Translation Service — Gemini-powered AR↔EN↔FR translation for markdown content
and short changelog entries.

Used by:
- routes/legal_pages.py — translate full markdown documents
- routes/app_version.py — translate changelog entries (cached per version+lang)
"""
import os
import logging
from datetime import datetime, timezone
from typing import List

from database import get_db

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
MODEL_PROVIDER = "gemini"
MODEL_NAME = "gemini-3-flash-preview"

LANG_NAME = {
    "ar": "Arabic",
    "en": "English",
    "fr": "French",
}


async def translate_markdown(content: str, source_lang: str, target_lang: str) -> str:
    """
    Translate full markdown document. Preserves markdown structure.
    Falls back to source content if LLM unavailable.
    """
    if not EMERGENT_LLM_KEY:
        logger.warning("[translate] no LLM key — returning source as fallback")
        return content
    if source_lang == target_lang:
        return content

    src_name = LANG_NAME.get(source_lang, source_lang)
    tgt_name = LANG_NAME.get(target_lang, target_lang)

    prompt = f"""Translate the following Markdown content from {src_name} to {tgt_name}.

STRICT RULES:
1. Preserve ALL markdown formatting exactly (# headings, **bold**, *italic*, lists, tables, code blocks, links, blockquotes, hr).
2. Keep proper nouns AS-IS without translation: HomeMe, Data Life, Stripe, Gemini, AI, MRR, ARR, SMTP, RBAC, JWT, OAuth.
3. Keep email addresses, phone numbers, URLs, and code identifiers AS-IS.
4. Keep emojis as-is (🏠, 📞, ✅, ❌, etc.).
5. For currency in {tgt_name}: keep "EGP" or "Egyptian Pound" / "Livre égyptienne" (don't convert amounts).
6. For dates: translate format conventionally for the target locale.
7. The document is a legal/informational page — use formal, professional tone.
8. Translate the FULL document — do not summarize or skip sections.
9. Do NOT add any commentary, prefix, or explanation. Output ONLY the translated markdown.

CONTENT TO TRANSLATE:
---
{content}
---"""

    try:
        from homeme_integrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"translate_{source_lang}_{target_lang}_{datetime.now(timezone.utc).timestamp()}",
            system_message="You are a professional translator specializing in legal and technical content. Output only the translation, no commentary.",
        ).with_model(MODEL_PROVIDER, MODEL_NAME)
        result = await chat.send_message(UserMessage(text=prompt))
        out = (result or "").strip()
        # Remove fences if model wrapped output
        if out.startswith("```"):
            lines = out.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            out = "\n".join(lines)
        return out or content
    except Exception as e:
        logger.exception(f"[translate] markdown translation failed: {e}")
        return content


async def translate_short_lines(lines: List[str], source_lang: str, target_lang: str) -> List[str]:
    """
    Batch-translate a list of short strings (e.g. changelog bullets).
    Returns translations in the same order.
    Falls back to original lines if LLM unavailable.
    """
    if not EMERGENT_LLM_KEY or not lines or source_lang == target_lang:
        return lines

    src_name = LANG_NAME.get(source_lang, source_lang)
    tgt_name = LANG_NAME.get(target_lang, target_lang)

    # Use a numbered format that's easy to parse back
    numbered = "\n".join(f"{i+1}. {line}" for i, line in enumerate(lines))

    prompt = f"""Translate each numbered line below from {src_name} to {tgt_name}.

RULES:
- Output ONLY the numbered lines, in the same order, with same numbering.
- Keep proper nouns AS-IS: HomeMe, Data Life, Stripe, Gemini, AI, Auto-Pilot, MRR, ARR, etc.
- Keep emojis exactly where they are.
- Keep the same tone (concise product update / changelog entry).
- Do not add commentary or extra lines.

INPUT:
{numbered}

OUTPUT:"""

    try:
        from homeme_integrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"trans_lines_{source_lang}_{target_lang}_{datetime.now(timezone.utc).timestamp()}",
            system_message="You are a professional translator. Output only the translations in the requested numbered format.",
        ).with_model(MODEL_PROVIDER, MODEL_NAME)
        raw = await chat.send_message(UserMessage(text=prompt))
        text = (raw or "").strip()
        # Parse back: lines starting with "N." → translation
        out_map: dict[int, str] = {}
        for ln in text.split("\n"):
            ln = ln.strip()
            if not ln:
                continue
            # Find "<number>." prefix
            if "." in ln:
                num_part, rest = ln.split(".", 1)
                if num_part.strip().isdigit():
                    out_map[int(num_part.strip())] = rest.strip()
                    continue
        result = []
        for i, original in enumerate(lines):
            result.append(out_map.get(i + 1, original))
        return result
    except Exception as e:
        logger.exception(f"[translate] lines failed: {e}")
        return lines


async def translate_changelog_cached(entries: List[str], version: str, target_lang: str) -> List[str]:
    """
    Translates changelog entries with MongoDB caching keyed by (version, target_lang).
    """
    if not entries or target_lang == "ar":
        return entries

    db = get_db()
    cache_key = f"changelog_{version}_{target_lang}"
    cached = await db.translation_cache.find_one({"_id": cache_key})
    if cached and cached.get("entries") and len(cached["entries"]) == len(entries):
        return cached["entries"]

    translated = await translate_short_lines(entries, "ar", target_lang)
    try:
        await db.translation_cache.update_one(
            {"_id": cache_key},
            {"$set": {
                "entries": translated,
                "version": version,
                "lang": target_lang,
                "cached_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
    except Exception:
        pass
    return translated
