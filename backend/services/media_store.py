"""
Persistent Media Store (MongoDB-backed)

Root-cause fix for the recurring "disappearing ads/images" bug:
Kubernetes container disk is ephemeral — every deployment wipes /app/uploads/*.
The Self-Healing backup service is on the SAME disk, so it's also wiped.

Solution: dual-write every uploaded media file to MongoDB as well.
- When saving: write to disk AND to DB (non-blocking for disk-first path)
- When serving: if disk copy missing, restore from DB (disk cache) and serve
- DB stays persistent across deployments, so images ALWAYS survive.

Storage layout in MongoDB collection `media_files`:
  {
    "subdir": "ads", "filename": "abc.jpg",
    "content_type": "image/jpeg",
    "size": 12345,
    "data": BsonBinary,
    "created_at": ...,
    "sha256": "..."
  }
Size cap: 12 MB per file (enough for logos, ad banners, profile pics).
For anything bigger, keep disk-only and let backup snapshots handle it.
"""
from __future__ import annotations

import hashlib
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from bson.binary import Binary

from database import get_db

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/app/uploads"))
MAX_DB_BYTES = 12 * 1024 * 1024  # 12 MB
ALLOWED_SUBDIRS = {
    "branding", "family_members", "logos", "ads", "services",
    "documents", "gallery", "maintenance", "users", "payment_proofs", "homeme",
}


async def save_to_db(subdir: str, filename: str, content_type: str, data: bytes) -> bool:
    """Upsert (subdir, filename) → MongoDB. Returns True on success."""
    if subdir not in ALLOWED_SUBDIRS:
        return False
    if len(data) > MAX_DB_BYTES:
        logging.info(f"[media_store] skip DB save for {subdir}/{filename} ({len(data)} bytes > {MAX_DB_BYTES})")
        return False
    db = get_db()
    doc = {
        "subdir": subdir,
        "filename": filename,
        "content_type": content_type or "application/octet-stream",
        "size": len(data),
        "data": Binary(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.media_files.update_one(
            {"subdir": subdir, "filename": filename},
            {"$set": doc, "$setOnInsert": {"created_at": doc["updated_at"]}},
            upsert=True,
        )
        return True
    except Exception as e:
        logging.warning(f"[media_store] save_to_db({subdir}/{filename}) failed: {e}")
        return False


async def load_from_db(subdir: str, filename: str) -> tuple[str, bytes] | None:
    """Load (content_type, data) or None."""
    if subdir not in ALLOWED_SUBDIRS:
        return None
    db = get_db()
    try:
        doc = await db.media_files.find_one({"subdir": subdir, "filename": filename}, {"_id": 0, "content_type": 1, "data": 1})
        if not doc:
            return None
        return doc.get("content_type") or "application/octet-stream", bytes(doc["data"])
    except Exception as e:
        logging.warning(f"[media_store] load_from_db({subdir}/{filename}) failed: {e}")
        return None


async def restore_to_disk_from_db(subdir: str, filename: str) -> bool:
    """If file is in DB but missing on disk, write it back to disk and return True."""
    if subdir not in ALLOWED_SUBDIRS:
        return False
    result = await load_from_db(subdir, filename)
    if not result:
        return False
    _, data = result
    try:
        dst_dir = UPLOAD_DIR / subdir
        dst_dir.mkdir(parents=True, exist_ok=True)
        dst = dst_dir / filename
        dst.write_bytes(data)
        logging.info(f"[media_store] Restored {subdir}/{filename} from MongoDB ({len(data)} bytes)")
        return True
    except Exception as e:
        logging.warning(f"[media_store] restore_to_disk failed: {e}")
        return False


async def migrate_disk_to_db() -> dict:
    """One-time: copy every existing file on disk into MongoDB (idempotent — SHA check skips unchanged)."""
    db = get_db()
    copied, skipped, errors = 0, 0, 0
    for sub in ALLOWED_SUBDIRS:
        d = UPLOAD_DIR / sub
        if not d.exists():
            continue
        for f in d.iterdir():
            if not f.is_file():
                continue
            try:
                data = f.read_bytes()
                if len(data) > MAX_DB_BYTES:
                    skipped += 1
                    continue
                sha = hashlib.sha256(data).hexdigest()
                existing = await db.media_files.find_one({"subdir": sub, "filename": f.name}, {"_id": 0, "sha256": 1})
                if existing and existing.get("sha256") == sha:
                    skipped += 1
                    continue
                # Guess content type
                import mimetypes
                ct = mimetypes.guess_type(str(f))[0] or "application/octet-stream"
                ok = await save_to_db(sub, f.name, ct, data)
                if ok:
                    copied += 1
                else:
                    errors += 1
            except Exception as e:
                logging.warning(f"migrate {f}: {e}")
                errors += 1
    return {
        "copied": copied,
        "skipped": skipped,
        "errors": errors,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def db_overview() -> dict:
    """Aggregate stats per subdir of media_files collection."""
    db = get_db()
    out: dict[str, dict] = {}
    pipeline = [
        {"$group": {"_id": "$subdir", "files": {"$sum": 1}, "bytes": {"$sum": "$size"}}},
    ]
    total_files, total_bytes = 0, 0
    async for doc in db.media_files.aggregate(pipeline):
        sub = doc["_id"]
        out[sub] = {"files": doc["files"], "bytes": doc["bytes"]}
        total_files += doc["files"]
        total_bytes += doc["bytes"]
    return {"by_subdir": out, "total_files": total_files, "total_bytes": total_bytes}
