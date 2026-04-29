"""
Performance Budget Routes

- GET  /api/system/perf-budget/overview      — top slowest endpoints with baselines + sparklines
- GET  /api/system/perf-budget/regressions   — currently regressed endpoints
- POST /api/system/perf-budget/recompute     — manually recompute baselines (owner-only)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from auth_deps import get_current_user
from services.perf_budget import (
    get_overview, get_active_regressions, recompute_baselines, detect_regressions,
)

router = APIRouter(prefix="/api/system/perf-budget", tags=["perf-budget"])


def _require_owner(current_user: dict):
    role = (current_user or {}).get("role")
    if role not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="هذه الميزة متاحة للمالك فقط")
    return current_user


@router.get("/overview")
async def overview(limit: int = 30, current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    return await get_overview(limit=min(max(limit, 5), 100))


@router.get("/regressions")
async def regressions(current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    return await get_active_regressions()


@router.post("/recompute")
async def recompute(current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    bl = await recompute_baselines()
    rg = await detect_regressions()
    return {
        "baselines": bl,
        "new_regressions": len(rg["new_regressions"]),
        "resolved": len(rg["resolved"]),
        "currently_regressed": len(rg["currently_regressed"]),
    }
