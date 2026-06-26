"""
Firebase Cloud Messaging (FCM) service for mobile push notifications.

Usage:
    from services.fcm_service import send_fcm
    await send_fcm(user_id="abc", title="مرحبا", body="...", data={"deep_link":"/app/notifications"})

Design:
- Firebase Admin SDK lazily initialized on first send.
- Service account JSON loaded from FIREBASE_ADMIN_JSON_PATH env var.
- Multi-device per user — fcm_tokens collection stores {user_id, token, device_id, platform, last_seen}.
- All sends wrapped in asyncio.to_thread (firebase-admin SDK is sync).
- Failed sends with UnregisteredError/InvalidArgument → auto-remove dead tokens.
- All sends logged to fcm_logs for delivery tracking.
"""
import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from database import get_db

logger = logging.getLogger(__name__)

_initialized = False
_init_error: Optional[str] = None
_project_id: Optional[str] = None


def _init_firebase():
    """Initialize Firebase Admin SDK once. Idempotent + lock-free."""
    global _initialized, _init_error, _project_id
    if _initialized:
        return True
    json_path = os.environ.get("FIREBASE_ADMIN_JSON_PATH")
    if not json_path or not os.path.exists(json_path):
        _init_error = f"FIREBASE_ADMIN_JSON_PATH missing or file not found: {json_path}"
        return False
    try:
        import firebase_admin
        from firebase_admin import credentials
        # Avoid re-init if another process already initialized the default app
        try:
            firebase_admin.get_app()
            _initialized = True
        except ValueError:
            cred = credentials.Certificate(json_path)
            firebase_admin.initialize_app(cred)
            _initialized = True
        # Read project_id from the JSON for status reporting
        import json as _json
        with open(json_path) as f:
            data = _json.load(f)
            _project_id = data.get("project_id")
        logger.info(f"FCM: Firebase Admin SDK initialized for project {_project_id}")
        return True
    except Exception as e:
        _init_error = str(e)[:200]
        logger.error(f"FCM init failed: {_init_error}")
        return False


def is_fcm_configured() -> bool:
    if _initialized:
        return True
    return _init_firebase()


def get_project_id() -> Optional[str]:
    if _initialized or _init_firebase():
        return _project_id
    return None


async def register_token(*, user_id: str, token: str, device_id: Optional[str] = None,
                          platform: Optional[str] = None) -> Dict[str, Any]:
    """Register or refresh an FCM token for a user/device. Idempotent."""
    if not user_id or not token:
        return {"ok": False, "error": "user_id and token required"}
    db = get_db()
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "user_id": user_id,
        "token": token,
        "device_id": device_id,
        "platform": platform,
        "last_seen": now_iso,
    }
    # Token is unique key — upsert by token to handle device re-installs
    await db.fcm_tokens.update_one(
        {"token": token},
        {"$set": doc, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now_iso}},
        upsert=True,
    )
    return {"ok": True, "user_id": user_id, "token": token[:20] + "..."}


async def unregister_token(*, token: str) -> Dict[str, Any]:
    db = get_db()
    res = await db.fcm_tokens.delete_one({"token": token})
    return {"ok": True, "deleted": res.deleted_count}


async def list_user_tokens(user_id: str) -> List[str]:
    db = get_db()
    rows = await db.fcm_tokens.find({"user_id": user_id}, {"_id": 0, "token": 1}).to_list(50)
    return [r["token"] for r in rows if r.get("token")]


def _send_multicast_sync(tokens: List[str], title: str, body: str, data: Optional[Dict[str, str]] = None):
    """Sync FCM call — runs in threadpool. Returns (success_count, failure_count, dead_tokens)."""
    from firebase_admin import messaging
    message = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(title=title, body=body),
        data={k: str(v) for k, v in (data or {}).items()},
        android=messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(sound="default", click_action="FLUTTER_NOTIFICATION_CLICK"),
        ),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(aps=messaging.Aps(sound="default", badge=1)),
        ),
    )
    resp = messaging.send_each_for_multicast(message)
    dead_tokens = []
    for idx, r in enumerate(resp.responses):
        if not r.success and r.exception:
            ec = getattr(r.exception, "code", None) or type(r.exception).__name__
            # Dead tokens to remove from DB
            if "unregistered" in str(ec).lower() or "invalid-argument" in str(ec).lower() or "registration-token-not-registered" in str(r.exception).lower():
                dead_tokens.append(tokens[idx])
    return resp.success_count, resp.failure_count, dead_tokens


