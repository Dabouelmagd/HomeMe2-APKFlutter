"""
PDF Reports endpoints — generates Arabic-RTL branded PDFs on the fly using WeasyPrint.

Endpoints (all prefixed with /api/reports):
  GET /unit/{user_id}/statement?month=YYYY-MM
  GET /compound/{compound_id}/occupancy?month=YYYY-MM
  GET /compound/{compound_id}/invoices?month=YYYY-MM
  GET /compound/{compound_id}/summary?month=YYYY-MM
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from io import BytesIO
import calendar

from database import get_db
from auth_deps import get_current_user
from services.pdf_report_service import (
    render_unit_statement,
    render_occupancy_report,
    render_invoices_report,
    render_summary_report,
    render_company_portfolio_report,
)
from services.branding import get_compound_branding
from plan_limits import gate_company_feature

router = APIRouter(prefix="/api/reports")


def _month_bounds(month: str):
    """month string YYYY-MM -> (start_iso, end_iso, label)"""
    try:
        y, m = month.split("-")
        y, m = int(y), int(m)
        last_day = calendar.monthrange(y, m)[1]
        start = datetime(y, m, 1, tzinfo=timezone.utc)
        end = datetime(y, m, last_day, 23, 59, 59, tzinfo=timezone.utc)
        return start, end, f"{y}-{m:02d}"
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")


def _can_access_compound(user: dict, compound_id: str) -> bool:
    role = user.get("role", "")
    if role in ("app_owner", "super_admin"):
        return True
    return user.get("compound_id") == compound_id


def _stream_pdf(pdf_bytes: bytes, filename: str) -> StreamingResponse:
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(BytesIO(pdf_bytes), media_type="application/pdf", headers=headers)


@router.get("/unit/{user_id}/statement")
async def unit_statement(
    user_id: str,
    month: str = Query(..., description="YYYY-MM"),
    current_user: dict = Depends(get_current_user),
):
    await gate_company_feature(current_user, "pdf_excel_exports", "تقارير PDF")
    db = get_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Authorization: owner of statement, family head, or compound admin / app owner
    role = current_user.get("role", "")
    is_self = current_user.get("id") == user_id
    is_admin = role in ("app_owner", "super_admin", "admin", "compound_admin")
    same_family = current_user.get("family_id") and current_user.get("family_id") == user.get("family_id")
    if not (is_self or is_admin or same_family):
        raise HTTPException(status_code=403, detail="Access denied")

    compound = await db.compounds.find_one({"id": user.get("compound_id")}, {"_id": 0})
    compound_name = compound.get("name") if compound else "—"
    branding = get_compound_branding(compound)

    start, end, label = _month_bounds(month)

    charges_cursor = db.resident_charges.find({
        "resident_id": user_id,
        "$or": [
            {"due_date": {"$gte": start.strftime("%Y-%m-01"), "$lte": end.strftime("%Y-%m-%d")}},
            {"created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}},
        ],
    })
    charges = []
    async for c in charges_cursor:
        charges.append({
            "description": c.get("description"),
            "charge_type": c.get("charge_type"),
            "due_date": c.get("due_date"),
            "amount": c.get("amount", 0),
            "status": c.get("status", "pending"),
        })

    payments_cursor = db.resident_payments.find({
        "resident_id": user_id,
        "$or": [
            {"payment_date": {"$gte": start.strftime("%Y-%m-01"), "$lte": end.strftime("%Y-%m-%d")}},
            {"created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}},
        ],
    })
    payments = []
    async for p in payments_cursor:
        payments.append({
            "reference": p.get("reference") or p.get("id", "")[:8],
            "payment_method": p.get("payment_method"),
            "payment_date": p.get("payment_date"),
            "amount": p.get("amount", 0),
        })

    pdf_bytes = render_unit_statement(
        compound_name=compound_name,
        resident_name=user.get("full_name") or user.get("username", "—"),
        unit_number=user.get("unit_number") or "—",
        period=label,
        charges=charges,
        payments=payments,
        currency="EGP",
        branding=branding,
    )
    return _stream_pdf(pdf_bytes, f"statement-{user.get('unit_number','unit')}-{label}.pdf")


@router.get("/compound/{compound_id}/occupancy")
async def occupancy_report(
    compound_id: str,
    month: str = Query(..., description="YYYY-MM"),
    current_user: dict = Depends(get_current_user),
):
    await gate_company_feature(current_user, "pdf_excel_exports", "تقارير PDF")
    db = get_db()
    if not _can_access_compound(current_user, compound_id):
        raise HTTPException(status_code=403, detail="Access denied")

    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="Compound not found")

    _, _, label = _month_bounds(month)

    residents = await db.users.find({"compound_id": compound_id, "role": "resident"}, {"_id": 0}).to_list(length=20000)
    families_count = len({u.get("family_id") for u in residents if u.get("family_id")})

    units_map: dict = {}
    for r in residents:
        un = r.get("unit_number") or "—"
        units_map.setdefault(un, []).append(r)

    units_by_status = []
    for un, members in sorted(units_map.items()):
        head = next((m for m in members if m.get("is_family_head")), members[0] if members else None)
        units_by_status.append({
            "unit_number": un,
            "resident_name": head.get("full_name") if head else "—",
            "family_size": len(members),
            "status": "occupied" if members else "vacant",
        })

    total_units = compound.get("total_units") or len(units_map)
    occupied_units = len(units_map)
    vacant_units = max(total_units - occupied_units, 0)

    pdf_bytes = render_occupancy_report(
        compound_name=compound.get("name", "—"),
        period=label,
        total_units=total_units,
        occupied_units=occupied_units,
        vacant_units=vacant_units,
        total_residents=len(residents),
        families_count=families_count,
        units_by_status=units_by_status,
        branding=get_compound_branding(compound),
    )
    return _stream_pdf(pdf_bytes, f"occupancy-{compound_id[:8]}-{label}.pdf")


@router.get("/compound/{compound_id}/invoices")
async def invoices_report(
    compound_id: str,
    month: str = Query(..., description="YYYY-MM"),
    current_user: dict = Depends(get_current_user),
):
    await gate_company_feature(current_user, "pdf_excel_exports", "تقارير PDF")
    db = get_db()
    if not _can_access_compound(current_user, compound_id):
        raise HTTPException(status_code=403, detail="Access denied")

    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="Compound not found")

    start, end, label = _month_bounds(month)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    charges_cursor = db.resident_charges.find({
        "compound_id": compound_id,
        "$or": [
            {"due_date": {"$gte": start.strftime("%Y-%m-01"), "$lte": end.strftime("%Y-%m-%d")}},
            {"created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}},
        ],
    })
    rows = []
    async for c in charges_cursor:
        resident = await db.users.find_one({"id": c.get("resident_id")}, {"_id": 0, "full_name": 1, "unit_number": 1})
        status = c.get("status", "pending")
        if status == "pending" and c.get("due_date") and c.get("due_date") < today:
            status = "overdue"
        rows.append({
            "reference": c.get("id", "")[:8].upper(),
            "resident_name": resident.get("full_name") if resident else "—",
            "unit_number": (resident.get("unit_number") if resident else "—") or "—",
            "charge_type": c.get("charge_type"),
            "due_date": c.get("due_date"),
            "amount": c.get("amount", 0),
            "status": status,
        })

    pdf_bytes = render_invoices_report(
        compound_name=compound.get("name", "—"),
        period=label,
        rows=rows,
        currency="EGP",
        branding=get_compound_branding(compound),
    )
    return _stream_pdf(pdf_bytes, f"invoices-{compound_id[:8]}-{label}.pdf")


@router.get("/compound/{compound_id}/summary")
async def summary_report(
    compound_id: str,
    month: str = Query(..., description="YYYY-MM"),
    current_user: dict = Depends(get_current_user),
):
    await gate_company_feature(current_user, "pdf_excel_exports", "تقارير PDF")
    db = get_db()
    if not _can_access_compound(current_user, compound_id):
        raise HTTPException(status_code=403, detail="Access denied")

    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="Compound not found")

    start, end, label = _month_bounds(month)
    start_iso, end_iso = start.isoformat(), end.isoformat()

    # Occupancy
    residents = await db.users.find({"compound_id": compound_id, "role": "resident"}, {"_id": 0, "unit_number": 1}).to_list(length=20000)
    units = {r.get("unit_number") for r in residents if r.get("unit_number")}
    total_units = compound.get("total_units") or len(units)
    occupied = len(units)
    vacant = max(total_units - occupied, 0)
    occupancy = {
        "total_units": total_units,
        "occupied_units": occupied,
        "vacant_units": vacant,
        "occupancy_rate": (occupied / total_units * 100) if total_units else 0,
    }

    # Finance — revenue from payments + expenses + outstanding charges
    revenue_total = 0.0
    async for p in db.resident_payments.find({
        "compound_id": compound_id,
        "$or": [
            {"payment_date": {"$gte": start.strftime("%Y-%m-01"), "$lte": end.strftime("%Y-%m-%d")}},
            {"created_at": {"$gte": start_iso, "$lte": end_iso}},
        ],
    }):
        revenue_total += p.get("amount", 0) or 0

    expenses_total = 0.0
    async for e in db.expenses.find({
        "compound_id": compound_id,
        "date": {"$gte": start_iso, "$lte": end_iso},
    }):
        expenses_total += e.get("amount", 0) or 0

    outstanding = 0.0
    async for c in db.resident_charges.find({
        "compound_id": compound_id,
        "status": {"$in": ["pending", "overdue"]},
    }):
        outstanding += c.get("amount", 0) or 0

    finance = {
        "total_revenue": revenue_total,
        "total_expenses": expenses_total,
        "net_profit": revenue_total - expenses_total,
        "outstanding": outstanding,
    }

    # Operations
    operations = {
        "maintenance_requests": await db.maintenance_requests.count_documents({
            "compound_id": compound_id,
            "created_at": {"$gte": start_iso, "$lte": end_iso},
        }),
        "complaints": await db.complaints.count_documents({
            "compound_id": compound_id,
            "created_at": {"$gte": start_iso, "$lte": end_iso},
        }),
        "facility_bookings": await db.service_bookings.count_documents({
            "compound_id": compound_id,
            "created_at": {"$gte": start, "$lte": end},
        }),
        "visitor_passes": await db.visitor_passes.count_documents({
            "compound_id": compound_id,
        }),
    }

    pdf_bytes = render_summary_report(
        compound_name=compound.get("name", "—"),
        period=label,
        occupancy=occupancy,
        finance=finance,
        operations=operations,
        currency="EGP",
        branding=get_compound_branding(compound),
    )
    return _stream_pdf(pdf_bytes, f"summary-{compound_id[:8]}-{label}.pdf")


@router.get("/company/portfolio")
async def company_portfolio_report(
    month: str = Query(..., description="YYYY-MM"),
    current_user: dict = Depends(get_current_user),
):
    """تقرير محفظة الشركة الشامل: يجمع أداء كل المجمعات التابعة لشركة الإدارة في PDF واحد."""
    await gate_company_feature(current_user, "pdf_excel_exports", "تقارير PDF")
    db = get_db()

    # Resolve company_id (only company_admin/super_admin/app_owner)
    role = current_user.get("role")
    if role == "company_admin":
        company_id = current_user.get("company_id")
    elif role in ("super_admin", "app_owner"):
        company_id = current_user.get("active_company_id") or current_user.get("company_id")
    else:
        raise HTTPException(status_code=403, detail="هذا التقرير متاح فقط لمدير الشركة")

    if not company_id:
        raise HTTPException(status_code=400, detail="لا توجد شركة إدارة مرتبطة بحسابك")

    company = await db.companies.find_one({"id": company_id}, {"_id": 0}) or {}
    company_name = company.get("name") or company.get("company_name") or "شركة الإدارة"

    # Resolve compounds under this company (DB linkage + legacy company.compound_ids)
    compounds = await db.compounds.find({"company_id": company_id}, {"_id": 0}).to_list(length=500)
    legacy_ids = [x for x in (company.get("compound_ids") or []) if x not in {c["id"] for c in compounds}]
    if legacy_ids:
        extras = await db.compounds.find({"id": {"$in": legacy_ids}}, {"_id": 0}).to_list(length=500)
        compounds.extend(extras)

    start, end, label = _month_bounds(month)
    start_iso, end_iso = start.isoformat(), end.isoformat()
    start_date_str = start.strftime("%Y-%m-01")
    end_date_str = end.strftime("%Y-%m-%d")

    compounds_data = []
    for cpd in compounds:
        cid = cpd["id"]

        # Occupancy
        residents = await db.users.find({"compound_id": cid, "role": "resident"}, {"_id": 0, "unit_number": 1}).to_list(length=20000)
        units = {r.get("unit_number") for r in residents if r.get("unit_number")}
        total_units = cpd.get("total_units") or len(units)
        occupied = len(units)
        vacant = max(total_units - occupied, 0)
        occupancy_rate = (occupied / total_units * 100) if total_units else 0

        # Revenue
        revenue = 0.0
        async for p in db.resident_payments.find({
            "compound_id": cid,
            "$or": [
                {"payment_date": {"$gte": start_date_str, "$lte": end_date_str}},
                {"created_at": {"$gte": start_iso, "$lte": end_iso}},
            ],
        }):
            revenue += p.get("amount", 0) or 0

        # Expenses
        expenses = 0.0
        async for e in db.expenses.find({"compound_id": cid, "date": {"$gte": start_iso, "$lte": end_iso}}):
            expenses += e.get("amount", 0) or 0

        # Outstanding charges
        outstanding = 0.0
        async for c in db.resident_charges.find({"compound_id": cid, "status": {"$in": ["pending", "overdue"]}}):
            outstanding += c.get("amount", 0) or 0

        complaints_count = await db.complaints.count_documents({
            "compound_id": cid,
            "created_at": {"$gte": start_iso, "$lte": end_iso},
        })
        maintenance_count = await db.maintenance_requests.count_documents({
            "compound_id": cid,
            "created_at": {"$gte": start_iso, "$lte": end_iso},
        })

        compounds_data.append({
            "name": cpd.get("name", "—"),
            "total_units": total_units,
            "occupied": occupied,
            "vacant": vacant,
            "occupancy_rate": occupancy_rate,
            "revenue": revenue,
            "expenses": expenses,
            "outstanding": outstanding,
            "residents": len(residents),
            "complaints": complaints_count,
            "maintenance": maintenance_count,
        })

    pdf_bytes = render_company_portfolio_report(
        company_name=company_name,
        period=label,
        compounds_data=compounds_data,
        currency="EGP",
        branding=None,
    )
    return _stream_pdf(pdf_bytes, f"portfolio-{company_id[:8]}-{label}.pdf")
