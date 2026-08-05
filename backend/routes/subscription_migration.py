"""
Migration Tool — Owner/Super-Admin tool to migrate one-time-paid companies to auto-renewal.

Identifies companies that are "active" but lack `stripe_subscription_id` (i.e. paid via
old one-time Checkout flow) and lets the owner send them an opt-in email with a CTA
to "Upgrade to Auto-Renew."

Endpoints:
- GET  /api/subscription-migration/candidates  — list eligible companies (paginated)
- POST /api/subscription-migration/invite      — send opt-in email to selected company_ids
- GET  /api/subscription-migration/stats       — overall migration progress
"""
import logging
import os
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from database import get_db
from auth_deps import require_app_owner, require_super_admin
from email_service import email_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/subscription-migration", tags=["migration"])

APP_PUBLIC_URL = os.environ.get("APP_PUBLIC_URL", "https://homemeapp.net").rstrip("/")


PLAN_LABELS = {
    "company_startup": "شركة ناشئة",
    "company_business": "شركة متوسطة",
    "company_enterprise": "شركة كبرى",
}


class CandidateItem(BaseModel):
    company_id: str
    company_name: str
    contact_email: str = ""
    plan: str = ""
    plan_name_ar: str = ""
    expires_at: str = ""
    last_invited_at: str = ""
    invite_count: int = 0


class InviteRequest(BaseModel):
    company_ids: List[str] = Field(..., min_items=1, max_items=200)


class InviteResponse(BaseModel):
    sent: int
    failed: int
    skipped: int  # missing email


