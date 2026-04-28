"""
Media Backup + Self-Healing System

- Daily snapshot of /app/uploads/* into /app/backups/media/YYYY-MM-DD/ (incremental — only new/changed files copied)
- Self-heal helper: if a requested file is missing, look in latest backups and restore it
- Health helpers: list backups, scan orphans (file on disk not referenced) + broken (DB ref with no file)
"""
from __future__ import annotations

import asyncio
import logging
import os
import shutil
import hashlib
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Iterable

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/app/uploads"))
BACKUP_ROOT = Path(os.environ.get("MEDIA_BACKUP_ROOT", "/app/backups/media"))
ALLOWED_SUBDIRS = {
    "branding", "family_members", "logos", "ads", "services",
    "documents", "gallery", "maintenance", "users", "payment_proofs",
    "homeme",  # NEW: HomeMe global app branding
}
RETAIN_DAYS = int(os.environ.get("MEDIA_BACKUP_RETAIN_DAYS", "30"))


# ---------- Snapshot helpers ----------

def _today_dir() -> Path:
    return BACKUP_ROOT / datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _file_sig(p: Path) -> tuple[int, int]:
    s = p.stat()
    return (s.st_size, int(s.st_mtime))


def take_snapshot() -> dict:
    """Copy all files under UPLOAD_DIR into today's backup dir. Incremental (skips identical files)."""
    BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
    snap_dir = _today_dir()
    snap_dir.mkdir(parents=True, exist_ok=True)

    copied, skipped, errors = 0, 0, 0
    for sub in ALLOWED_SUBDIRS:
        src = UPLOAD_DIR / sub
        if not src.exists():
            continue
        dst = snap_dir / sub
        dst.mkdir(parents=True, exist_ok=True)
        for f in src.iterdir():
            if not f.is_file():
                continue
            target = dst / f.name
            try:
                if target.exists() and _file_sig(target) == _file_sig(f):
                    skipped += 1
                    continue
                shutil.copy2(str(f), str(target))
                copied += 1
            except Exception as e:
                logging.warning(f"snapshot copy failed {f}: {e}")
                errors += 1

    # Prune old snapshots
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETAIN_DAYS)
    for d in BACKUP_ROOT.iterdir():
        if not d.is_dir():
            continue
        try:
            day = datetime.strptime(d.name, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if day < cutoff:
                shutil.rmtree(d, ignore_errors=True)
        except ValueError:
            continue

    return {
        "snapshot": snap_dir.name,
        "copied": copied,
        "skipped": skipped,
        "errors": errors,
        "ts": datetime.now(timezone.utc).isoformat(),
    }


def list_snapshots() -> list[dict]:
    if not BACKUP_ROOT.exists():
        return []
    out = []
    for d in sorted(BACKUP_ROOT.iterdir(), reverse=True):
        if not d.is_dir():
            continue
        size, count = 0, 0
        for f in d.rglob("*"):
            if f.is_file():
                size += f.stat().st_size
                count += 1
        out.append({"snapshot": d.name, "files": count, "bytes": size})
    return out


# ---------- Self-heal ----------

def find_in_backups(subdir: str, filename: str) -> Path | None:
    """Look in newest-first snapshots for this file."""
    if not BACKUP_ROOT.exists():
        return None
    if subdir not in ALLOWED_SUBDIRS:
        return None
    for d in sorted(BACKUP_ROOT.iterdir(), reverse=True):
        if not d.is_dir():
            continue
        candidate = d / subdir / filename
        if candidate.exists() and candidate.is_file():
            return candidate
    return None


def restore_file(subdir: str, filename: str) -> bool:
    """Restore a file from latest backup back into /app/uploads/{subdir}/. Returns True if restored."""
    src = find_in_backups(subdir, filename)
    if not src:
        return False
    dst_dir = UPLOAD_DIR / subdir
    dst_dir.mkdir(parents=True, exist_ok=True)
    dst = dst_dir / filename
    try:
        shutil.copy2(str(src), str(dst))
        logging.info(f"[media_backup] Self-healed: restored {subdir}/{filename} from {src.parent.parent.name}")
        return True
    except Exception as e:
        logging.warning(f"restore_file failed: {e}")
        return False


# ---------- Scheduler ----------

async def media_backup_loop():
    """Daily snapshot loop — runs at 03:00 UTC."""
    import asyncio as _a
    while True:
        now = datetime.now(timezone.utc)
        target = now.replace(hour=3, minute=0, second=0, microsecond=0)
        if now >= target:
            target = target + timedelta(days=1)
        await _a.sleep((target - now).total_seconds())
        try:
            res = take_snapshot()
            logging.info(f"[media_backup] Daily snapshot: {res}")
        except Exception as e:
            logging.error(f"[media_backup] snapshot loop error: {e}")
