"""
GeoIP enrichment service for audit logs & security insights.

Strategy:
1. Try local MaxMind GeoLite2 City database if available (offline, fast, no API limits).
   Drop the .mmdb file at /app/backend/data/GeoLite2-City.mmdb to enable.
2. Fall back to ip-api.com free tier (45 req/min, no key required) for unknown IPs.
3. Cache all lookups in MongoDB collection `geoip_cache` for 30 days to minimize
   external calls and speed up subsequent reads.
4. Skip private/loopback/reserved IPs (no public geolocation exists).

Returns a normalized dict:
    { "ip", "country_code", "country_name", "city", "lat", "lon", "source" }
or None when no public geolocation is possible.
"""
import ipaddress
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

import httpx

from database import get_db

logger = logging.getLogger(__name__)

# Local MaxMind GeoLite2-City.mmdb path (optional — set this up via geoipupdate or manual download)
MAXMIND_DB_PATH = os.environ.get("GEOIP_DB_PATH", "/app/backend/data/GeoLite2-City.mmdb")

# Cache TTL: GeoLite2 is refreshed ~twice weekly; we cache 30 days for stability
CACHE_TTL_DAYS = 30

# Module-level reader (initialized lazily on first lookup)
_maxmind_reader = None
_maxmind_available: Optional[bool] = None


def _get_maxmind_reader():
    """Lazy-initialize MaxMind reader. Returns None if db file is missing."""
    global _maxmind_reader, _maxmind_available
    if _maxmind_available is False:
        return None
    if _maxmind_reader is not None:
        return _maxmind_reader
    try:
        if not os.path.exists(MAXMIND_DB_PATH):
            _maxmind_available = False
            logger.info(f"GeoIP: MaxMind DB not found at {MAXMIND_DB_PATH}; will use ip-api.com fallback")
            return None
        import geoip2.database  # type: ignore
        _maxmind_reader = geoip2.database.Reader(MAXMIND_DB_PATH)
        _maxmind_available = True
        logger.info(f"GeoIP: MaxMind GeoLite2-City reader initialized from {MAXMIND_DB_PATH}")
        return _maxmind_reader
    except ImportError:
        _maxmind_available = False
        logger.info("GeoIP: geoip2 package not installed; will use ip-api.com fallback")
        return None
    except Exception as e:
        _maxmind_available = False
        logger.warning(f"GeoIP: failed to init MaxMind reader: {e}")
        return None


def _normalize_ip(ip_str: str) -> Optional[ipaddress._BaseAddress]:
    """Validate + parse IP. Return ipaddress object or None."""
    if not ip_str:
        return None
    try:
        clean = ip_str.strip().split("%")[0].strip("[]").split(",")[0].strip()
        return ipaddress.ip_address(clean)
    except (ValueError, TypeError):
        return None


def _should_lookup(addr: ipaddress._BaseAddress) -> bool:
    """Public, internet-routable addresses only."""
    if (
        addr.is_loopback or addr.is_private or addr.is_link_local
        or addr.is_multicast or addr.is_unspecified or addr.is_reserved
    ):
        return False
    # IPv6 documentation network
    if isinstance(addr, ipaddress.IPv6Address):
        doc_net = ipaddress.IPv6Network("2001:db8::/32")
        if addr in doc_net:
            return False
    return True


def _lookup_maxmind(ip: str) -> Optional[Dict[str, Any]]:
    """Try MaxMind GeoLite2 lookup. Returns None if unavailable or not found."""
    reader = _get_maxmind_reader()
    if reader is None:
        return None
    try:
        resp = reader.city(ip)
        return {
            "ip": ip,
            "country_code": resp.country.iso_code,
            "country_name": resp.country.name,
            "city": resp.city.name,
            "lat": resp.location.latitude,
            "lon": resp.location.longitude,
            "source": "maxmind",
        }
    except Exception:
        return None


async def _lookup_ipapi(ip: str) -> Optional[Dict[str, Any]]:
    """Fallback to ip-api.com (45 req/min free tier). Use for low-volume use cases."""
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.get(
                f"http://ip-api.com/json/{ip}",
                params={"fields": "status,country,countryCode,city,lat,lon,query"},
            )
            if r.status_code != 200:
                return None
            data = r.json()
            if data.get("status") != "success":
                return None
            return {
                "ip": data.get("query") or ip,
                "country_code": data.get("countryCode"),
                "country_name": data.get("country"),
                "city": data.get("city"),
                "lat": data.get("lat"),
                "lon": data.get("lon"),
                "source": "ip-api",
            }
    except Exception as e:
        logger.debug(f"ip-api lookup failed for {ip}: {e}")
        return None


async def geoip_lookup(ip_str: str) -> Optional[Dict[str, Any]]:
    """
    Resolve an IP address to geolocation info.
    
    Order: cache → MaxMind (local) → ip-api.com (remote) → cache the result.
    Returns None for private/local/invalid IPs.
    """
    addr = _normalize_ip(ip_str)
    if addr is None or not _should_lookup(addr):
        return None

    ip_clean = str(addr.ipv4_mapped) if (isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped) else str(addr)

    db = get_db()
    if db is not None:
        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=CACHE_TTL_DAYS)).isoformat()
            cached = await db.geoip_cache.find_one({"ip": ip_clean, "at": {"$gte": cutoff}}, {"_id": 0})
            if cached:
                return {k: v for k, v in cached.items() if k != "at"}
        except Exception as e:
            logger.debug(f"geoip cache read failed: {e}")

    # Lookup chain: MaxMind first (sync), then ip-api fallback (async)
    result = _lookup_maxmind(ip_clean)
    if result is None:
        result = await _lookup_ipapi(ip_clean)

    if result and db is not None:
        try:
            doc = {**result, "at": datetime.now(timezone.utc).isoformat()}
            await db.geoip_cache.update_one({"ip": ip_clean}, {"$set": doc}, upsert=True)
        except Exception as e:
            logger.debug(f"geoip cache write failed: {e}")

    return result


async def geoip_batch_lookup(ips: list) -> Dict[str, Optional[Dict[str, Any]]]:
    """Batch lookup — useful for enriching tables of audit logs in one call.
    Deduplicates IPs first, then performs concurrent lookups.
    """
    import asyncio
    unique = list({i for i in ips if i})
    results = await asyncio.gather(*[geoip_lookup(ip) for ip in unique], return_exceptions=True)
    out: Dict[str, Optional[Dict[str, Any]]] = {}
    for ip, res in zip(unique, results):
        out[ip] = res if isinstance(res, dict) else None
    return out
