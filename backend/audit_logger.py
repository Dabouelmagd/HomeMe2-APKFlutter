"""
Audit Logger — central facility to record sensitive actions.

Usage from any route:
    from audit_logger import audit_log
    await audit_log(
        actor=current_user,
        action="user.delete",
        target_type="user",
        target_id=victim_id,
        details={"reason": "spam"},
        request=request,
    )

Schema (collection: `audit_logs`):
    id, at, actor_id, actor_username, actor_role, ip, ua,
    action, target_type, target_id, details, before, after
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from database import get_db

logger = logging.getLogger(__name__)


def _client_ip(request) -> Optional[str]:
    if not request:
        return None
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


async def audit_log(
    *,
    actor: Optional[dict] = None,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    details: Optional[dict] = None,
    before: Optional[dict] = None,
    after: Optional[dict] = None,
    request: Any = None,
    success: bool = True,
) -> Optional[str]:
    """Persist a single audit-log entry. Best-effort — never raises.
    Returns the inserted document id, or None on failure.
    Auto-enriches `geo` (country/city) from cached GeoIP lookup when IP is public.
    """
    try:
        db = get_db()
        ip = _client_ip(request)
        # Best-effort geo enrichment (uses cache → MaxMind → ip-api fallback)
        geo = None
        if ip:
            try:
                from services.geoip_service import geoip_lookup
                g = await geoip_lookup(ip)
                if g:
                    geo = {
                        "country_code": g.get("country_code"),
                        "country_name": g.get("country_name"),
                        "city": g.get("city"),
                        "source": g.get("source"),
                    }
            except Exception:
                geo = None

        doc = {
            "id": str(uuid.uuid4()),
            "at": datetime.now(timezone.utc).isoformat(),
            "actor_id": (actor or {}).get("id"),
            "actor_username": (actor or {}).get("username"),
            "actor_full_name": (actor or {}).get("full_name"),
            "actor_role": (actor or {}).get("role"),
            "actor_compound_id": (actor or {}).get("compound_id"),
            "actor_company_id": (actor or {}).get("company_id"),
            "ip": ip,
            "geo": geo,
            "ua": (request.headers.get("user-agent") if request else None) or None,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "details": details or {},
            "before": before,
            "after": after,
            "success": success,
        }
        await db.audit_logs.insert_one(doc)
        return doc["id"]
    except Exception as e:
        logger.error(f"audit_log failed for action={action}: {e}")
        return None
