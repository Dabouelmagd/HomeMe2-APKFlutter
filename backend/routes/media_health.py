"""
Media Health Dashboard

- GET /api/media-health/overview      — totals, orphans/broken counts, last snapshot
- GET /api/media-health/orphans       — files on disk with NO DB reference
- GET /api/media-health/broken        — DB references whose file is missing on disk
- GET /api/media-health/backups       — list snapshots
- POST /api/media-health/backup-now   — manual snapshot trigger (owner-only)
- POST /api/media-health/repair-broken — try to restore missing files from latest backups (owner-only)

RBAC: app_owner / super_admin only.
"""
from __future__ import annotations

import logging
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException

from auth_deps import get_current_user
from database import get_db
from services.media_backup import (
    UPLOAD_DIR, ALLOWED_SUBDIRS, take_snapshot, list_snapshots,
    find_in_backups, restore_file,
)

router = APIRouter(prefix="/api/media-health", tags=["media-health"])


def _require_owner(current_user: dict):
    role = (current_user or {}).get("role")
    if role not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="هذه الصفحة متاحة للمالك والسوبر أدمن فقط")
    return current_user


# Map (collection, field, subdir) for DB references that point to /api/files/{subdir}/{filename}
DB_REFS = [
    ("users", "profile_picture_url", "users"),
    ("family_members", "profile_image", "family_members"),
    ("compounds", "logo_url", "branding"),
    ("internal_ads", "image_url", "ads"),
    ("internal_ads", "video_url", "ads"),
    ("ad_campaigns", "image_url", "ads"),
    ("advertiser_ads", "image_url", "ads"),
    ("advertiser_ads", "video_url", "ads"),
    ("maintenance_requests", "image_urls", "maintenance"),  # array
    ("complaints", "image_urls", "maintenance"),
    ("compound_services", "image_url", "services"),
    ("support_tickets", "proof_url", "payment_proofs"),
    ("messages", "image_url", "gallery"),
    ("voice_messages", "audio_url", "gallery"),
    ("gallery", "image_url", "gallery"),
]


def _filename_from_url(url: str | None, subdir: str) -> str | None:
    """Extract filename from /api/files/{subdir}/{filename} or /api/ads/media/{filename}."""
    if not url or not isinstance(url, str):
        return None
    needle1 = f"/api/files/{subdir}/"
    if needle1 in url:
        return url.split(needle1, 1)[1].split("?")[0].split("#")[0]
    if subdir == "ads" and "/api/ads/media/" in url:
        return url.split("/api/ads/media/", 1)[1].split("?")[0].split("#")[0]
    return None


async def _scan(db) -> dict:
    """Walk DB references and disk to find broken/orphan media."""
    referenced: dict[str, set[str]] = {s: set() for s in ALLOWED_SUBDIRS}
    broken: list[dict] = []

    for coll, field, subdir in DB_REFS:
        try:
            cursor = db[coll].find({field: {"$exists": True, "$ne": None}}, {"_id": 0, "id": 1, field: 1})
        except Exception:
            continue
        async for doc in cursor:
            value = doc.get(field)
            if not value:
                continue
            urls = value if isinstance(value, list) else [value]
            for u in urls:
                fn = _filename_from_url(u, subdir)
                if not fn:
                    continue
                referenced.setdefault(subdir, set()).add(fn)
                disk = UPLOAD_DIR / subdir / fn
                if not disk.exists():
                    broken.append({
                        "collection": coll, "doc_id": doc.get("id"), "field": field,
                        "subdir": subdir, "filename": fn, "url": u,
                    })

    # Disk scan for orphans
    orphans: list[dict] = []
    total_files, total_bytes = 0, 0
    by_subdir: dict[str, dict] = {}
    for sub in ALLOWED_SUBDIRS:
        d = UPLOAD_DIR / sub
        if not d.exists():
            continue
        bd = {"files": 0, "bytes": 0}
        for f in d.iterdir():
            if not f.is_file():
                continue
            total_files += 1
            sz = f.stat().st_size
            total_bytes += sz
            bd["files"] += 1
            bd["bytes"] += sz
            if f.name not in referenced.get(sub, set()):
                orphans.append({"subdir": sub, "filename": f.name, "bytes": sz})
        by_subdir[sub] = bd

    return {
        "total_files": total_files,
        "total_bytes": total_bytes,
        "by_subdir": by_subdir,
        "orphans": orphans,
        "broken": broken,
    }


@router.get("/overview")
async def overview(current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    db = get_db()
    scan = await _scan(db)
    snaps = list_snapshots()
    last = snaps[0] if snaps else None
    return {
        "total_files": scan["total_files"],
        "total_bytes": scan["total_bytes"],
        "by_subdir": scan["by_subdir"],
        "orphan_count": len(scan["orphans"]),
        "broken_count": len(scan["broken"]),
        "snapshot_count": len(snaps),
        "last_snapshot": last,
    }


@router.get("/orphans")
async def orphans(current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    db = get_db()
    scan = await _scan(db)
    return {"orphans": scan["orphans"], "count": len(scan["orphans"])}


@router.get("/broken")
async def broken(current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    db = get_db()
    scan = await _scan(db)
    return {"broken": scan["broken"], "count": len(scan["broken"])}


@router.get("/backups")
async def backups(current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    snaps = list_snapshots()
    return {"snapshots": snaps, "count": len(snaps)}


@router.post("/backup-now")
async def backup_now(current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    try:
        res = take_snapshot()
        return {"success": True, **res}
    except Exception as e:
        logging.error(f"backup-now failed: {e}")
        raise HTTPException(status_code=500, detail=f"Backup failed: {e}")


@router.post("/repair-broken")
async def repair_broken(current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    db = get_db()
    scan = await _scan(db)
    repaired, missing = [], []
    for b in scan["broken"]:
        ok = restore_file(b["subdir"], b["filename"])
        if ok:
            repaired.append(b)
        else:
            missing.append(b)
    return {
        "repaired_count": len(repaired),
        "missing_count": len(missing),
        "repaired": repaired,
        "still_missing": missing,
    }