async def send_fcm(
    *,
    user_id: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    actor_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Send a push to all devices of a user. Returns delivery summary."""
    db = get_db()
    log_doc: Dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "at": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "title": title[:200],
        "body": body[:1000],
        "data": data or {},
        "actor_id": actor_id,
        "ok": False,
        "sent": 0,
        "failed": 0,
        "tokens_count": 0,
        "error": None,
    }

    if not is_fcm_configured():
        log_doc["error"] = _init_error or "fcm_not_configured"
        try:
            await db.fcm_logs.insert_one(log_doc)
        except Exception:
            pass
        return {"ok": False, "error": log_doc["error"], "sent": 0, "failed": 0}

    tokens = await list_user_tokens(user_id)
    log_doc["tokens_count"] = len(tokens)
    if not tokens:
        log_doc["error"] = "no_tokens_registered"
        try:
            await db.fcm_logs.insert_one(log_doc)
        except Exception:
            pass
        return {"ok": False, "error": "no_tokens_registered", "sent": 0, "failed": 0}

    try:
        sent, failed, dead_tokens = await asyncio.to_thread(_send_multicast_sync, tokens, title, body, data)
        # Clean dead tokens
        if dead_tokens:
            await db.fcm_tokens.delete_many({"token": {"$in": dead_tokens}})
        log_doc.update({"ok": sent > 0, "sent": sent, "failed": failed, "dead_tokens_cleaned": len(dead_tokens)})
        try:
            await db.fcm_logs.insert_one(log_doc)
        except Exception:
            pass
        return {"ok": sent > 0, "sent": sent, "failed": failed, "dead_tokens_cleaned": len(dead_tokens)}
    except Exception as e:
        err = str(e)[:300]
        log_doc["error"] = err
        try:
            await db.fcm_logs.insert_one(log_doc)
        except Exception:
            pass
        logger.warning(f"FCM send to user={user_id} failed: {err}")
        return {"ok": False, "error": err, "sent": 0, "failed": len(tokens)}


async def send_fcm_to_token(*, token: str, title: str, body: str,
                             data: Optional[Dict[str, Any]] = None,
                             actor_id: Optional[str] = None) -> Dict[str, Any]:
    """Direct send to a single device token (used by /test endpoint)."""
    db = get_db()
    log_doc: Dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "at": datetime.now(timezone.utc).isoformat(),
        "user_id": None,
        "title": title[:200],
        "body": body[:1000],
        "data": data or {},
        "actor_id": actor_id,
        "tokens_count": 1,
        "ok": False, "sent": 0, "failed": 0, "error": None,
    }
    if not is_fcm_configured():
        log_doc["error"] = _init_error or "fcm_not_configured"
        try: await db.fcm_logs.insert_one(log_doc)
        except Exception: pass
        return {"ok": False, "error": log_doc["error"]}

    try:
        sent, failed, dead = await asyncio.to_thread(_send_multicast_sync, [token], title, body, data)
        if dead:
            await db.fcm_tokens.delete_many({"token": {"$in": dead}})
        log_doc.update({"ok": sent > 0, "sent": sent, "failed": failed})
        try: await db.fcm_logs.insert_one(log_doc)
        except Exception: pass
        return {"ok": sent > 0, "sent": sent, "failed": failed, "dead_tokens_cleaned": len(dead)}
    except Exception as e:
        log_doc["error"] = str(e)[:300]
        try: await db.fcm_logs.insert_one(log_doc)
        except Exception: pass
        return {"ok": False, "error": log_doc["error"]}


async def get_delivery_stats(days: int = 7) -> Dict[str, Any]:
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    total_t = db.fcm_logs.count_documents({"at": {"$gte": since}})
    ok_t = db.fcm_logs.count_documents({"at": {"$gte": since}, "ok": True})
    fail_t = db.fcm_logs.count_documents({"at": {"$gte": since}, "ok": False})
    tokens_t = db.fcm_tokens.count_documents({})
    total, ok, fail, tokens = await asyncio.gather(total_t, ok_t, fail_t, tokens_t)
    return {
        "configured": is_fcm_configured(),
        "project_id": get_project_id(),
        "total": total,
        "succeeded": ok,
        "failed": fail,
        "registered_tokens": tokens,
        "init_error": _init_error,
    }
