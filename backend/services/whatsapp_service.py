"""
WhatsApp messaging service via Twilio.

Usage:
    from services.whatsapp_service import send_whatsapp
    await send_whatsapp("+201001234567", "مرحبا — تم استلام طلب الصيانة.")

Design:
- Twilio SDK is sync; we wrap `client.messages.create` with `asyncio.to_thread`
  so it doesn't block the FastAPI event loop.
- All sends are logged to `whatsapp_logs` collection for delivery tracking.
- Phone numbers must be E.164 (e.g. +201001234567). The helper auto-prefixes
  `whatsapp:` for both `from` and `to`.
- For Sandbox mode (whatsapp:+14155238886), the recipient must first send
  "join <code>" to the Twilio sandbox number from their own WhatsApp.
"""
import asyncio
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from database import get_db

logger = logging.getLogger(__name__)


def _twilio_client():
    """Lazy-init Twilio client. Returns None when credentials are missing."""
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    if not sid or not token:
        return None
    try:
        from twilio.rest import Client  # local import — only when configured
        return Client(sid, token)
    except Exception as e:
        logger.error(f"Twilio client init failed: {e}")
        return None


def _from_address() -> str:
    """The Twilio WhatsApp sender address (whatsapp:+<E.164>)."""
    return os.environ.get("TWILIO_WHATSAPP_FROM") or "whatsapp:+14155238886"


def is_whatsapp_configured() -> bool:
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    return bool(sid and token)


_E164 = re.compile(r"^\+\d{6,15}$")


def normalize_to_whatsapp(phone: str) -> Optional[str]:
    """Return `whatsapp:+E.164` form, or None if the input is invalid.
    
    Accepts:
      • +201001234567  → whatsapp:+201001234567
      • 201001234567   → whatsapp:+201001234567   (assumes already has CC)
      • 01001234567    → whatsapp:+201001234567   (Egyptian default — strip leading 0, prepend +20)
      • whatsapp:+201001234567 → unchanged
    """
    if not phone:
        return None
    p = phone.strip()
    if p.startswith("whatsapp:"):
        return p
    p = re.sub(r"[\s\-()]", "", p)  # strip whitespace, dashes, parens
    if p.startswith("+"):
        if _E164.match(p):
            return f"whatsapp:{p}"
        return None
    if p.startswith("00"):
        p = "+" + p[2:]
        if _E164.match(p):
            return f"whatsapp:{p}"
        return None
    # Egyptian fallback: 11-digit number starting with 0 → +20
    if p.startswith("0") and len(p) == 11:
        p = "+20" + p[1:]
        if _E164.match(p):
            return f"whatsapp:{p}"
    elif len(p) >= 10 and p.isdigit():
        p = "+" + p
        if _E164.match(p):
            return f"whatsapp:{p}"
    return None


async def send_whatsapp(
    to: str,
    body: str,
    *,
    media_url: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
    actor_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Send a WhatsApp message via Twilio asynchronously.

    Returns a result dict:
        { "ok": bool, "sid": str|None, "status": str|None, "error": str|None, "to": str }

    Result is also persisted to `whatsapp_logs` for delivery tracking and audit.
    Never raises — all errors are returned in the result dict and logged.
    """
    db = get_db()
    log_doc: Dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "at": datetime.now(timezone.utc).isoformat(),
        "to": to,
        "body": body[:1000],  # cap body in log
        "media_url": media_url,
        "context": context or {},
        "actor_id": actor_id,
        "ok": False,
        "sid": None,
        "status": None,
        "error": None,
    }
    normalized = normalize_to_whatsapp(to)
    if normalized is None:
        log_doc["error"] = "invalid_phone_number"
        try:
            await db.whatsapp_logs.insert_one(log_doc)
        except Exception:
            pass
        return {"ok": False, "error": "invalid_phone_number", "to": to, "sid": None, "status": None}

    log_doc["to_normalized"] = normalized

    client = _twilio_client()
    if client is None:
        log_doc["error"] = "twilio_not_configured"
        try:
            await db.whatsapp_logs.insert_one(log_doc)
        except Exception:
            pass
        return {"ok": False, "error": "twilio_not_configured", "to": normalized, "sid": None, "status": None}

    from_addr = _from_address()

    def _send_sync():
        kwargs = {"from_": from_addr, "to": normalized, "body": body}
        if media_url:
            kwargs["media_url"] = [media_url]
        return client.messages.create(**kwargs)

    try:
        msg = await asyncio.to_thread(_send_sync)
        log_doc.update({"ok": True, "sid": msg.sid, "status": msg.status, "from_addr": from_addr})
        try:
            await db.whatsapp_logs.insert_one(log_doc)
        except Exception:
            pass
        return {"ok": True, "sid": msg.sid, "status": msg.status, "to": normalized, "error": None}
    except Exception as e:
        err = str(e)[:300]
        log_doc["error"] = err
        log_doc["from_addr"] = from_addr
        try:
            await db.whatsapp_logs.insert_one(log_doc)
        except Exception:
            pass
        logger.warning(f"WhatsApp send failed → {normalized}: {err}")
        return {"ok": False, "error": err, "to": normalized, "sid": None, "status": None}


async def get_delivery_stats(days: int = 7) -> Dict[str, Any]:
    """Aggregate delivery stats from whatsapp_logs."""
    from datetime import timedelta
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    by_status_task = db.whatsapp_logs.aggregate([
        {"$match": {"at": {"$gte": since}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]).to_list(50)
    total_task = db.whatsapp_logs.count_documents({"at": {"$gte": since}})
    ok_task = db.whatsapp_logs.count_documents({"at": {"$gte": since}, "ok": True})
    fail_task = db.whatsapp_logs.count_documents({"at": {"$gte": since}, "ok": False})
    by_status, total, ok, fail = await asyncio.gather(by_status_task, total_task, ok_task, fail_task)
    return {
        "total": total,
        "sent": ok,
        "failed": fail,
        "by_status": [{"status": s["_id"] or "unknown", "count": s["count"]} for s in by_status],
        "configured": is_whatsapp_configured(),
        "from": _from_address(),
    }
