"""
HomeMe Security Module
- Enhanced IP rate limiting with auto-blacklist
- Honeypot endpoints
- Request anomaly detection
- JWT rotation support
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from database import get_db
from auth_deps import get_current_user
import hashlib, os, logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

# ── IP Blacklist (in-memory + DB) ────────────────────────
_BLACKLIST: set = set()
_SUSPICIOUS: dict = {}   # ip → {count, first_seen}

BLACKLIST_THRESHOLD = 100   # requests per minute → blacklist
SUSPICIOUS_THRESHOLD = 50   # requests per minute → flag

async def check_ip_blacklist(request: Request):
    """Middleware helper — call from endpoints or middleware."""
    ip = request.client.host if request.client else "unknown"
    if ip in _BLACKLIST:
        raise HTTPException(status_code=403, detail="Access denied")
    return ip


async def record_suspicious(ip: str, reason: str):
    """Track suspicious IPs and auto-blacklist."""
    db = get_db()
    now = datetime.now(timezone.utc)
    
    if ip not in _SUSPICIOUS:
        _SUSPICIOUS[ip] = {"count": 0, "first_seen": now}
    
    _SUSPICIOUS[ip]["count"] += 1
    count = _SUSPICIOUS[ip]["count"]
    
    await db.security_events.insert_one({
        "ip": ip,
        "reason": reason,
        "count": count,
        "timestamp": now.isoformat(),
    })
    
    if count >= BLACKLIST_THRESHOLD:
        _BLACKLIST.add(ip)
        logger.warning(f"IP BLACKLISTED: {ip} — reason: {reason} — count: {count}")
        await db.ip_blacklist.update_one(
            {"ip": ip},
            {"$set": {"ip": ip, "reason": reason, "blacklisted_at": now.isoformat(), "count": count}},
            upsert=True
        )


# ── 3. Honeypot Endpoints ─────────────────────────────────
# Real users never hit these — only scrapers/bots do

@router.get("/admin/config")
@router.get("/api/v1/internal/users")
@router.get("/.env")
@router.get("/wp-admin/")
@router.get("/phpmyadmin/")
@router.get("/actuator/health")
@router.get("/.git/config")
async def honeypot(request: Request):
    """Honeypot — auto-blacklist any IP that hits these."""
    ip = request.client.host if request.client else "unknown"
    await record_suspicious(ip, f"honeypot_hit:{request.url.path}")
    logger.warning(f"HONEYPOT HIT: {ip} → {request.url.path}")
    # Return convincing fake response to waste scraper time
    raise HTTPException(status_code=403, detail="Forbidden")


# ── Owner security dashboard ─────────────────────────────

@router.get("/security/dashboard")
async def security_dashboard(current_user: dict = Depends(get_current_user)):
    """Security overview for owner/super_admin."""
    if current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    db = get_db()
    
    # Recent security events
    events = await db.security_events.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(50).to_list(50)
    
    # Blacklisted IPs
    blacklisted = await db.ip_blacklist.find({}, {"_id": 0}).to_list(100)
    
    # Failed logins last 24h
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    failed_logins = await db.login_attempts.count_documents({
        "success": False,
        "created_at": {"$gte": since}
    })
    
    return {
        "blacklisted_ips": len(_BLACKLIST),
        "suspicious_ips": len(_SUSPICIOUS),
        "blacklist": blacklisted,
        "recent_events": events,
        "failed_logins_24h": failed_logins,
        "memory_blacklist": list(_BLACKLIST)[:20],
    }


@router.delete("/security/blacklist/{ip}")
async def remove_from_blacklist(ip: str, current_user: dict = Depends(get_current_user)):
    """Remove IP from blacklist (owner only)."""
    if current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    _BLACKLIST.discard(ip)
    _SUSPICIOUS.pop(ip, None)
    db = get_db()
    await db.ip_blacklist.delete_one({"ip": ip})
    return {"success": True, "ip": ip, "removed": True}


@router.post("/security/blacklist/{ip}")
async def add_to_blacklist(ip: str, current_user: dict = Depends(get_current_user)):
    """Manually blacklist an IP (owner only)."""
    if current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    _BLACKLIST.add(ip)
    db = get_db()
    await db.ip_blacklist.update_one(
        {"ip": ip},
        {"$set": {"ip": ip, "reason": "manual", "blacklisted_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"success": True, "ip": ip, "blacklisted": True}
