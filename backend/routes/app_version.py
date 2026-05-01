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

Storage: collection `changelog_entries`, schema:
  {
    id: uuid,
    ar: str, en: str, fr: str,        # text per language
    order: int,                       # ascending order in the modal
    is_active: bool,                  # only active entries shown publicly
    created_at: iso str,
    updated_at: iso str,
    created_by: user_id,
  }

Fallback: when the collection is empty, /api/version returns a built-in
seed list so first-time installs and dev environments still get a useful
"What's new" modal without any DB seeding.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from typing import Optional, List
import os
import time
import uuid

from database import get_db
from auth_deps import require_app_owner

router = APIRouter(prefix="/api", tags=["version"])

# Regenerated on every process start. Cheapest reliable build-stamp.
_STARTED_AT = datetime.now(timezone.utc).isoformat()
_VERSION = str(int(time.time()))
_RUNTIME_ENV = os.environ.get("APP_ENV", "production")

# Seed list — used only when the DB collection is empty.
_FALLBACK_CHANGELOG = [
    {
        "ar": "تجربة تسجيل دخول أسرع وأكثر استقراراً 🚀",
        "en": "Faster, more reliable login experience 🚀",
        "fr": "Connexion plus rapide et plus fiable 🚀",
    },
    {
        "ar": "رسائل خطأ واضحة بالعربية في صفحة تسجيل الشركات + متطلبات كلمة المرور تظهر مباشرةً",
        "en": "Clear Arabic error messages on the company registration page + live password requirements",
        "fr": "Messages d'erreur arabes clairs lors de l'inscription d'entreprise + exigences de mot de passe en direct",
    },
    {
        "ar": "إمكانية إظهار/إخفاء كلمة المرور أثناء التسجيل 👁️",
        "en": "Show / hide password toggle during registration 👁️",
        "fr": "Afficher / masquer le mot de passe lors de l'inscription 👁️",
    },
    {
        "ar": "هوية بصرية بنفسجية مميّزة لصفحات شركة الإدارة 💜",
        "en": "Distinctive purple visual theme for management-company pages 💜",
        "fr": "Thème violet distinctif pour les pages des sociétés de gestion 💜",
    },
    {
        "ar": "تنبيه تلقائي عند توفّر إصدار جديد من التطبيق — اضغطي تحديث الآن للحصول عليه فوراً",
        "en": "Automatic alert when a new app version is available — tap Update Now to get it instantly",
        "fr": "Alerte automatique en cas de nouvelle version — appuyez sur Mettre à jour pour l'obtenir",
    },
]


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
    # Strip the order field from the public response.
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


# ---------------------------------------------------------------------------
# Owner-only CRUD
# ---------------------------------------------------------------------------
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
    # Default order = max+1 so new entries land at the bottom.
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
