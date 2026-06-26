"""
WhatsApp API routes — send messages, view delivery logs, status webhook.
Owner/Super-admin only for management endpoints; webhook is public (signed).
"""
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request, Form
from pydantic import BaseModel, Field

from database import get_db
from auth_deps import get_current_user, require_admin, require_super_admin
from audit_logger import audit_log
from services.whatsapp_service import (
    send_whatsapp, get_delivery_stats, is_whatsapp_configured,
    normalize_to_whatsapp,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


def _can_manage(user: dict) -> bool:
    return user.get("role") in ("app_owner", "super_admin", "company_admin", "admin")


class SendWhatsAppPayload(BaseModel):
    to: str = Field(..., description="Phone in E.164 or local format (e.g. 01001234567)")
    body: str = Field(..., min_length=1, max_length=1600)
    media_url: Optional[str] = None


@router.post("/whatsapp/send")
async def send_whatsapp_message(
    payload: SendWhatsAppPayload,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Send a single WhatsApp message. Restricted to admin roles."""
    if not _can_manage(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")

    if not is_whatsapp_configured():
        raise HTTPException(status_code=503, detail="خدمة WhatsApp غير مُكوَّنة. أضف TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN")

    result = await send_whatsapp(
        to=payload.to, body=payload.body, media_url=payload.media_url,
        context={"manual": True, "via": "api"}, actor_id=current_user.get("id"),
    )

    # Audit-log the send
    await audit_log(
        actor=current_user, action="whatsapp.send",
        target_type="message", target_id=result.get("sid"),
        success=result.get("ok", False),
        details={"to": result.get("to"), "status": result.get("status"), "error": result.get("error")},
        request=request,
    )

    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error") or "فشل إرسال الرسالة")
    return result


class BulkSendPayload(BaseModel):
    recipients: list  # list of phone numbers
    body: str = Field(..., min_length=1, max_length=1600)
    media_url: Optional[str] = None


@router.post("/whatsapp/send-bulk")
async def send_whatsapp_bulk(
    payload: BulkSendPayload,
    request: Request,
    current_user: dict = Depends(require_super_admin),
):
    """Send WhatsApp message to multiple recipients. Super admin only."""
    if not is_whatsapp_configured():
        raise HTTPException(status_code=503, detail="خدمة WhatsApp غير مُكوَّنة")
    if len(payload.recipients) > 500:
        raise HTTPException(status_code=400, detail="الحد الأقصى 500 مستلم لكل دفعة")

    import asyncio
    results = await asyncio.gather(*[
        send_whatsapp(to=r, body=payload.body, media_url=payload.media_url,
                      context={"bulk": True}, actor_id=current_user.get("id"))
        for r in payload.recipients
    ])

    sent = sum(1 for r in results if r.get("ok"))
    failed = len(results) - sent

    await audit_log(
        actor=current_user, action="whatsapp.send_bulk",
        target_type="bulk", details={"total": len(results), "sent": sent, "failed": failed},
        request=request,
    )

    return {"total": len(results), "sent": sent, "failed": failed, "results": results}


@router.get("/whatsapp/status")
async def get_whatsapp_status(current_user: dict = Depends(get_current_user)):
    """Configuration + delivery stats. Available to all admin roles."""
    if not _can_manage(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    stats = await get_delivery_stats(days=7)
    return stats


@router.get("/whatsapp/logs")
async def list_whatsapp_logs(
    days: int = 7,
    limit: int = 100,
    ok: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
):
    """Recent send logs. Useful for debugging delivery."""
    if not _can_manage(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    q = {"at": {"$gte": since}}
    if ok is not None:
        q["ok"] = ok
    items = await db.whatsapp_logs.find(q, {"_id": 0}).sort("at", -1).limit(min(limit, 500)).to_list(None)
    return {"items": items, "total": len(items)}


@router.post("/whatsapp/webhook")
async def whatsapp_status_webhook(request: Request):
    """Twilio status callback for delivery updates.
    Verifies the X-Twilio-Signature using the auth token.
    """
    try:
        from twilio.request_validator import RequestValidator
    except ImportError:
        raise HTTPException(status_code=503, detail="Twilio SDK missing")

    auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    if not auth_token:
        raise HTTPException(status_code=503, detail="Twilio not configured")

    form = await request.form()
    body = dict(form)
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)

    # Verify the signature
    validator = RequestValidator(auth_token)
    if not validator.validate(url, body, signature):
        logger.warning(f"WhatsApp webhook signature mismatch from {request.client.host if request.client else 'unknown'}")
        raise HTTPException(status_code=403, detail="Invalid signature")

    sid = body.get("MessageSid") or body.get("SmsSid")
    status = body.get("MessageStatus") or body.get("SmsStatus")
    err_code = body.get("ErrorCode")
    err_msg = body.get("ErrorMessage")

    db = get_db()
    if sid:
        await db.whatsapp_logs.update_one(
            {"sid": sid},
            {"$set": {
                "status": status,
                "last_status_update": datetime.now(timezone.utc).isoformat(),
                "error_code": err_code,
                "error_message": err_msg,
            }}
        )
    return {"ok": True}


@router.post("/whatsapp/normalize-test")
async def normalize_test(payload: dict, current_user: dict = Depends(get_current_user)):
    """Helper endpoint for the UI — show how a phone number would be normalized."""
    if not _can_manage(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    raw = payload.get("phone", "")
    normalized = normalize_to_whatsapp(raw)
    return {"input": raw, "normalized": normalized, "valid": normalized is not None}
