"""
AI Auto-Pilot — scheduled execution of AI Actions without admin intervention.

Key concepts:
- Each compound has a per-action AutoPilot config: {enabled, frequency, day_of_week, hour_utc, last_run_at}
- Background loop runs every 15 min, checks all enabled configs, and triggers eligible runs
- Frequency: "weekly" (every Mon/Sun at hour X UTC) or "daily" (every day at hour X UTC)
- Each run respects daily-summary throttle: max 1 run per config per day (no duplicate sends if loop wakes twice)
- Audit trail: every auto-pilot run logged in `ai_action_log` with `actor_id="auto_pilot"`

Endpoints:
- GET    /api/ai-autopilot/configs?compound_id=X      — list configs for a compound
- PUT    /api/ai-autopilot/configs/{insight_id}       — upsert config (enable/disable + schedule)
- GET    /api/ai-autopilot/runs?compound_id=X         — recent runs for monitoring dashboard
- POST   /api/ai-autopilot/run-now/{insight_id}       — manually trigger a run (testing)
"""
import os
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from database import get_db
from auth_deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai-autopilot", tags=["ai-autopilot"])


SUPPORTED_INSIGHTS = ("late_invoices", "old_maintenance", "negative_ratings")


class AutoPilotConfig(BaseModel):
    insight_id: Literal["late_invoices", "old_maintenance", "negative_ratings"]
    compound_id: str
    enabled: bool = False
    frequency: Literal["daily", "weekly"] = "weekly"
    day_of_week: int = Field(0, ge=0, le=6, description="0=Monday, 6=Sunday")
    hour_utc: int = Field(9, ge=0, le=23)
    last_run_at: Optional[str] = None
    last_status: Optional[str] = None  # "success" | "no_recipients" | "error"
    last_sent: Optional[int] = None


class ConfigUpsert(BaseModel):
    enabled: bool
    frequency: Literal["daily", "weekly"] = "weekly"
    day_of_week: int = Field(0, ge=0, le=6)
    hour_utc: int = Field(9, ge=0, le=23)


class RunLog(BaseModel):
    id: str
    insight_id: str
    compound_id: str
    triggered_at: str
    status: str
    sent: int = 0
    failed: int = 0
    recipient_count: int = 0
    triggered_by: str = "auto_pilot"


def _require_admin(current_user: dict):
    if current_user.get("role") not in ("admin", "manager", "company_admin", "super_admin", "app_owner"):
        raise HTTPException(status_code=403, detail="غير مصرح")


