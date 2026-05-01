"""
App Version endpoint — used by the frontend AppVersionGuard to detect new
deployments and auto-clear stale browser caches / service workers.

Every time the backend process (re)starts — which happens on every deploy —
BUILD_VERSION regenerates. Frontend compares the version it saw last time
with the current one and, if they differ, clears caches and hard-reloads.
"""
from fastapi import APIRouter
from datetime import datetime, timezone
import os
import time

router = APIRouter(prefix="/api", tags=["version"])

# Regenerated on every process start. The cheapest reliable build-stamp.
_STARTED_AT = datetime.now(timezone.utc).isoformat()
_VERSION = str(int(time.time()))
_RUNTIME_ENV = os.environ.get("APP_ENV", "production")


@router.get("/version")
async def get_version():
    """Public endpoint — returns the current backend process start-timestamp.
    Frontend polls this and triggers a hard reload when the version changes."""
    return {
        "version": _VERSION,
        "started_at": _STARTED_AT,
        "env": _RUNTIME_ENV,
    }
