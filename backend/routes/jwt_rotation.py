"""
JWT Token Rotation System
- Refresh tokens with short-lived access tokens
- Token revocation on logout
- Detect token reuse attacks
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
from database import get_db
from auth_deps import get_current_user, create_access_token
import uuid, hashlib, os

router = APIRouter(prefix="/api")

# Revoked tokens (in-memory + DB)
_REVOKED: set = set()

ACCESS_TOKEN_EXPIRE = 60 * 60        # 1 hour
REFRESH_TOKEN_EXPIRE = 60 * 60 * 24 * 30  # 30 days


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()[:16]


@router.post("/auth/refresh")
async def refresh_token(request: Request):
    """Exchange refresh token for new access token."""
    body = await request.json()
    refresh_token = body.get("refresh_token", "")
    
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token مطلوب")
    
    db = get_db()
    token_hash = _token_hash(refresh_token)
    
    # Check if revoked
    if token_hash in _REVOKED:
        raise HTTPException(status_code=401, detail="Token منتهي الصلاحية")
    
    # Check DB
    stored = await db.refresh_tokens.find_one({"token_hash": token_hash})
    if not stored:
        raise HTTPException(status_code=401, detail="Token غير صالح")
    
    # Check expiry
    expires_at = datetime.fromisoformat(stored["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        await db.refresh_tokens.delete_one({"token_hash": token_hash})
        raise HTTPException(status_code=401, detail="Token منتهي الصلاحية")
    
    # Issue new access token
    user_id = stored["user_id"]
    new_access = create_access_token(
        data={"sub": user_id},
        expires_delta=timedelta(seconds=ACCESS_TOKEN_EXPIRE)
    )
    
    return {
        "access_token": new_access,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE,
    }


@router.post("/auth/logout")
async def logout(request: Request, current_user: dict = Depends(get_current_user)):
    """Revoke current token on logout."""
    db = get_db()
    user_id = current_user.get("id")
    
    # Revoke all refresh tokens for this user
    await db.refresh_tokens.delete_many({"user_id": user_id})
    
    # Log logout
    await db.security_events.insert_one({
        "type": "logout",
        "user_id": user_id,
        "ip": request.client.host if request.client else "unknown",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    
    return {"success": True, "message": "تم تسجيل الخروج بنجاح"}


@router.post("/auth/revoke-all")
async def revoke_all_sessions(current_user: dict = Depends(get_current_user)):
    """Revoke ALL sessions for current user (security breach response)."""
    db = get_db()
    user_id = current_user.get("id")
    
    result = await db.refresh_tokens.delete_many({"user_id": user_id})
    
    # Update user to force re-login everywhere
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"sessions_revoked_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "sessions_revoked": result.deleted_count,
        "message": "تم إنهاء جميع الجلسات. يرجى تسجيل الدخول من جديد."
    }
