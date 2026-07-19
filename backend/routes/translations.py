from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
import json
import os
import io
import logging

router = APIRouter()

LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'frontend', 'src', 'i18n', 'locales')
SUPPORTED_LANGS = ['en', 'ar', 'fr']


def _load_locale(lang: str) -> dict:
    path = os.path.join(LOCALES_DIR, f'{lang}.json')
    if not os.path.exists(path):
        return {}
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def _save_locale(lang: str, data: dict):
    path = os.path.join(LOCALES_DIR, f'{lang}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@router.get("/translations")
async def get_translations(search: str = "", page: int = 1, per_page: int = 50, filter_type: str = "all"):
    locales = {lang: _load_locale(lang) for lang in SUPPORTED_LANGS}
    all_keys = set()
    for lang_data in locales.values():
        all_keys.update(lang_data.keys())
    all_keys = sorted(all_keys)

    # Build rows
    rows = []
    for key in all_keys:
        en_val = locales['en'].get(key, '')
        ar_val = locales['ar'].get(key, '')
        fr_val = locales['fr'].get(key, '')
        missing = []
        if not en_val:
            missing.append('en')
        if not ar_val:
            missing.append('ar')
        if not fr_val:
            missing.append('fr')

        rows.append({
            "key": key,
            "en": en_val,
            "ar": ar_val,
            "fr": fr_val,
            "missing": missing
        })

    # Filter
    if search:
        search_lower = search.lower()
        rows = [r for r in rows if search_lower in r['key'].lower()
                or search_lower in str(r['en']).lower()
                or search_lower in str(r['ar']).lower()
                or search_lower in str(r['fr']).lower()]

    if filter_type == "missing":
        rows = [r for r in rows if r['missing']]
    elif filter_type == "complete":
        rows = [r for r in rows if not r['missing']]

    total = len(rows)
    start = (page - 1) * per_page
    end = start + per_page
    paginated = rows[start:end]

    # Stats
    total_keys = len(all_keys)
    missing_en = sum(1 for k in all_keys if not locales['en'].get(k))
    missing_ar = sum(1 for k in all_keys if not locales['ar'].get(k))
    missing_fr = sum(1 for k in all_keys if not locales['fr'].get(k))

    return {
        "rows": paginated,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
        "stats": {
            "total_keys": total_keys,
            "en": {"total": total_keys, "translated": total_keys - missing_en, "missing": missing_en},
            "ar": {"total": total_keys, "translated": total_keys - missing_ar, "missing": missing_ar},
            "fr": {"total": total_keys, "translated": total_keys - missing_fr, "missing": missing_fr},
        }
    }


@router.put("/translations")
async def update_translation(body: dict):
    key = body.get("key")
    lang = body.get("lang")
    value = body.get("value", "")

    if not key or lang not in SUPPORTED_LANGS:
        raise HTTPException(400, "Invalid key or language")

    data = _load_locale(lang)
    data[key] = value
    _save_locale(lang, data)

    return {"status": "ok", "key": key, "lang": lang}


@router.post("/translations/bulk")
async def bulk_update(body: dict):
    updates = body.get("updates", [])
    if not updates:
        raise HTTPException(400, "No updates provided")

    locales = {lang: _load_locale(lang) for lang in SUPPORTED_LANGS}
    count = 0

    for upd in updates:
        key = upd.get("key")
        if not key:
            continue
        for lang in SUPPORTED_LANGS:
            if lang in upd and upd[lang] is not None:
                locales[lang][key] = upd[lang]
                count += 1

    for lang in SUPPORTED_LANGS:
        _save_locale(lang, locales[lang])

    return {"status": "ok", "updated": count}


@router.delete("/translations/{key}")
async def delete_translation(key: str):
    count = 0
    for lang in SUPPORTED_LANGS:
        data = _load_locale(lang)
        if key in data:
            del data[key]
            _save_locale(lang, data)
            count += 1
    return {"status": "ok", "deleted_from": count}


@router.post("/translations/add")
async def add_translation(body: dict):
    key = body.get("key", "").strip()
    if not key:
        raise HTTPException(400, "Key is required")

    en_val = body.get("en", "")
    ar_val = body.get("ar", "")
    fr_val = body.get("fr", "")

    for lang, val in [("en", en_val), ("ar", ar_val), ("fr", fr_val)]:
        data = _load_locale(lang)
        data[key] = val
        _save_locale(lang, data)

    return {"status": "ok", "key": key}


@router.get("/translations/export/{lang}")
async def export_locale(lang: str):
    if lang not in SUPPORTED_LANGS:
        raise HTTPException(400, f"Unsupported language: {lang}")

    data = _load_locale(lang)
    json_str = json.dumps(data, ensure_ascii=False, indent=2)
    buffer = io.BytesIO(json_str.encode('utf-8'))

    return StreamingResponse(
        buffer,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={lang}.json"}
    )


@router.post("/translations/import/{lang}")
async def import_locale(lang: str, file: UploadFile = File(...)):
    if lang not in SUPPORTED_LANGS:
        raise HTTPException(400, f"Unsupported language: {lang}")

    try:
        content = await file.read()
        new_data = json.loads(content.decode('utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(400, "Invalid JSON file")

    if not isinstance(new_data, dict):
        raise HTTPException(400, "JSON must be an object with key-value pairs")

    existing = _load_locale(lang)
    existing.update(new_data)
    _save_locale(lang, existing)

    return {"status": "ok", "lang": lang, "keys_imported": len(new_data), "total_keys": len(existing)}


@router.post("/translations/auto-translate")
async def auto_translate(body: dict):
    """Auto-translate missing keys using LLM"""
    target_lang = body.get("target_lang")  # 'en', 'ar', or 'fr'
    max_keys = body.get("max_keys", 20)

    if target_lang not in SUPPORTED_LANGS:
        raise HTTPException(400, "Invalid target language")

    locales = {lang: _load_locale(lang) for lang in SUPPORTED_LANGS}
    all_keys = set()
    for ld in locales.values():
        all_keys.update(ld.keys())

    # Find keys missing in target_lang but existing in at least one other lang
    missing_keys = []
    for key in sorted(all_keys):
        if locales[target_lang].get(key):
            continue
        # Get source text from other languages
        source_text = None
        source_lang = None
        for sl in SUPPORTED_LANGS:
            if sl != target_lang and locales[sl].get(key):
                source_text = locales[sl][key]
                source_lang = sl
                break
        if source_text:
            missing_keys.append({"key": key, "source_lang": source_lang, "source_text": source_text})

    if not missing_keys:
        return {"status": "ok", "translated": 0, "message": "No missing keys to translate"}

    batch = missing_keys[:max_keys]

    lang_names = {"en": "English", "ar": "Arabic", "fr": "French"}

    # Build prompt
    items_text = "\n".join([f'{i+1}. [{item["key"]}] ({lang_names[item["source_lang"]]}): {item["source_text"]}' for i, item in enumerate(batch)])

    prompt = f"""Translate these UI texts to {lang_names[target_lang]}. 
These are interface labels/messages for a residential compound management app.
Keep translations short, professional, and natural.
Return ONLY a valid JSON object with the key as property name and translation as value. No markdown, no explanation.

{items_text}"""

    try:
        from homeme_integrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY", "")
        if not api_key:
            raise HTTPException(500, "LLM key not configured")

        chat = LlmChat(
            api_key=api_key,
            session_id=f"translate-{target_lang}",
            system_message="You are a professional translator for UI texts. Return only valid JSON."
        )
        chat.with_model("openai", "gpt-4o-mini")

        user_msg = UserMessage(text=prompt)
        response = await chat.send_message(user_msg)

        # Parse JSON from response
        resp_text = response.strip()
        if resp_text.startswith("```"):
            resp_text = resp_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        translations = json.loads(resp_text)

        # Save translations
        data = locales[target_lang]
        count = 0
        results = []
        for key, value in translations.items():
            if isinstance(value, str) and value.strip():
                data[key] = value.strip()
                count += 1
                results.append({"key": key, "value": value.strip()})

        _save_locale(target_lang, data)

        return {
            "status": "ok",
            "translated": count,
            "total_missing": len(missing_keys),
            "results": results,
        }

    except json.JSONDecodeError:
        logging.error(f"Auto-translate: Failed to parse LLM response")
        raise HTTPException(500, "Failed to parse translation response")
    except Exception as e:
        logging.error(f"Auto-translate error: {e}")
        raise HTTPException(500, f"Translation error: {str(e)}")



@router.post("/translations/auto-translate-single")
async def auto_translate_single(body: dict):
    """Auto-translate a single key"""
    key = body.get("key", "")
    target_lang = body.get("target_lang", "")

    if not key or target_lang not in SUPPORTED_LANGS:
        raise HTTPException(400, "Invalid key or target language")

    locales = {lang: _load_locale(lang) for lang in SUPPORTED_LANGS}

    # Find source text
    source_text = None
    source_lang = None
    for sl in SUPPORTED_LANGS:
        if sl != target_lang and locales[sl].get(key):
            source_text = locales[sl][key]
            source_lang = sl
            break

    if not source_text:
        raise HTTPException(400, "No source text found for this key")

    lang_names = {"en": "English", "ar": "Arabic", "fr": "French"}

    prompt = f"""Translate this UI text from {lang_names[source_lang]} to {lang_names[target_lang]}.
This is an interface label for a residential compound management app.
Keep it short, professional, and natural. Return ONLY the translated text, nothing else.

Text: {source_text}"""

    try:
        from homeme_integrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY", "")
        if not api_key:
            raise HTTPException(500, "LLM key not configured")

        chat = LlmChat(
            api_key=api_key,
            session_id=f"translate-single-{key}",
            system_message="You are a professional translator. Return only the translated text."
        )
        chat.with_model("openai", "gpt-4o-mini")

        user_msg = UserMessage(text=prompt)
        response = await chat.send_message(user_msg)
        translated = response.strip().strip('"').strip("'")

        # Save
        data = locales[target_lang]
        data[key] = translated
        _save_locale(target_lang, data)

        return {"status": "ok", "key": key, "value": translated, "lang": target_lang}

    except Exception as e:
        logging.error(f"Auto-translate single error: {e}")
        raise HTTPException(500, f"Translation error: {str(e)}")
