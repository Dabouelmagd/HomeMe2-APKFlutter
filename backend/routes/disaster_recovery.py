"""
Disaster Recovery Wizard — full DB + media snapshot/restore for SuperAdmin.

Endpoints (all SuperAdmin only):
  GET  /api/super-admin/disaster-recovery/preview   → manifest summary (collections, sizes)
  GET  /api/super-admin/disaster-recovery/snapshot  → streams a single .zip
  POST /api/super-admin/disaster-recovery/restore   → uploads a .zip and restores

Snapshot ZIP layout:
  ├── manifest.json                  ← version, timestamp, app_version, sha256, collections[], media[]
  ├── collections/<name>.json        ← bson_extjson dump per collection (one file each)
  └── media/<filename>               ← raw binary blobs from `media_files` collection

Restore strategy:
  - Validates manifest.json + per-collection sha256.
  - For each collection: drops + bulk-inserts (atomic per collection).
  - For media: re-imports binary into `media_files` collection.
  - Always stamps `disaster_recovery_runs` with the result.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse, JSONResponse
from datetime import datetime, timezone
import io
import json
import zipfile
import hashlib
import uuid
import logging

from bson import json_util

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api/super-admin/disaster-recovery", tags=["disaster-recovery"])

# Collections that should never be exported / restored (huge or runtime-only)
EXCLUDED_COLLECTIONS = {
    "fs.files", "fs.chunks",      # legacy gridfs (we use media_files instead)
    "perf_samples",                # synthetic perf stream (regenerable)
    "smoke_test_runs",              # synthetic monitor stream (regenerable)
}

APP_VERSION = "homeme-1.0"


def _require_super_admin(user: dict):
    role = user.get("role")
    if role not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="مطلوب صلاحية سوبر أدمن")


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# ---------------------------------------------------------------------------
# 1. PREVIEW
# ---------------------------------------------------------------------------
@router.get("/preview")
async def disaster_recovery_preview(current_user: dict = Depends(get_current_user)):
    """ملخص ما سيشمله الـ Snapshot قبل التنزيل."""
    _require_super_admin(current_user)
    db = get_db()
    cols = sorted([c for c in await db.list_collection_names() if c not in EXCLUDED_COLLECTIONS])
    out = []
    total_docs = 0
    for c in cols:
        n = await db[c].count_documents({})
        total_docs += n
        out.append({"name": c, "count": n})

    media_count = await db.media_files.count_documents({})
    return {
        "collections": out,
        "collections_count": len(out),
        "total_documents": total_docs,
        "media_files_count": media_count,
        "excluded": sorted(EXCLUDED_COLLECTIONS),
        "app_version": APP_VERSION,
    }


# ---------------------------------------------------------------------------
# 2. SNAPSHOT (download)
# ---------------------------------------------------------------------------
@router.get("/snapshot")
async def disaster_recovery_snapshot(current_user: dict = Depends(get_current_user)):
    """ينشئ ZIP يحتوي كل مجموعات MongoDB + ملفات الوسائط + manifest موقّع."""
    _require_super_admin(current_user)
    db = get_db()

    buf = io.BytesIO()
    manifest_collections = []
    manifest_media = []

    cols = sorted([c for c in await db.list_collection_names() if c not in EXCLUDED_COLLECTIONS])

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        # 2a. Collections — MongoDB Extended JSON (preserves ObjectId, datetime, Binary)
        for col in cols:
            docs = []
            async for doc in db[col].find({}):
                docs.append(doc)
            payload = json_util.dumps(docs, ensure_ascii=False, indent=None).encode("utf-8")
            zf.writestr(f"collections/{col}.json", payload)
            manifest_collections.append({
                "name": col,
                "count": len(docs),
                "sha256": _sha256(payload),
                "size_bytes": len(payload),
            })

        # 2b. Media binaries — already mirrored in media_files collection (dual-write)
        async for media in db.media_files.find({}):
            filename = media.get("filename")
            if not filename:
                continue
            data = media.get("data")
            if hasattr(data, "decode") is False and hasattr(data, "__bytes__"):
                # bson Binary — convert
                try:
                    data = bytes(data)
                except Exception:
                    continue
            elif isinstance(data, str):
                try:
                    data = data.encode("latin-1")
                except Exception:
                    continue
            elif data is None:
                continue
            try:
                zf.writestr(f"media/{filename}", data)
                manifest_media.append({
                    "filename": filename,
                    "content_type": media.get("content_type"),
                    "size_bytes": len(data),
                    "sha256": _sha256(data),
                })
            except Exception as e:
                logging.warning(f"DR snapshot: skipped media {filename}: {e}")

        # 2c. Manifest — last so consumers can verify it exists
        manifest = {
            "version": "1",
            "app_version": APP_VERSION,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "generated_by": current_user.get("id"),
            "generated_by_username": current_user.get("username"),
            "collections": manifest_collections,
            "media": manifest_media,
            "totals": {
                "collections": len(manifest_collections),
                "documents": sum(c["count"] for c in manifest_collections),
                "media_files": len(manifest_media),
            },
        }
        manifest_bytes = json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")
        zf.writestr("manifest.json", manifest_bytes)

    buf.seek(0)
    zip_bytes = buf.getvalue()

    # Audit
    try:
        await db.disaster_recovery_runs.insert_one({
            "id": str(uuid.uuid4()),
            "action": "snapshot",
            "user_id": current_user.get("id"),
            "username": current_user.get("username"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "size_bytes": len(zip_bytes),
            "collections": len(manifest_collections),
            "media_files": len(manifest_media),
        })
    except Exception:
        pass

    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    headers = {"Content-Disposition": f'attachment; filename="homeme-disaster-recovery-{ts}.zip"'}
    return StreamingResponse(io.BytesIO(zip_bytes), media_type="application/zip", headers=headers)


# ---------------------------------------------------------------------------
# 3. RESTORE (upload)
# ---------------------------------------------------------------------------
@router.post("/restore")
async def disaster_recovery_restore(
    file: UploadFile = File(...),
    confirm: str = Query(..., description="يجب أن تكون الكلمة 'I_UNDERSTAND_OVERWRITE' للتأكيد"),
    current_user: dict = Depends(get_current_user),
):
    """استعادة كاملة من ZIP. ⚠️ يُعيد الكتابة فوق المجموعات الموجودة."""
    _require_super_admin(current_user)
    if confirm != "I_UNDERSTAND_OVERWRITE":
        raise HTTPException(status_code=400, detail="تأكيد الاستعادة مفقود — أرسل confirm=I_UNDERSTAND_OVERWRITE")

    db = get_db()
    raw = await file.read()
    if len(raw) < 100:
        raise HTTPException(status_code=400, detail="الملف فارغ أو غير صالح")

    try:
        zf = zipfile.ZipFile(io.BytesIO(raw))
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="الملف ليس ZIP صالح")

    # Manifest check
    try:
        manifest = json.loads(zf.read("manifest.json"))
    except KeyError:
        raise HTTPException(status_code=400, detail="manifest.json مفقود")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"manifest.json غير صالح: {e}")

    expected_cols = {c["name"]: c for c in manifest.get("collections", [])}
    expected_media = {m["filename"]: m for m in manifest.get("media", [])}

    restored_cols = []
    restored_media = []
    errors = []

    # 3a. Collections
    for name, meta in expected_cols.items():
        path = f"collections/{name}.json"
        try:
            payload = zf.read(path)
        except KeyError:
            errors.append(f"missing collection file: {path}")
            continue
        if _sha256(payload) != meta.get("sha256"):
            errors.append(f"sha256 mismatch for {name}")
            continue
        try:
            docs = json_util.loads(payload.decode("utf-8"))
        except Exception as e:
            errors.append(f"parse failed for {name}: {e}")
            continue
        try:
            await db[name].drop()
            if docs:
                await db[name].insert_many(docs)
            restored_cols.append({"name": name, "count": len(docs)})
        except Exception as e:
            errors.append(f"insert failed for {name}: {e}")

    # 3b. Media — re-import binaries directly into media_files (dual-write target)
    for filename, meta in expected_media.items():
        try:
            data = zf.read(f"media/{filename}")
        except KeyError:
            errors.append(f"missing media file: {filename}")
            continue
        if _sha256(data) != meta.get("sha256"):
            errors.append(f"media sha256 mismatch: {filename}")
            continue
        try:
            from bson import Binary
            await db.media_files.update_one(
                {"filename": filename},
                {"$set": {
                    "filename": filename,
                    "content_type": meta.get("content_type"),
                    "data": Binary(data),
                    "size_bytes": len(data),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
                upsert=True,
            )
            restored_media.append(filename)
        except Exception as e:
            errors.append(f"media restore failed for {filename}: {e}")

    # Audit
    try:
        await db.disaster_recovery_runs.insert_one({
            "id": str(uuid.uuid4()),
            "action": "restore",
            "user_id": current_user.get("id"),
            "username": current_user.get("username"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "manifest_generated_at": manifest.get("generated_at"),
            "manifest_generated_by": manifest.get("generated_by_username"),
            "restored_collections": len(restored_cols),
            "restored_media_files": len(restored_media),
            "errors": errors,
        })
    except Exception:
        pass

    return JSONResponse({
        "success": len(errors) == 0,
        "manifest_generated_at": manifest.get("generated_at"),
        "manifest_generated_by": manifest.get("generated_by_username"),
        "restored": {
            "collections": restored_cols,
            "collections_count": len(restored_cols),
            "media_files_count": len(restored_media),
        },
        "errors": errors,
    })


# ---------------------------------------------------------------------------
# 4. HISTORY
# ---------------------------------------------------------------------------
@router.get("/history")
async def disaster_recovery_history(
    limit: int = Query(20, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    _require_super_admin(current_user)
    db = get_db()
    docs = await db.disaster_recovery_runs.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).to_list(limit)
    return {"runs": docs, "total": len(docs)}
