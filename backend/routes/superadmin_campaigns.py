"""
Super Admin — Bulk Campaigns (extracted from superadmin.py)
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from database import get_db
from auth_deps import require_super_admin
from helpers import serialize_datetime

router = APIRouter(prefix="/api")


@router.get("/super-admin/bulk-campaigns")
async def list_bulk_campaigns(current_user: dict = Depends(require_super_admin)):
    """قائمة حملات العروض الجماعية مع معدل الاستخدام (عبر campaign_id FK) و A/B stats"""
    db = get_db()
    campaigns = await db.bulk_campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    enriched = []
    total_sent = 0
    total_used = 0
    for c in campaigns:
        cid = c.get("id")
        # Exact match via campaign_id FK
        coupons = await db.coupons.find(
            {"campaign_id": cid},
            {"_id": 0, "times_used": 1, "variant": 1}
        ).to_list(5000)
        used = sum(1 for x in coupons if (x.get("times_used") or 0) > 0)
        # Fallback للحملات القديمة التي لا تحمل campaign_id
        if not coupons and c.get("sent"):
            legacy_coupons = await db.coupons.find(
                {"campaign": "bulk_renewal", "created_at": {"$gte": c.get("created_at")}},
                {"_id": 0, "times_used": 1}
            ).to_list(c.get("sent", 500) or 500)
            used = sum(1 for x in legacy_coupons[:c.get("sent", 0) or 500] if (x.get("times_used") or 0) > 0)

        # A/B breakdown
        used_a = sum(1 for x in coupons if x.get("variant") == "a" and (x.get("times_used") or 0) > 0)
        used_b = sum(1 for x in coupons if x.get("variant") == "b" and (x.get("times_used") or 0) > 0)
        sent_a = c.get("sent_a") or sum(1 for x in coupons if x.get("variant") == "a")
        sent_b = c.get("sent_b") or sum(1 for x in coupons if x.get("variant") == "b")

        total_sent += c.get("sent", 0) or 0
        total_used += used
        enriched.append({
            **c,
            "used": used,
            "conversion_rate": round(100 * used / c["sent"], 1) if c.get("sent") else 0,
            "variant_a": {
                "sent": sent_a, "used": used_a,
                "conversion_rate": round(100 * used_a / sent_a, 1) if sent_a else 0,
            },
            "variant_b": {
                "sent": sent_b, "used": used_b,
                "conversion_rate": round(100 * used_b / sent_b, 1) if sent_b else 0,
            },
        })
    return {
        "campaigns": serialize_datetime(enriched),
        "summary": {
            "total_campaigns": len(campaigns),
            "total_sent": total_sent,
            "total_used": total_used,
            "overall_conversion_rate": round(100 * total_used / total_sent, 1) if total_sent else 0,
        }
    }


@router.get("/super-admin/bulk-campaigns/{campaign_id}/timeline")
async def get_campaign_timeline(campaign_id: str, current_user: dict = Depends(require_super_admin)):
    """توقيت استخدام كوبونات الحملة (cumulative conversion over time)."""
    db = get_db()
    campaign = await db.bulk_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    coupons = await db.coupons.find({"campaign_id": campaign_id}, {"_id": 0, "times_used": 1, "used_at": 1, "created_at": 1, "variant": 1}).to_list(5000)
    # Build daily cumulative usage series
    from collections import defaultdict
    daily = defaultdict(lambda: {"used": 0, "used_a": 0, "used_b": 0})
    for c in coupons:
        if (c.get("times_used") or 0) <= 0:
            continue
        # استخدم used_at إذا وُجد وإلا created_at كبديل
        when = c.get("used_at") or c.get("created_at")
        if not when:
            continue
        day = str(when)[:10]
        daily[day]["used"] += 1
        if c.get("variant") == "a":
            daily[day]["used_a"] += 1
        elif c.get("variant") == "b":
            daily[day]["used_b"] += 1
    # Build cumulative
    series = []
    cum, cum_a, cum_b = 0, 0, 0
    for day in sorted(daily.keys()):
        cum += daily[day]["used"]
        cum_a += daily[day]["used_a"]
        cum_b += daily[day]["used_b"]
        series.append({
            "date": day,
            "daily_used": daily[day]["used"],
            "cumulative_used": cum,
            "cumulative_used_a": cum_a,
            "cumulative_used_b": cum_b,
            "cumulative_conversion_rate": round(100 * cum / campaign.get("sent", 1), 1) if campaign.get("sent") else 0,
        })
    return {"campaign": serialize_datetime(campaign), "series": series, "total_used": cum, "sent": campaign.get("sent", 0)}


@router.get("/super-admin/bulk-campaigns/{campaign_id}/pdf")
async def export_campaign_pdf(campaign_id: str, current_user: dict = Depends(require_super_admin)):
    """تصدير ملخص الحملة كـ PDF."""
    from fastapi.responses import StreamingResponse
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    import io

    db = get_db()
    campaign = await db.bulk_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    coupons = await db.coupons.find({"campaign_id": campaign_id}, {"_id": 0, "times_used": 1, "variant": 1}).to_list(5000)
    used = sum(1 for c in coupons if (c.get("times_used") or 0) > 0)
    used_a = sum(1 for c in coupons if c.get("variant") == "a" and (c.get("times_used") or 0) > 0)
    used_b = sum(1 for c in coupons if c.get("variant") == "b" and (c.get("times_used") or 0) > 0)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=15*mm, bottomMargin=15*mm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=TA_CENTER, textColor=colors.HexColor('#7c3aed'), fontSize=22, spaceAfter=10)
    sub_style = ParagraphStyle('Sub', parent=styles['Normal'], alignment=TA_CENTER, textColor=colors.grey, fontSize=11, spaceAfter=16)
    h2 = ParagraphStyle('H2', parent=styles['Heading2'], textColor=colors.HexColor('#333'), fontSize=14, spaceBefore=10, spaceAfter=8)

    story = [
        Paragraph(f"Campaign Summary Report", title_style),
        Paragraph(f"Campaign ID: {campaign_id[:8]} &nbsp;|&nbsp; Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", sub_style),
    ]

    # Overview table
    overview_data = [
        ["Metric", "Value"],
        ["Campaign Type", "Auto Monthly Renewal" if campaign.get("auto") else "Manual Bulk Renewal"],
        ["Discount", f"{campaign.get('discount', 0)}%"],
        ["Days before expiry", str(campaign.get('days_before_expiry', 0))],
        ["Sent", str(campaign.get('sent', 0))],
        ["Emails Delivered", str(campaign.get('emails_sent', 0))],
        ["Used (redeemed)", str(used)],
        ["Conversion Rate", f"{round(100 * used / campaign.get('sent', 1), 1) if campaign.get('sent') else 0}%"],
        ["Created At", str(campaign.get('created_at', ''))[:19].replace('T', ' ')],
    ]
    t = Table(overview_data, colWidths=[70*mm, 100*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#7c3aed')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.whitesmoke, colors.white]),
        ('GRID', (0,0), (-1,-1), 0.25, colors.grey),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(Paragraph("Overview", h2))
    story.append(t)
    story.append(Spacer(1, 8*mm))

    # A/B section
    if campaign.get("ab_test"):
        sent_a = campaign.get("sent_a") or 0
        sent_b = campaign.get("sent_b") or 0
        ab_data = [
            ["Variant", "Sent", "Used", "Conversion Rate", "Message"],
            ["A", str(sent_a), str(used_a), f"{round(100*used_a/sent_a, 1) if sent_a else 0}%", (campaign.get('variant_a_message') or '')[:80]],
            ["B", str(sent_b), str(used_b), f"{round(100*used_b/sent_b, 1) if sent_b else 0}%", (campaign.get('variant_b_message') or '')[:80]],
        ]
        ab = Table(ab_data, colWidths=[18*mm, 18*mm, 18*mm, 30*mm, 86*mm])
        ab.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#ec4899')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('GRID', (0,0), (-1,-1), 0.25, colors.grey),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(Paragraph("A/B Test Results", h2))
        story.append(ab)
        winner = "A" if used_a/max(sent_a,1) > used_b/max(sent_b,1) else ("B" if used_b/max(sent_b,1) > used_a/max(sent_a,1) else "Tie")
        story.append(Spacer(1, 4*mm))
        story.append(Paragraph(f"<b>Winner:</b> Variant {winner}", styles['Normal']))
        story.append(Spacer(1, 8*mm))

    story.append(Paragraph(f"HomeMe — Powered by Campaign Analytics Engine", sub_style))
    doc.build(story)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=campaign-{campaign_id[:8]}.pdf"})