def _build_invite_html(company_name: str, plan_label: str, expires_at: str) -> str:
    expires_pretty = expires_at[:10] if expires_at else ""
    return f"""<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
        <tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:32px;text-align:center;color:#fff;">
          <h1 style="margin:0;font-size:24px;font-weight:800;">🔁 لا تنشغل بالتجديد بعد اليوم</h1>
        </td></tr>
        <tr><td style="padding:32px 32px 8px;text-align:right;">
          <p style="margin:0 0 12px;color:#1f2937;font-size:16px;font-weight:700;">{company_name},</p>
          <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">
            اشتراككم في خطة <b>{plan_label}</b> سينتهي في <b style="color:#dc2626;">{expires_pretty}</b>.
          </p>
          <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">
            بدلاً من التجديد اليدوي كل شهر، فعّلوا <b style="color:#059669;">"التجديد التلقائي"</b> الجديد عبر Stripe ولا تنشغلوا بالموضوع تاني:
          </p>
          <ul style="color:#374151;font-size:13px;line-height:1.9;padding-right:18px;">
            <li>✅ تجديد تلقائي كل دورة بدون انقطاع للخدمة</li>
            <li>✅ خصم <b>17%</b> عند اختيار الفوترة السنوية</li>
            <li>✅ بوابة Stripe لإدارة الكارت/الفواتير في أي وقت</li>
            <li>✅ تقدروا تلغوا في أي لحظة بضغطة زرار</li>
          </ul>
        </td></tr>
        <tr><td style="padding:8px 32px 28px;text-align:center;">
          <a href="{APP_PUBLIC_URL}/app/my-subscription"
             style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:14px;box-shadow:0 4px 14px rgba(16,185,129,.4);">
            🔁 فعّل التجديد التلقائي الآن
          </a>
          <p style="margin:14px 0 0;color:#6b7280;font-size:11px;">
            رابط مباشر: <a href="{APP_PUBLIC_URL}/app/my-subscription" style="color:#059669;">{APP_PUBLIC_URL}/app/my-subscription</a>
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:11px;">
          إذا لم تقوموا بالترقية، يمكنكم الاستمرار في التجديد اليدوي. هذه دعوة اختيارية لتسهيل إدارة الاشتراك.<br>
          HomeMe — منصة إدارة المجمعات السكنية
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


@router.get("/candidates", response_model=List[CandidateItem])
async def list_candidates(
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(require_app_owner),
):
    """List active companies still on legacy one-time billing (no stripe_subscription_id)."""
    db = get_db()
    cursor = db.company_subscriptions.find(
        {
            "status": "active",
            "$or": [
                {"stripe_subscription_id": {"$exists": False}},
                {"stripe_subscription_id": None},
                {"stripe_subscription_id": ""},
            ],
        },
        {"_id": 0},
    ).skip(skip).limit(min(limit, 200))
    subs = await cursor.to_list(length=limit)

    items: List[CandidateItem] = []
    for s in subs:
        cid = s.get("company_id")
        if not cid:
            continue
        company = await db.management_companies.find_one(
            {"id": cid}, {"_id": 0, "name": 1, "contact_email": 1}
        ) or {}
        plan = s.get("plan") or ""
        items.append(CandidateItem(
            company_id=cid,
            company_name=company.get("name") or "—",
            contact_email=company.get("contact_email") or "",
            plan=plan,
            plan_name_ar=PLAN_LABELS.get(plan, plan),
            expires_at=s.get("expires_at") or "",
            last_invited_at=s.get("auto_renew_invite_last_at") or "",
            invite_count=s.get("auto_renew_invite_count") or 0,
        ))
    return items


@router.get("/stats")
async def migration_stats(current_user: dict = Depends(require_super_admin)):
    """Overall migration progress for the Owner."""
    db = get_db()
    total_active = await db.company_subscriptions.count_documents({"status": "active"})
    on_auto = await db.company_subscriptions.count_documents({
        "status": "active",
        "stripe_subscription_id": {"$nin": [None, ""]},
    })
    legacy = total_active - on_auto
    invited_total = await db.company_subscriptions.count_documents({
        "auto_renew_invite_count": {"$gte": 1},
    })
    return {
        "total_active": total_active,
        "on_auto_renew": on_auto,
        "legacy_one_time": legacy,
        "invited_at_least_once": invited_total,
        "migration_percent": round((on_auto / total_active * 100), 1) if total_active else 0,
    }


@router.post("/invite", response_model=InviteResponse)
async def invite_companies(
    body: InviteRequest,
    current_user: dict = Depends(require_app_owner),
):
    """Send Auto-Renew opt-in invite to selected companies' contact_email."""
    db = get_db()
    sent = 0
    failed = 0
    skipped = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for cid in body.company_ids:
        company = await db.management_companies.find_one(
            {"id": cid}, {"_id": 0, "name": 1, "contact_email": 1}
        )
        if not company or not company.get("contact_email"):
            skipped += 1
            continue
        sub = await db.company_subscriptions.find_one(
            {"company_id": cid}, {"_id": 0, "plan": 1, "expires_at": 1}
        ) or {}
        plan = sub.get("plan") or ""
        try:
            html = _build_invite_html(
                company_name=company["name"],
                plan_label=PLAN_LABELS.get(plan, plan),
                expires_at=sub.get("expires_at") or "",
            )
            ok = await email_service.send_email(
                company["contact_email"],
                "🔁 ترقية لخاصية التجديد التلقائي - HomeMe",
                html,
            )
            if ok:
                sent += 1
                await db.company_subscriptions.update_one(
                    {"company_id": cid},
                    {"$set": {"auto_renew_invite_last_at": now_iso},
                     "$inc": {"auto_renew_invite_count": 1}},
                )
            else:
                failed += 1
        except Exception as e:
            failed += 1
            logger.exception(f"[migration] invite failed for {cid}: {e}")

    # Audit
    await db.subscription_migration_log.insert_one({
        "actor_id": current_user.get("id"),
        "company_ids": body.company_ids,
        "sent": sent,
        "failed": failed,
        "skipped": skipped,
        "created_at": now_iso,
    })
    return InviteResponse(sent=sent, failed=failed, skipped=skipped)
