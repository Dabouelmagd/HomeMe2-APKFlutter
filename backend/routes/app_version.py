"""
App Version + Changelog endpoints.

Public:
  GET /api/version  → returns process build-stamp + active changelog list

Owner-only (CRUD for the changelog so the app_owner can edit it from the
dashboard without redeploying):
  GET    /api/owner/changelog
  POST   /api/owner/changelog
  PUT    /api/owner/changelog/{entry_id}
  DELETE /api/owner/changelog/{entry_id}
  POST   /api/owner/changelog/sync-from-file → force re-read CHANGELOG_LATEST.md

Auto-sync: on every process boot we read /app/memory/CHANGELOG_LATEST.md and
upsert each bullet as an entry tagged with the current build version. This way
every deployment automatically refreshes the "What's new" modal — the developer
just edits CHANGELOG_LATEST.md, no manual UI step. Manual entries created via
the owner CRUD UI (source='manual') are preserved untouched.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from typing import Optional, List
import os
import time
import uuid
import logging

from database import get_db
from auth_deps import require_app_owner

router = APIRouter(prefix="/api", tags=["version"])

_STARTED_AT = datetime.now(timezone.utc).isoformat()
_VERSION = str(int(time.time()))
_RUNTIME_ENV = os.environ.get("APP_ENV", "production")
_CHANGELOG_FILE = "/app/memory/CHANGELOG_LATEST.md"

_FALLBACK_CHANGELOG = [
    {
        "ar": "📤 ارفع إيصال الدفع مباشرةً داخل التطبيق — الإدارة تعتمد بضغطة زر",
        "en": "Upload payment receipt directly in-app — admin approves with one click",
        "fr": "Téléchargez votre reçu de paiement dans l'app — l'admin approuve en un clic",
    },
    {
        "ar": "💳 طرق الدفع المعتمدة لكل كمبوند (محفظة، إنستاباي، بنك، فوري…)",
        "en": "Approved payment methods per compound (wallets, InstaPay, bank…)",
        "fr": "Méthodes de paiement approuvées par compound",
    },
    {
        "ar": "🧾 عقود الصيانة تظهر الآن تلقائياً في إجمالي المصروفات والتحليلات",
        "en": "Maintenance contracts now sync to expenses and analytics automatically",
        "fr": "Les contrats de maintenance se synchronisent automatiquement aux dépenses",
    },
]


def _parse_changelog_file(path: str) -> List[dict]:
    """Read the markdown file and return a list of {ar} dicts in order."""
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        items: List[dict] = []
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("- ") and not stripped.startswith("- ["):
                text = stripped[2:].strip()
                if text and len(text) <= 500:
                    items.append({"ar": text, "en": text, "fr": text})
                if len(items) >= 8:
                    break
        return items
    except Exception as e:
        logging.warning(f"changelog parse failed: {e}")
        return []


async def sync_changelog_from_file(db) -> int:
    """Read CHANGELOG_LATEST.md and replace the active auto-entries.

    Strategy:
      1. Soft-disable previous auto entries (source='auto') so file fully drives the modal.
      2. Insert/update each new file bullet ordered top-to-bottom.
      3. Manual entries (source='manual') are preserved untouched.
    """
    items = _parse_changelog_file(_CHANGELOG_FILE)
    if not items:
        return 0

    now = datetime.now(timezone.utc).isoformat()
    await db.changelog_entries.update_many(
        {"source": "auto"},
        {"$set": {"is_active": False, "updated_at": now}},
    )
    for idx, it in enumerate(items):
        existing = await db.changelog_entries.find_one(
            {"source": "auto", "ar": it["ar"]}, {"_id": 0}
        )
        doc = {
            "ar": it["ar"],
            "en": it.get("en") or it["ar"],
            "fr": it.get("fr") or it["ar"],
            "order": idx + 1,
            "is_active": True,
            "source": "auto",
            "version_tag": _VERSION,
            "updated_at": now,
        }
        if existing:
            await db.changelog_entries.update_one({"id": existing["id"]}, {"$set": doc})
        else:
            doc["id"] = str(uuid.uuid4())
            doc["created_at"] = now
            await db.changelog_entries.insert_one(doc)
    return len(items)


class ChangelogEntryIn(BaseModel):
    ar: str = Field(..., min_length=1, max_length=500)
    en: str = Field("", max_length=500)
    fr: str = Field("", max_length=500)
    order: Optional[int] = None
    is_active: bool = True


class ChangelogEntryUpdate(BaseModel):
    ar: Optional[str] = Field(None, min_length=1, max_length=500)
    en: Optional[str] = Field(None, max_length=500)
    fr: Optional[str] = Field(None, max_length=500)
    order: Optional[int] = None
    is_active: Optional[bool] = None


async def _read_active_changelog(db) -> List[dict]:
    """Return user-facing changelog list (active only, ordered, no _id)."""
    cursor = db.changelog_entries.find(
        {"is_active": True},
        {"_id": 0, "ar": 1, "en": 1, "fr": 1, "order": 1},
    ).sort("order", 1).limit(8)
    items = await cursor.to_list(length=8)
    if not items:
        return _FALLBACK_CHANGELOG
    return [{"ar": i.get("ar", ""), "en": i.get("en", ""), "fr": i.get("fr", "")} for i in items]


@router.get("/version")
async def get_version():
    """Public — process build-stamp + active changelog. No auth."""
    db = get_db()
    changelog = await _read_active_changelog(db)
    return {
        "version": _VERSION,
        "started_at": _STARTED_AT,
        "env": _RUNTIME_ENV,
        "changelog": changelog,
    }


@router.post("/owner/changelog/sync-from-file")
async def manual_sync_from_file(current_user: dict = Depends(require_app_owner)):
    """Force-re-read CHANGELOG_LATEST.md and refresh modal entries."""
    db = get_db()
    n = await sync_changelog_from_file(db)
    return {"synced": n, "version_tag": _VERSION}


@router.get("/owner/changelog")
async def list_changelog(current_user: dict = Depends(require_app_owner)):
    db = get_db()
    cursor = db.changelog_entries.find({}, {"_id": 0}).sort("order", 1)
    items = await cursor.to_list(length=200)
    return {"items": items, "total": len(items)}


@router.post("/owner/changelog")
async def create_changelog(payload: ChangelogEntryIn, current_user: dict = Depends(require_app_owner)):
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    if payload.order is None:
        last = await db.changelog_entries.find_one({}, sort=[("order", -1)])
        next_order = (last.get("order", 0) + 1) if last else 1
    else:
        next_order = payload.order
    entry = {
        "id": str(uuid.uuid4()),
        "ar": payload.ar.strip(),
        "en": (payload.en or "").strip(),
        "fr": (payload.fr or "").strip(),
        "order": next_order,
        "is_active": payload.is_active,
        "source": "manual",
        "created_at": now,
        "updated_at": now,
        "created_by": current_user.get("id"),
    }
    await db.changelog_entries.insert_one(entry)
    entry.pop("_id", None)
    return entry


@router.put("/owner/changelog/{entry_id}")
async def update_changelog(entry_id: str, payload: ChangelogEntryUpdate, current_user: dict = Depends(require_app_owner)):
    db = get_db()
    update = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="لا توجد حقول للتحديث")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.changelog_entries.update_one({"id": entry_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="العنصر غير موجود")
    fresh = await db.changelog_entries.find_one({"id": entry_id}, {"_id": 0})
    return fresh


@router.delete("/owner/changelog/{entry_id}")
async def delete_changelog(entry_id: str, current_user: dict = Depends(require_app_owner)):
    db = get_db()
    res = await db.changelog_entries.delete_one({"id": entry_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="العنصر غير موجود")
    return {"deleted": True, "id": entry_id}
