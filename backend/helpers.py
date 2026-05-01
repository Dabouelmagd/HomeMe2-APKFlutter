"""
Shared helper/utility functions for HomeMe backend.
"""
from datetime import datetime, date, timezone
import logging


def serialize_datetime(obj):
    """Convert datetime objects, date objects, and ObjectIds to JSON serializable format"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, date):
        return obj.isoformat()
    elif hasattr(obj, '__class__') and obj.__class__.__name__ == 'ObjectId':
        return str(obj)
    elif isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
    return obj


async def notify_compound_admins(compound_id: str, title: str, content: str, action_type: str, exclude_user_id: str = None):
    """Send notification to all admins of a compound — including the parent
    management-company admins (company_admin / assistant_manager / accountant)
    so they receive a copy of every critical event in their compounds.
    Also fires an email best-effort to each admin who has an email on file.
    """
    from database import get_db
    import uuid, asyncio  # noqa: E401
    db = get_db()
    try:
        # 1) Compound-scoped admins (per-compound staff)
        scoped_query = {
            "compound_id": compound_id,
            "role": {"$in": ["admin", "super_admin", "manager", "assistant_manager", "accountant"]}
        }
        admins = await db.users.find(scoped_query).to_list(100)

        # 2) Resolve the compound's parent management company and pull its admins
        cpd = await db.compounds.find_one(
            {"id": compound_id},
            {"_id": 0, "company_id": 1, "management_company_id": 1, "name": 1}
        ) or {}
        parent_company_id = cpd.get("company_id") or cpd.get("management_company_id")
        if parent_company_id:
            company_admins = await db.users.find(
                {
                    "company_id": parent_company_id,
                    "role": {"$in": ["company_admin", "assistant_manager", "accountant"]},
                }
            ).to_list(50)
            # De-dup by id
            seen_ids = {a.get("id") for a in admins}
            for ca in company_admins:
                if ca.get("id") not in seen_ids:
                    admins.append(ca)
                    seen_ids.add(ca.get("id"))

        compound_name = cpd.get("name") or ""

        # 3) Persist in-app notifications + collect emails for fanout
        emails_to_notify = []
        for admin in admins:
            if exclude_user_id and admin.get("id") == exclude_user_id:
                continue
            notification = {
                "id": str(uuid.uuid4()),
                "user_id": admin["id"],
                "compound_id": compound_id,
                "title": title,
                "content": content,
                "type": action_type,
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.notifications.insert_one(notification)
            email = (admin.get("email") or "").strip()
            if email and admin.get("role") in ("company_admin", "assistant_manager", "accountant"):
                emails_to_notify.append((email, admin.get("full_name") or admin.get("username")))

        # 4) Best-effort email fanout to company-level admins (do not block on failure)
        if emails_to_notify:
            try:
                from email_service import EmailService
                svc = EmailService()
                subject = f"[{compound_name}] {title}" if compound_name else title
                html = f"""
                <div style='font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;padding:12px;'>
                  <h3 style='color:#4338ca;margin:0 0 8px;'>{title}</h3>
                  <p style='color:#374151;'>{content}</p>
                  <p style='color:#6b7280;font-size:12px;margin-top:16px;'>الكمبوند: <b>{compound_name}</b></p>
                  <hr style='border:none;border-top:1px solid #e5e7eb;'>
                  <p style='color:#9ca3af;font-size:11px;'>HomeMe — إشعار تلقائي لمدير الشركة</p>
                </div>
                """.strip()
                async def _fanout():
                    for email_addr, _ in emails_to_notify:
                        try:
                            await svc.send_email(to_email=email_addr, subject=subject, html_content=html)
                        except Exception:
                            pass
                # Fire and forget
                asyncio.create_task(_fanout())
            except Exception as e:
                logging.warning(f"Email fanout setup failed: {e}")
    except Exception as e:
        logging.error(f"Error notifying admins: {e}")
