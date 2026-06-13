"""
Notification Dispatcher
=======================

Single entry point for sending a notification to a user. Respects the user's
per-event-type channel preferences (push / email / sms) before fanning out.

The **in-app notification** is *always* persisted to ``db.notifications`` so
the user can still see it in the bell icon even when they have disabled push,
email, and sms for that event type. This is by design — turning a channel off
should silence the *push* (out-of-app interruption), not delete history.

Public API
----------
    await dispatch_notification(
        db,
        user_ids=[uid1, uid2, ...],
        event_type="announcement",        # one of EVENT_TYPES in notification_preferences.py
        title="عنوان قصير",
        body="نص الرسالة",
        in_app_payload={"compound_id": ..., "action_type": "announcement"},
        email_html="<p>...</p>",          # optional — required if email channel is in scope
        email_subject=None,               # defaults to title
        sms_text=None,                    # optional — required if sms channel is in scope
    )

Returns ``{"in_app": N, "push": N, "email": N, "sms": N, "skipped": [...]}``.
"""
from __future__ import annotations
import logging
import uuid
from datetime import datetime, timezone
from typing import Iterable, Dict, Any, Optional, List

from routes.notification_preferences import get_user_channels

logger = logging.getLogger(__name__)


async def _persist_in_app(db, user_id: str, *, event_type: str, title: str, body: str,
                          payload: Optional[Dict[str, Any]] = None) -> Optional[str]:
    """Write the notification document so it shows up in the bell icon.

    History persists regardless of channel preferences — the user can always
    see things they would otherwise have missed by turning channels off.
    """
    try:
        doc = {
            "id": str(uuid.uuid4()),
            "sender_id": "system",
            "title": title,
            "content": body,
            "type": event_type,
            "recipient_ids": [user_id],
            "is_read": False,
            "created_at": datetime.now(timezone.utc),
            **(payload or {}),
        }
        await db.notifications.insert_one(doc)
        return doc["id"]
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[dispatch] in-app persist failed for {user_id}: {e}")
        return None


async def _send_push(user_id: str, title: str, body: str, data: Optional[Dict[str, Any]] = None) -> bool:
    """Forward to the existing push pipeline (web-push / FCM later)."""
    try:
        # Lazy import to avoid a circular dependency with server.py at module load.
        from server import send_push_notification  # type: ignore
        await send_push_notification(user_id, title, body, data or {})
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[dispatch] push failed for {user_id}: {e}")
        return False


async def _send_email(db, user_id: str, *, subject: str, html: str, event_type: str) -> bool:
    """Resolve the user's email from DB and hand off to email_service."""
    try:
        user = await db.users.find_one({"id": user_id}, {"email": 1, "full_name": 1, "_id": 0})
        to_email = (user or {}).get("email")
        if not to_email:
            return False
        from email_service import email_service  # local import — heavy module
        return await email_service.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            email_type=event_type,
            related_user_id=user_id,
        )
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[dispatch] email failed for {user_id}: {e}")
        return False


async def _send_sms(db, user_id: str, *, text: str) -> bool:
    """SMS dispatch — currently a stub.

    Wiring a real provider (Twilio / VictoryLink) only needs a swap here; all
    callers already respect the user's per-event-type SMS preference.
    """
    try:
        user = await db.users.find_one({"id": user_id}, {"phone": 1, "_id": 0})
        phone = (user or {}).get("phone")
        if not phone:
            return False
        # No active SMS provider yet — log so SuperAdmin can audit demand
        try:
            await db.sms_outbox.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "phone": phone,
                "text": text[:480],
                "status": "queued_no_provider",
                "created_at": datetime.now(timezone.utc),
            })
        except Exception:
            pass
        return False
    except Exception as e:  # noqa: BLE001
        logger.warning(f"[dispatch] sms stub failed for {user_id}: {e}")
        return False


async def dispatch_notification(
    db,
    user_ids: Iterable[str],
    *,
    event_type: str,
    title: str,
    body: str,
    in_app_payload: Optional[Dict[str, Any]] = None,
    email_html: Optional[str] = None,
    email_subject: Optional[str] = None,
    sms_text: Optional[str] = None,
    push_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Send a notification to a batch of users respecting per-user preferences.

    The in-app channel is **always** delivered (history). Push/email/sms are
    delivered only when the user has that channel turned on for ``event_type``.
    Missing optional payloads (e.g., ``email_html``) silently skip that channel
    even if the user has it enabled — so callers can opt out per-call too.
    """
    counts = {"in_app": 0, "push": 0, "email": 0, "sms": 0}
    skipped: List[Dict[str, str]] = []

    for uid in {u for u in user_ids if u}:  # dedupe
        # 1) Always persist in-app — non-blocking for the rest
        ok = await _persist_in_app(
            db, uid, event_type=event_type, title=title, body=body, payload=in_app_payload
        )
        if ok:
            counts["in_app"] += 1

        # 2) Look up channel prefs (falls back to safe defaults if absent)
        ch = await get_user_channels(uid, event_type)

        if ch.get("push"):
            if await _send_push(uid, title, body, push_data or in_app_payload):
                counts["push"] += 1
        else:
            skipped.append({"user_id": uid, "channel": "push"})

        if ch.get("email") and email_html:
            if await _send_email(
                db, uid, subject=email_subject or title, html=email_html, event_type=event_type
            ):
                counts["email"] += 1
        elif ch.get("email") and not email_html:
            # Caller didn't supply HTML — record skip so we can debug later
            skipped.append({"user_id": uid, "channel": "email", "reason": "no_html"})

        if ch.get("sms") and sms_text:
            if await _send_sms(db, uid, text=sms_text):
                counts["sms"] += 1
        elif ch.get("sms") and not sms_text:
            skipped.append({"user_id": uid, "channel": "sms", "reason": "no_text"})

    return {**counts, "skipped": skipped, "user_count": len(set(user_ids))}
