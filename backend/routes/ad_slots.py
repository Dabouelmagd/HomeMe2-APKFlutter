"""
Ad Slots Booking System
- مساحات إعلانية داخل الكمبوندات
- حجز المساحات وإرسال إشعار للأونر
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from typing import Optional
import uuid

from database import get_db
from auth_deps import get_current_user, require_super_admin
from email_service import email_service

router = APIRouter(prefix="/api/ad-slots", tags=["ad-slots"])

# مواصفات المساحات الإعلانية
AD_SLOT_SPECS = [
    {
        "slot_key": "dashboard_top",
        "name_ar": "أعلى لوحة التحكم",
        "name_en": "Dashboard Top Banner",
        "dimensions": "728 × 90 px",
        "width": 728, "height": 90,
        "position": "dashboard",
        "description": "بانر عريض أعلى الداشبورد — مرئي لكل المستخدمين",
        "visibility": "عالية جداً",
        "price_monthly": 1500,
        "max_per_compound": 1,
    },
    {
        "slot_key": "dashboard_sidebar",
        "name_ar": "الشريط الجانبي",
        "name_en": "Sidebar Banner",
        "dimensions": "300 × 250 px",
        "width": 300, "height": 250,
        "position": "sidebar",
        "description": "مربع إعلاني في الشريط الجانبي",
        "visibility": "عالية",
        "price_monthly": 900,
        "max_per_compound": 2,
    },
    {
        "slot_key": "dashboard_inline",
        "name_ar": "داخل المحتوى",
        "name_en": "Inline Content Banner",
        "dimensions": "468 × 60 px",
        "width": 468, "height": 60,
        "position": "inline",
        "description": "بانر صغير بين أقسام الداشبورد",
        "visibility": "متوسطة",
        "price_monthly": 600,
        "max_per_compound": 3,
    },
    {
        "slot_key": "compound_footer",
        "name_ar": "أسفل الصفحة",
        "name_en": "Footer Banner",
        "dimensions": "728 × 90 px",
        "width": 728, "height": 90,
        "position": "banner",
        "description": "بانر أسفل كل صفحات الكمبوند",
        "visibility": "متوسطة",
        "price_monthly": 750,
        "max_per_compound": 2,
    },
]


# ── Get available slots for a compound ────────────────────────────
@router.get("/compound/{compound_id}")
async def get_compound_slots(
    compound_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()

    # Get active bookings for this compound
    bookings = await db.ad_slot_bookings.find(
        {"compound_id": compound_id, "status": {"$in": ["active", "pending"]}},
        {"_id": 0}
    ).to_list(50)

    booked_keys = {b["slot_key"]: b for b in bookings}

    slots = []
    for spec in AD_SLOT_SPECS:
        # Count active bookings for this slot type
        active_count = sum(1 for b in bookings if b["slot_key"] == spec["slot_key"])
        available = spec["max_per_compound"] - active_count

        slots.append({
            **spec,
            "active_bookings": active_count,
            "available_count": available,
            "is_full": available <= 0,
            "booking": booked_keys.get(spec["slot_key"]),
        })

    return {"slots": slots, "compound_id": compound_id}


# ── Request a slot booking ─────────────────────────────────────────
@router.post("/request")
async def request_slot(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    slot_key = body.get("slot_key")
    compound_id = body.get("compound_id") or current_user.get("compound_id", "")
    advertiser_name = body.get("advertiser_name", "").strip()
    advertiser_email = body.get("advertiser_email", "").strip()
    advertiser_phone = body.get("advertiser_phone", "").strip()
    message = body.get("message", "").strip()
    duration_months = int(body.get("duration_months", 1))

    if not slot_key or not compound_id:
        raise HTTPException(400, "slot_key و compound_id مطلوبان")

    # Find slot spec
    spec = next((s for s in AD_SLOT_SPECS if s["slot_key"] == slot_key), None)
    if not spec:
        raise HTTPException(404, "المساحة الإعلانية غير موجودة")

    # Check availability
    active = await db.ad_slot_bookings.count_documents({
        "compound_id": compound_id,
        "slot_key": slot_key,
        "status": {"$in": ["active", "pending"]}
    })
    if active >= spec["max_per_compound"]:
        raise HTTPException(400, "هذه المساحة محجوزة بالكامل")

    # Get compound info
    compound = await db.compounds.find_one({"id": compound_id})
    compound_name = compound.get("name", compound_id) if compound else compound_id

    now = datetime.now(timezone.utc).isoformat()
    booking_id = str(uuid.uuid4())

    booking = {
        "id": booking_id,
        "compound_id": compound_id,
        "compound_name": compound_name,
        "slot_key": slot_key,
        "slot_name_ar": spec["name_ar"],
        "dimensions": spec["dimensions"],
        "price_monthly": spec["price_monthly"],
        "duration_months": duration_months,
        "total_price": spec["price_monthly"] * duration_months,
        "advertiser_name": advertiser_name or current_user.get("full_name", ""),
        "advertiser_email": advertiser_email or current_user.get("email", ""),
        "advertiser_phone": advertiser_phone,
        "message": message,
        "requested_by": current_user["id"],
        "requested_by_name": current_user.get("full_name") or current_user.get("username"),
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }
    await db.ad_slot_bookings.insert_one(booking)
    booking.pop("_id", None)

    # Send email to owner + super_admins
    owners = await db.users.find(
        {"role": {"$in": ["app_owner", "super_admin"]}, "is_active": True},
        {"_id": 0, "email": 1, "full_name": 1}
    ).to_list(10)

    for owner in owners:
        if not owner.get("email"):
            continue
        try:
            subject = f"🏢 طلب حجز مساحة إعلانية — {compound_name}"
            body_html = f"""
            <div style="font-family:Tahoma,Arial;direction:rtl;max-width:600px;margin:auto;">
              <div style="background:linear-gradient(135deg,#064e3b,#047857);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
                <img src="https://homemeapp.net/homeme-logo.png" alt="HomeMe" width="90"
                  style="background:#fff;border-radius:10px;padding:6px;display:block;margin:0 auto 12px;" />
                <h2 style="color:#fff;margin:0;font-size:20px;">طلب حجز مساحة إعلانية</h2>
              </div>
              <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;">
                <table width="100%" cellpadding="8" style="font-size:14px;border-collapse:collapse;">
                  <tr style="background:#f8fafc;"><td style="font-weight:bold;color:#475569;">الكمبوند</td><td>{compound_name}</td></tr>
                  <tr><td style="font-weight:bold;color:#475569;">المساحة</td><td>{spec['name_ar']} ({spec['dimensions']})</td></tr>
                  <tr style="background:#f8fafc;"><td style="font-weight:bold;color:#475569;">المعلن</td><td>{booking['advertiser_name']}</td></tr>
                  <tr><td style="font-weight:bold;color:#475569;">الإيميل</td><td>{booking['advertiser_email']}</td></tr>
                  <tr style="background:#f8fafc;"><td style="font-weight:bold;color:#475569;">الهاتف</td><td>{advertiser_phone or 'غير محدد'}</td></tr>
                  <tr><td style="font-weight:bold;color:#475569;">المدة</td><td>{duration_months} شهر</td></tr>
                  <tr style="background:#f8fafc;"><td style="font-weight:bold;color:#475569;">الإجمالي</td><td style="color:#059669;font-weight:bold;">{booking['total_price']:,} ج.م</td></tr>
                  {f'<tr><td style="font-weight:bold;color:#475569;">الرسالة</td><td>{message}</td></tr>' if message else ''}
                </table>
                <div style="text-align:center;margin-top:20px;">
                  <a href="https://homemeapp.net/app/super-admin?tab=ads"
                    style="background:#059669;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;">
                    ✅ مراجعة الطلب والموافقة
                  </a>
                </div>
              </div>
              <div style="background:#f8fafc;padding:14px;text-align:center;font-size:12px;color:#94a3b8;border-radius:0 0 12px 12px;">
                HomeMe | homemeapp.net | © 2026 Data Life AI
              </div>
            </div>
            """
            await email_service.send_email(
                to_email=owner["email"],
                to_name=owner.get("full_name", ""),
                subject=subject,
                html_content=body_html,
            )
        except Exception:
            pass

    # Notify in-app
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "target_role": "app_owner",
        "type": "ad_slot_request",
        "title": "طلب حجز مساحة إعلانية",
        "body": f"{booking['advertiser_name']} يطلب حجز {spec['name_ar']} في {compound_name}",
        "booking_id": booking_id,
        "compound_id": compound_id,
        "read": False,
        "created_at": now,
    })

    return {
        "success": True,
        "booking_id": booking_id,
        "message": "تم إرسال طلب الحجز — سيتواصل معك فريق HomeMe خلال 24 ساعة",
        "total_price": booking["total_price"],
    }


# ── Owner: get all booking requests ───────────────────────────────
@router.get("/bookings")
async def get_bookings(
    status: Optional[str] = None,
    current_user: dict = Depends(require_super_admin),
):
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    bookings = await db.ad_slot_bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"bookings": bookings, "total": len(bookings)}


# ── Owner: approve / reject ────────────────────────────────────────
@router.put("/bookings/{booking_id}")
async def update_booking(
    booking_id: str,
    body: dict,
    current_user: dict = Depends(require_super_admin),
):
    db = get_db()
    booking = await db.ad_slot_bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(404, "الطلب غير موجود")

    action = body.get("action")  # approve / reject
    note = body.get("note", "")
    new_status = "active" if action == "approve" else "rejected"

    await db.ad_slot_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": new_status,
            "admin_note": note,
            "reviewed_by": current_user["id"],
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    # Notify advertiser
    if booking.get("advertiser_email"):
        try:
            status_ar = "✅ مقبول" if action == "approve" else "❌ مرفوض"
            await email_service.send_email(
                to_email=booking["advertiser_email"],
                to_name=booking.get("advertiser_name", ""),
                subject=f"HomeMe — طلب الحجز {status_ar}",
                html_content=f"""
                <div style="font-family:Tahoma,Arial;direction:rtl;max-width:600px;margin:auto;padding:24px;">
                  <h2 style="color:#{'059669' if action == 'approve' else 'dc2626'};">{status_ar}</h2>
                  <p>طلبك لحجز <strong>{booking['slot_name_ar']}</strong> في <strong>{booking['compound_name']}</strong> تم {status_ar}.</p>
                  {f'<p style="color:#64748b;">{note}</p>' if note else ''}
                  <p style="margin-top:16px;"><a href="https://homemeapp.net" style="color:#059669;">homemeapp.net</a></p>
                </div>
                """,
            )
        except Exception:
            pass

    return {"success": True, "status": new_status}


# ── Stats for owner dashboard ──────────────────────────────────────
@router.get("/stats")
async def get_slot_stats(current_user: dict = Depends(require_super_admin)):
    db = get_db()
    total = await db.ad_slot_bookings.count_documents({})
    pending = await db.ad_slot_bookings.count_documents({"status": "pending"})
    active = await db.ad_slot_bookings.count_documents({"status": "active"})
    revenue_docs = await db.ad_slot_bookings.find(
        {"status": "active"}, {"_id": 0, "total_price": 1}
    ).to_list(1000)
    total_revenue = sum(d.get("total_price", 0) for d in revenue_docs)
    return {"total": total, "pending": pending, "active": active, "total_revenue": total_revenue}
