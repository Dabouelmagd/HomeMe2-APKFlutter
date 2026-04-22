"""
Technical Support — receives user complaints / bug reports / contact requests
and routes them to homeme_residence@datalifeai.com (SUPPORT_EMAIL).
"""
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, constr
import jwt

from database import get_db
from email_service import email_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')


async def _optional_user(request: Request, db) -> Optional[dict]:
    """Extract current user from Authorization header without forcing auth."""
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return None
    try:
        token = auth.split(" ", 1)[1].strip()
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        uid = payload.get("sub")
        if not uid:
            return None
        user = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
        return user
    except Exception:
        return None


class SupportTicketCreate(BaseModel):
    name: constr(min_length=2, max_length=120)
    email: EmailStr
    subject: constr(min_length=3, max_length=200)
    message: constr(min_length=10, max_length=4000)
    category: Optional[str] = "general"  # general | bug | feature_request | complaint | security
    phone: Optional[str] = None


@router.post("/support/contact")
async def submit_support_ticket(
    payload: SupportTicketCreate,
    request: Request,
    db=Depends(get_db),
):
    """
    Public endpoint: any visitor or logged-in user can submit a support ticket.
    Stores it in DB and forwards a formatted email to SUPPORT_EMAIL.
    """
    current_user = await _optional_user(request, db)
    support_email = os.environ.get("SUPPORT_EMAIL", "homeme_residence@datalifeai.com")

    ticket = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "email": payload.email,
        "subject": payload.subject,
        "message": payload.message,
        "category": payload.category or "general",
        "phone": payload.phone or "",
        "user_id": current_user.get("id") if current_user else None,
        "username": current_user.get("username") if current_user else None,
        "user_role": current_user.get("role") if current_user else None,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.support_tickets.insert_one(ticket.copy())

    # Build email
    category_labels = {
        "general": "استفسار عام",
        "bug": "بلاغ خطأ تقني",
        "feature_request": "اقتراح ميزة جديدة",
        "complaint": "شكوى",
        "security": "مخاوف أمنية",
    }
    cat_label = category_labels.get(ticket["category"], ticket["category"])

    html = f"""
    <!DOCTYPE html>
    <html dir="rtl"><head><meta charset="UTF-8"></head>
    <body style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f5f5f5;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:24px;">
          <h1 style="margin:0;font-size:22px;">🎧 تذكرة دعم فني جديدة</h1>
          <p style="margin:4px 0 0;opacity:.9;">HomeMe Technical Support</p>
        </div>
        <div style="padding:24px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px;background:#f8f9fa;border-right:4px solid #667eea;"><b>📌 النوع:</b></td><td style="padding:8px;">{cat_label}</td></tr>
            <tr><td style="padding:8px;background:#f8f9fa;border-right:4px solid #667eea;"><b>👤 الاسم:</b></td><td style="padding:8px;">{payload.name}</td></tr>
            <tr><td style="padding:8px;background:#f8f9fa;border-right:4px solid #667eea;"><b>📧 الإيميل:</b></td><td style="padding:8px;"><a href="mailto:{payload.email}">{payload.email}</a></td></tr>
            {f'<tr><td style="padding:8px;background:#f8f9fa;border-right:4px solid #667eea;"><b>📱 الهاتف:</b></td><td style="padding:8px;">{payload.phone}</td></tr>' if payload.phone else ''}
            {f'<tr><td style="padding:8px;background:#f8f9fa;border-right:4px solid #667eea;"><b>🔑 الحساب:</b></td><td style="padding:8px;">{ticket["username"]} ({ticket["user_role"]})</td></tr>' if ticket["username"] else ''}
            <tr><td style="padding:8px;background:#f8f9fa;border-right:4px solid #667eea;"><b>🎫 رقم التذكرة:</b></td><td style="padding:8px;font-family:monospace;">{ticket["id"][:8]}</td></tr>
            <tr><td style="padding:8px;background:#f8f9fa;border-right:4px solid #667eea;"><b>📝 الموضوع:</b></td><td style="padding:8px;"><b>{payload.subject}</b></td></tr>
          </table>
          <div style="margin-top:20px;padding:16px;background:#f8f9fa;border-radius:8px;border-right:4px solid #764ba2;">
            <h3 style="margin:0 0 8px;color:#333;">الرسالة:</h3>
            <p style="margin:0;white-space:pre-wrap;line-height:1.7;color:#555;">{payload.message}</p>
          </div>
        </div>
        <div style="background:#f8f9fa;padding:16px;text-align:center;color:#888;font-size:12px;">
          تم الإرسال عبر نظام HomeMe · {ticket["created_at"][:19].replace('T',' ')} UTC
        </div>
      </div>
    </body></html>
    """
    text = f"""تذكرة دعم فني جديدة\n\nالنوع: {cat_label}\nالاسم: {payload.name}\nالإيميل: {payload.email}\nالموضوع: {payload.subject}\nرقم التذكرة: {ticket['id']}\n\nالرسالة:\n{payload.message}"""

    try:
        # Send to support inbox using the main mailbox credentials (reliable sender)
        sent = await email_service.send_email(
            to_email=support_email,
            subject=f"[HomeMe Support] [{cat_label}] {payload.subject}",
            html_content=html,
            text_content=text,
            mailbox="main",
        )
        if not sent:
            logger.warning(f"Support email forward failed for ticket {ticket['id']}")
    except Exception as e:
        logger.error(f"Error sending support email: {e}")
        sent = False

    # Send acknowledgement to the user (best-effort)
    ack_html = f"""
    <!DOCTYPE html>
    <html dir="rtl"><head><meta charset="UTF-8"></head>
    <body style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f5f5f5;padding:24px;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#10b981 0%,#3b82f6 100%);color:#fff;padding:24px;text-align:center;">
          <h1 style="margin:0;">✅ تم استلام طلبك</h1>
        </div>
        <div style="padding:24px;color:#333;line-height:1.8;">
          <p>مرحباً <b>{payload.name}</b>،</p>
          <p>لقد استلمنا طلبك بنجاح وسيتم الرد عليه خلال 24-48 ساعة عمل.</p>
          <p><b>رقم التذكرة:</b> <span style="font-family:monospace;background:#f0f0f0;padding:4px 8px;border-radius:4px;">{ticket['id'][:8]}</span></p>
          <p><b>الموضوع:</b> {payload.subject}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
          <p style="color:#666;font-size:13px;">هذه رسالة تلقائية من نظام الدعم الفني في HomeMe. للرد السريع يرجى الاحتفاظ برقم التذكرة.</p>
        </div>
      </div>
    </body></html>
    """
    try:
        await email_service.send_email(
            to_email=payload.email,
            subject=f"[HomeMe] تم استلام طلبك · #{ticket['id'][:8]}",
            html_content=ack_html,
            text_content=f"مرحباً {payload.name}،\nتم استلام طلبك بنجاح.\nرقم التذكرة: {ticket['id'][:8]}\n- فريق HomeMe",
            mailbox="main",
        )
    except Exception:
        pass

    return {
        "ok": True,
        "ticket_id": ticket["id"],
        "email_sent": sent,
        "message": "تم استلام طلبك. سنتواصل معك قريباً."
    }


@router.get("/support/my-tickets")
async def my_support_tickets(
    request: Request,
    db=Depends(get_db),
):
    current_user = await _optional_user(request, db)
    if not current_user:
        raise HTTPException(401, "login required")
    tickets = await db.support_tickets.find(
        {"$or": [{"user_id": current_user.get("id")}, {"email": current_user.get("email")}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=100)
    return {"tickets": tickets}