@router.get("/configs", response_model=List[AutoPilotConfig])
async def list_configs(compound_id: str, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    db = get_db()
    cursor = db.ai_autopilot_configs.find(
        {"compound_id": compound_id},
        {"_id": 0},
    )
    items = await cursor.to_list(length=50)
    found_ids = {i["insight_id"] for i in items}
    # Fill in defaults for missing
    for iid in SUPPORTED_INSIGHTS:
        if iid not in found_ids:
            items.append({
                "insight_id": iid,
                "compound_id": compound_id,
                "enabled": False,
                "frequency": "weekly",
                "day_of_week": 0,
                "hour_utc": 9,
                "last_run_at": None,
                "last_status": None,
                "last_sent": None,
            })
    return [AutoPilotConfig(**i) for i in items]


@router.put("/configs/{insight_id}")
async def upsert_config(
    insight_id: str,
    body: ConfigUpsert,
    compound_id: str,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    if insight_id not in SUPPORTED_INSIGHTS:
        raise HTTPException(status_code=400, detail="نوع غير مدعوم")
    db = get_db()
    await db.ai_autopilot_configs.update_one(
        {"insight_id": insight_id, "compound_id": compound_id},
        {"$set": {
            "insight_id": insight_id,
            "compound_id": compound_id,
            "enabled": body.enabled,
            "frequency": body.frequency,
            "day_of_week": body.day_of_week,
            "hour_utc": body.hour_utc,
            "updated_by": current_user.get("id"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True}


@router.get("/runs", response_model=List[RunLog])
async def list_runs(
    compound_id: str,
    limit: int = 30,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    db = get_db()
    cursor = db.ai_autopilot_runs.find(
        {"compound_id": compound_id},
        {"_id": 0},
    ).sort("triggered_at", -1).limit(min(limit, 100))
    items = await cursor.to_list(length=limit)
    return [RunLog(**i) for i in items]


# ============================================================================
# Manual trigger (for testing)
# ============================================================================
@router.post("/run-now/{insight_id}")
async def run_now(
    insight_id: str,
    compound_id: str,
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    if insight_id not in SUPPORTED_INSIGHTS:
        raise HTTPException(status_code=400, detail="نوع غير مدعوم")
    result = await _execute_autopilot_run(
        insight_id=insight_id,
        compound_id=compound_id,
        triggered_by=f"manual:{current_user.get('id')}",
    )
    return result


@router.post("/digest/send-now")
async def send_digest_now_endpoint(
    compound_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Manually fire the weekly digest email — useful for testing/preview."""
    _require_admin(current_user)
    from services.autopilot_digest import send_digest_now
    await send_digest_now(compound_id)
    return {"ok": True, "message": "تم إرسال ملخص AutoPilot الأسبوعي"}


# ============================================================================
# Core: execute one auto-pilot run
# ============================================================================
async def _execute_autopilot_run(insight_id: str, compound_id: str, triggered_by: str):
    """Run a single auto-pilot job: draft + execute, then log."""
    db = get_db()
    import uuid
    run_id = str(uuid.uuid4())
    triggered_at = datetime.now(timezone.utc).isoformat()

    try:
        # Reuse logic from ai_actions.py
        from routes.ai_actions import (
            _resolve_recipients,
            _generate_message,
            ACTION_CATALOG,
            _personalize,
            _wrap_html,
        )
        from email_service import email_service

        recipients = await _resolve_recipients(db, insight_id, compound_id)
        if not recipients:
            log = {
                "id": run_id,
                "insight_id": insight_id,
                "compound_id": compound_id,
                "triggered_at": triggered_at,
                "status": "no_recipients",
                "sent": 0,
                "failed": 0,
                "recipient_count": 0,
                "triggered_by": triggered_by,
            }
            await db.ai_autopilot_runs.insert_one(log)
            await _update_config_last_run(db, insight_id, compound_id, "no_recipients", 0)
            return {**log, "_id": None}

        compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0, "name": 1})
        compound_name = (compound or {}).get("name")

        cat = ACTION_CATALOG[insight_id]
        message = await _generate_message(insight_id, len(recipients), compound_name)

        sent = 0
        failed = 0
        for r in recipients:
            try:
                personalized = _personalize(message, r)
                html = _wrap_html(personalized, cat["subject"])
                ok = await email_service.send_email(r.email, cat["subject"], html)
                if ok:
                    sent += 1
                else:
                    failed += 1
            except Exception as e:
                failed += 1
                logger.error(f"AutoPilot email to {r.email} failed: {e}")

        log = {
            "id": run_id,
            "insight_id": insight_id,
            "compound_id": compound_id,
            "triggered_at": triggered_at,
            "status": "success" if sent > 0 else "all_failed",
            "sent": sent,
            "failed": failed,
            "recipient_count": len(recipients),
            "triggered_by": triggered_by,
        }
        await db.ai_autopilot_runs.insert_one(log)
        await _update_config_last_run(db, insight_id, compound_id, log["status"], sent)
        # Mirror in audit trail (ai_action_log)
        await db.ai_action_log.insert_one({
            "actor_id": "auto_pilot",
            "actor_name": "AI Auto-Pilot",
            "type": "execute",
            "insight_id": insight_id,
            "compound_id": compound_id,
            "subject": cat["subject"],
            "recipient_count": len(recipients),
            "sent": sent,
            "failed": failed,
            "auto_pilot": True,
            "created_at": triggered_at,
        })
        # Invalidate insights cache so dashboard shows updated state
        await db.ai_insights_cache.delete_one({"_id": f"insights_{compound_id}"})
        return {**log, "_id": None}

    except Exception as e:
        logger.exception(f"AutoPilot run failed: {e}")
        log = {
            "id": run_id,
            "insight_id": insight_id,
            "compound_id": compound_id,
            "triggered_at": triggered_at,
            "status": "error",
            "sent": 0,
            "failed": 0,
            "recipient_count": 0,
            "triggered_by": triggered_by,
            "error": str(e)[:300],
        }
        await db.ai_autopilot_runs.insert_one(log)
        await _update_config_last_run(db, insight_id, compound_id, "error", 0)
        return {**log, "_id": None}


async def _update_config_last_run(db, insight_id: str, compound_id: str, status: str, sent: int):
    await db.ai_autopilot_configs.update_one(
        {"insight_id": insight_id, "compound_id": compound_id},
        {"$set": {
            "last_run_at": datetime.now(timezone.utc).isoformat(),
            "last_status": status,
            "last_sent": sent,
        }},
    )


# ============================================================================
# Background scheduler loop
# ============================================================================
async def autopilot_loop(check_interval_seconds: int = 900):
    """
    Wakes every 15 min. For each enabled config:
    - Daily: trigger if (current_hour_utc == hour_utc) and (no run today yet)
    - Weekly: trigger if (current_dow == day_of_week) and (current_hour_utc == hour_utc) and (no run this week yet)
    """
    while True:
        try:
            db = get_db()
            now = datetime.now(timezone.utc)
            current_hour = now.hour
            current_dow = now.weekday()  # 0=Mon, 6=Sun
            today_key = now.strftime("%Y-%m-%d")
            week_start = now - timedelta(days=current_dow)
            week_key = week_start.strftime("%Y-W%V")

            cursor = db.ai_autopilot_configs.find({"enabled": True})
            configs = await cursor.to_list(length=1000)

            for cfg in configs:
                if cfg.get("hour_utc", 9) != current_hour:
                    continue
                if cfg["frequency"] == "weekly" and cfg.get("day_of_week", 0) != current_dow:
                    continue

                # Throttle: avoid double-run if loop wakes at the same hour twice in same window
                last_run_at = cfg.get("last_run_at")
                if last_run_at:
                    try:
                        last_dt = datetime.fromisoformat(last_run_at)
                        if cfg["frequency"] == "daily":
                            if last_dt.strftime("%Y-%m-%d") == today_key:
                                continue
                        else:  # weekly
                            last_week = last_dt - timedelta(days=last_dt.weekday())
                            if last_week.strftime("%Y-W%V") == week_key:
                                continue
                    except Exception:
                        pass

                # Fire (don't block the loop on failures)
                try:
                    await _execute_autopilot_run(
                        insight_id=cfg["insight_id"],
                        compound_id=cfg["compound_id"],
                        triggered_by="auto_pilot:scheduler",
                    )
                    logger.info(f"AutoPilot fired: {cfg['insight_id']} for compound {cfg['compound_id']}")
                except Exception as e:
                    logger.exception(f"AutoPilot fire failed: {e}")

        except Exception as e:
            logger.exception(f"AutoPilot loop iteration failed: {e}")

        await asyncio.sleep(check_interval_seconds)
