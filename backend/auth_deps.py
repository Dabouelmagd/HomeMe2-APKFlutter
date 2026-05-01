"""
Shared authentication dependencies for HomeMe backend.
All route modules import auth middleware from here.
"""
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
import bcrypt
import os
import re
from datetime import datetime, timedelta
from passlib.context import CryptContext

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserDict(dict):
    """Dict that also supports attribute access for backward compat."""
    def __getattr__(self, name):
        try:
            return self[name]
        except KeyError:
            raise AttributeError(name)

    def __setattr__(self, name, value):
        self[name] = value


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def validate_password_strength(password: str) -> tuple:
    if len(password) < 8:
        return False, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
    if not re.search(r'[A-Z]', password):
        return False, "كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل"
    if not re.search(r'[a-z]', password):
        return False, "كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل"
    if not re.search(r'\d', password):
        return False, "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*)"
    return True, ""


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), request: Request = None):
    from database import get_db
    db = get_db()
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("_id", None)
        # Carry impersonation markers from JWT into the user context so routes can detect it
        if payload.get("impersonation"):
            user["impersonator_id"] = payload.get("impersonator_id")
            user["impersonator_username"] = payload.get("impersonator_username")
            user["is_impersonation"] = True
        # ----------------------------------------------------------------
        # Active-compound override for company_admin: allow them to operate
        # "as a mini-owner" on any compound owned by their management company.
        # The frontend sends X-Active-Compound-Id when a company_admin (or
        # owner/super_admin) selects a specific compound from their dashboard.
        # We only honour the override when the compound is actually inside the
        # company's tree, so cross-company access is impossible.
        # ----------------------------------------------------------------
        try:
            if request is not None:
                active_cid = request.headers.get("x-active-compound-id") or request.headers.get("X-Active-Compound-Id")
                role = user.get("role")
                if active_cid and role in ("company_admin", "assistant_manager", "accountant", "app_owner", "super_admin"):
                    if role in ("app_owner", "super_admin"):
                        user["compound_id"] = active_cid
                    else:
                        company_id = user.get("company_id")
                        if company_id:
                            cpd = await db.compounds.find_one(
                                {
                                    "id": active_cid,
                                    "$or": [
                                        {"company_id": company_id},
                                        {"management_company_id": company_id},
                                    ],
                                },
                                {"_id": 0, "id": 1},
                            )
                            if cpd:
                                user["compound_id"] = active_cid
        except Exception:
            # Never let header parsing break auth
            pass
        return UserDict(user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    from database import get_db
    db = get_db()
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        user = await db.users.find_one({"id": user_id})
        if user is None:
            return None
        user.pop("_id", None)
        return UserDict(user)
    except jwt.PyJWTError:
        return None


async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["admin", "super_admin", "company_admin", "app_owner"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def require_super_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["super_admin", "app_owner"]:
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return current_user


async def require_app_owner(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "app_owner":
        raise HTTPException(status_code=403, detail="App Owner access required")
    return current_user


async def require_staff_or_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["admin", "super_admin", "company_admin", "manager", "app_owner"]:
        raise HTTPException(status_code=403, detail="Staff or Admin access required")
    return current_user


async def require_security_or_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["admin", "super_admin", "security", "manager", "app_owner"]:
        raise HTTPException(status_code=403, detail="Security or Admin access required")
    return current_user
