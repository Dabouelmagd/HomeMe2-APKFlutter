"""
FCM Mobile Push API routes.

Endpoints:
- POST /api/fcm/register   — mobile app registers/refreshes its FCM token (any auth user)
- POST /api/fcm/unregister — mobile app removes its token on logout
- GET  /api/fcm/tokens     — list user's own tokens
- POST /api/fcm/send       — admin sends push to a user (admin/owner only)
- POST /api/fcm/test       — admin sends test push to a specific token
- GET  /api/fcm/status     — config + delivery stats (admin only)
- GET  /api/fcm/logs       — delivery logs (admin only)
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field

from database import get_db
from auth_deps import get_current_user
from audit_logger import audit_log
from services.fcm_service import (
    register_token, unregister_token, list_user_tokens,
    send_fcm, send_fcm_to_token, get_delivery_stats, is_fcm_configured, get_project_id,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


def _can_manage(user: dict) -> bool:
    return user.get("role") in ("app_owner", "super_admin", "company_admin", "admin")


class RegisterTokenPayload(BaseModel):
    token: str = Field(..., min_length=20)
    device_id: Optional[str] = None
    platform: Optional[str] = None  # "ios" | "android" | "web"


@router.post("/fcm/register")
async def register_fcm_token(
    payload: RegisterTokenPayload,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Mobile app: register or refresh this device's FCM token."""
    result = await register_token(
        user_id=current_user["id"], token=payload.token,
        device_id=payload.device_id, platform=payload.platform,
    )
    await audit_log(
        actor=current_user, action="fcm.register",
        target_type="device", target_id=payload.device_id or payload.token[:20],
        details={"platform": payload.platform}, request=request,
    )
    return result


class UnregisterTokenPayload(BaseModel):
    token: str = Field(..., min_length=20)


@router.post("/fcm/unregister")
async def unregister_fcm_token(
    payload: UnregisterTokenPayload,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Mobile app: remove a token (on logout / uninstall)."""
    result = await unregister_token(token=payload.token)
    await audit_log(
        actor=current_user, action="fcm.unregister",
        target_type="device", target_id=payload.token[:20],
        request=request,
    )
    return result


@router.get("/fcm/tokens")
async def get_my_tokens(current_user: dict = Depends(get_current_user)):
    """User can see their own registered devices."""
    tokens = await list_user_tokens(current_user["id"])
    db = get_db()
    rows = await db.fcm_tokens.find(
        {"user_id": current_user["id"]},
        {"_id": 0, "token": 0},  # don't echo the full token back
    ).to_list(50)
    return {"count": len(tokens), "devices": rows}


class SendFCMPayload(BaseModel):
    user_id: str
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=1000)
    data: Optional[dict] = None


@router.post("/fcm/send")
async def admin_send_fcm(
    payload: SendFCMPayload,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Admin: send a push to a specific user across all their devices."""
    if not _can_manage(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    if not is_fcm_configured():
        raise HTTPException(status_code=503, detail="FCM غير مُكوَّن. تأكد من FIREBASE_ADMIN_JSON_PATH وملف Service Account")

    result = await send_fcm(
        user_id=payload.user_id,
        title=payload.title, body=payload.body, data=payload.data,
        actor_id=current_user["id"],
    )

    await audit_log(
        actor=current_user, action="fcm.send",
        target_type="user", target_id=payload.user_id,
        success=result.get("ok", False),
        details={"sent": result.get("sent", 0), "failed": result.get("failed", 0), "title": payload.title[:100]},
        request=request,
    )
    if not result.get("ok"):
        return {"ok": False, "warning": result.get("error", "no_devices_or_send_failed"), **result}
    return result


class TestFCMPayload(BaseModel):
    token: str = Field(..., min_length=20)
    title: str = "اختبار من HomeMe"
    body: str = "هذا اشعار تجريبي للتأكد من ربط الجهاز"


@router.post("/fcm/test")
async def admin_test_fcm(
    payload: TestFCMPayload,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Admin: send a test push to a specific device token (debug helper)."""
    if not _can_manage(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    if not is_fcm_configured():
        raise HTTPException(status_code=503, detail="FCM غير مُكوَّن")
    result = await send_fcm_to_token(
        token=payload.token, title=payload.title, body=payload.body,
        actor_id=current_user["id"],
    )
    await audit_log(
        actor=current_user, action="fcm.test",
        target_type="device", target_id=payload.token[:20],
        success=result.get("ok", False),
        details={"sent": result.get("sent", 0)}, request=request,
    )
    return result


@router.get("/fcm/status")
async def fcm_status(current_user: dict = Depends(get_current_user)):
    if not _can_manage(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    return await get_delivery_stats(days=7)


@router.get("/fcm/logs")
async def fcm_logs(
    days: int = 7, limit: int = 100, ok: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
):
    if not _can_manage(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    q = {"at": {"$gte": since}}
    if ok is not None:
        q["ok"] = ok
    items = await db.fcm_logs.find(q, {"_id": 0}).sort("at", -1).limit(min(limit, 500)).to_list(None)
    return {"items": items, "total": len(items)}
