"""
SMTP Health Tracker — endpoints to monitor email-send reliability.

Collection `smtp_health` is populated by EmailService._send_email_sync on every attempt.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone, timedelta
from collections import defaultdict

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api/system/smtp-health")


def _admin_only(user: dict):
    if user.get("role") not in ("app_owner", "super_admin", "admin", "compound_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/stats")
async def smtp_health_stats(
    hours: int = Query(24, ge=1, le=720),
    threshold: float = Query(0.30, ge=0, le=1, description="Failure-rate alert threshold (0-1)"),
    current_user: dict = Depends(get_current_user),
):
    _admin_only(current_user)
    db = get_db()
    since_iso = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()

    total = await db.smtp_health.count_documents({"timestamp": {"$gte": since_iso}})
    success = await db.smtp_health.count_documents({"timestamp": {"$gte": since_iso}, "success": True})
    failed = total - success
    rate = (success / total) if total else 1.0
    fail_rate = 1 - rate

    # Per-mailbox stats
    by_mailbox: dict = {}
    async for doc in db.smtp_health.find({"timestamp": {"$gte": since_iso}}, {"_id": 0, "mailbox": 1, "success": 1, "duration_ms": 1}):
        mb = doc.get("mailbox", "unknown")
        b = by_mailbox.setdefault(mb, {"total": 0, "success": 0, "duration_sum": 0})
        b["total"] += 1
        b["duration_sum"] += int(doc.get("duration_ms") or 0)
        if doc.get("success"):
            b["success"] += 1
    for mb, b in by_mailbox.items():
        b["success_rate"] = round((b["success"] / b["total"]) if b["total"] else 1.0, 4)
        b["avg_duration_ms"] = int(b["duration_sum"] / b["total"]) if b["total"] else 0
        del b["duration_sum"]

    # Trends — hourly buckets
    buckets = defaultdict(lambda: {"total": 0, "success": 0})
    async for doc in db.smtp_health.find({"timestamp": {"$gte": since_iso}}, {"_id": 0, "timestamp": 1, "success": 1}):
        # bucket by hour: "YYYY-MM-DDTHH"
        key = (doc.get("timestamp") or "")[:13]
        if not key:
            continue
        b = buckets[key]
        b["total"] += 1
        if doc.get("success"):
            b["success"] += 1
    trend = sorted([
        {"hour": k, "total": v["total"], "success": v["success"], "failed": v["total"] - v["success"]}
        for k, v in buckets.items()
    ], key=lambda x: x["hour"])

    # Recent failures
    failures = await db.smtp_health.find(
        {"timestamp": {"$gte": since_iso}, "success": False},
        {"_id": 0},
    ).sort("timestamp", -1).limit(20).to_list(length=20)

    alert = (fail_rate > threshold) and (total >= 5)

    return {
        "window_hours": hours,
        "total": total,
        "success": success,
        "failed": failed,
        "success_rate": round(rate, 4),
        "failure_rate": round(fail_rate, 4),
        "alert": alert,
        "alert_threshold": threshold,
        "by_mailbox": by_mailbox,
        "trend": trend,
        "recent_failures": failures,
    }


@router.post("/test-send")
async def smtp_test_send(
    to_email: str = Query(...),
    mailbox: str = Query("main"),
    current_user: dict = Depends(get_current_user),
):
    """Trigger a synthetic test email to validate SMTP path. Records into smtp_health."""
    if current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="Owner access required")
    from email_service import EmailService
    svc = EmailService()
    ok = await svc.send_email(
        to_email=to_email,
        subject="HomeMe — اختبار اتصال SMTP",
        html_content=f"<p>هذا بريد اختباري من HomeMe ({mailbox}). الوقت: {datetime.now(timezone.utc).isoformat()}</p>",
        mailbox=mailbox,
    )
    return {"sent": ok, "to": to_email, "mailbox": mailbox}
