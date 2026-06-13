"""
Per-user Notification Preferences
=================================

Each user controls **which channels** (push / email / sms) receive **which
event types** (payment / maintenance / announcement / visitor / complaint /
contract / poll / system).

Helper :func:`get_user_channels` is the single source of truth that the
notification dispatcher should call to decide where to push a given event.

Defaults are intentionally **permissive on push/in-app** (which is free) and
**conservative on SMS** (which costs money). Users opt out, not in.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime, timezone

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api", tags=["notification-preferences"])

# Canonical event types — keep in sync with the keys used by ``notify_*``
# helpers. Adding a new event here makes it controllable per-user.
EVENT_TYPES = [
    "payment",        # invoices, payment proofs, receipts
    "maintenance",    # work orders, service requests
    "announcement",   # global compound announcements
    "visitor",        # visitor QR, entry/exit
    "complaint",      # complaints + suggestions + praise
    "contract",       # expiring contracts, renewals
    "poll",           # new polls, results
    "system",         # account / security / billing alerts
]
CHANNELS = ["push", "email", "sms"]

# Permissive defaults — push everywhere (cheap), email for billing/security,
# sms only for life-critical (none in defaults).
DEFAULT_PREFERENCES: Dict[str, Dict[str, bool]] = {
    "payment":      {"push": True, "email": True,  "sms": False},
    "maintenance":  {"push": True, "email": True,  "sms": False},
    "announcement": {"push": True, "email": False, "sms": False},
    "visitor":      {"push": True, "email": False, "sms": False},
    "complaint":    {"push": True, "email": True,  "sms": False},
    "contract":     {"push": True, "email": True,  "sms": False},
    "poll":         {"push": True, "email": False, "sms": False},
    "system":       {"push": True, "email": True,  "sms": False},
}


class PreferencesUpdate(BaseModel):
    """Partial update — only included event types are overwritten."""
    preferences: Dict[str, Dict[str, bool]]


def _coerce(pref: Optional[Dict[str, Dict[str, bool]]]) -> Dict[str, Dict[str, bool]]:
    """Fill missing event types / channels with defaults so callers can always
    safely do ``prefs[event]['push']`` without KeyError surprises."""
    out: Dict[str, Dict[str, bool]] = {}
    for ev in EVENT_TYPES:
        src = (pref or {}).get(ev) or {}
        out[ev] = {ch: bool(src.get(ch, DEFAULT_PREFERENCES[ev][ch])) for ch in CHANNELS}
    return out


@router.get("/notification-preferences")
async def get_my_preferences(current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await db.notification_preferences.find_one(
        {"user_id": current_user["id"]}, {"_id": 0}
    )
    return {
        "user_id": current_user["id"],
        "preferences": _coerce(doc.get("preferences") if doc else None),
        "event_types": EVENT_TYPES,
        "channels": CHANNELS,
        "updated_at": (doc or {}).get("updated_at"),
    }


@router.put("/notification-preferences")
async def update_my_preferences(
    data: PreferencesUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    merged = _coerce(data.preferences)
    await db.notification_preferences.update_one(
        {"user_id": current_user["id"]},
        {
            "$set": {
                "preferences": merged,
                "updated_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )
    return {
        "user_id": current_user["id"],
        "preferences": merged,
        "saved": True,
    }


async def get_user_channels(user_id: str, event_type: str) -> Dict[str, bool]:
    """Public helper for notification dispatchers.

    Returns a dict like ``{"push": True, "email": False, "sms": False}``.
    Falls back to ``DEFAULT_PREFERENCES[event_type]`` when no doc exists
    or the event type is unknown.
    """
    if event_type not in DEFAULT_PREFERENCES:
        # Unknown event — push only (silent fail-safe)
        return {"push": True, "email": False, "sms": False}

    try:
        db = get_db()
        doc = await db.notification_preferences.find_one(
            {"user_id": user_id}, {"_id": 0, "preferences": 1}
        )
    except Exception:
        doc = None

    if not doc or "preferences" not in doc:
        return dict(DEFAULT_PREFERENCES[event_type])

    pref = doc["preferences"].get(event_type) or {}
    return {ch: bool(pref.get(ch, DEFAULT_PREFERENCES[event_type][ch])) for ch in CHANNELS}
