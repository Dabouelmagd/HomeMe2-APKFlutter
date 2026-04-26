"""
PDF report generation service powered by WeasyPrint with native Arabic/RTL support.
Produces 4 report types: unit monthly statement, compound occupancy, invoices, summary.
"""
from datetime import datetime, timezone
from typing import Optional
from weasyprint import HTML, CSS
from io import BytesIO

# ---------- Templates (HTML/CSS) ----------

BASE_CSS = """
@page { size: A4; margin: 1.6cm 1.4cm; }
* { box-sizing: border-box; }
html { font-family: 'Noto Sans Arabic', 'Noto Sans', sans-serif; font-size: 11pt; color: #1f2937; }
body { margin: 0; }
.rtl { direction: rtl; text-align: right; }
.ltr { direction: ltr; text-align: left; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #6366f1; padding-bottom: 12px; margin-bottom: 18px; }
.brand { font-size: 18pt; font-weight: 700; color: #4338ca; letter-spacing: -0.5px; }
.brand-sub { font-size: 9pt; color: #6b7280; }
.report-meta { text-align: end; font-size: 9pt; color: #6b7280; }
.title { font-size: 22pt; font-weight: 800; color: #111827; margin: 6px 0 2px; }
.subtitle { color: #4b5563; font-size: 11pt; margin-bottom: 14px; }
.kpis { display: flex; gap: 10px; margin: 14px 0 18px; flex-wrap: wrap; }
.kpi { flex: 1 1 30%; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; }
.kpi .label { font-size: 9pt; color: #6b7280; }
.kpi .value { font-size: 16pt; font-weight: 700; color: #111827; margin-top: 2px; }
.kpi.green .value { color: #047857; }
.kpi.red .value { color: #b91c1c; }
.kpi.indigo .value { color: #4338ca; }
.section { margin-top: 14px; }
.section h2 { font-size: 13pt; font-weight: 700; color: #111827; border-inline-start: 4px solid #6366f1; padding-inline-start: 10px; margin: 0 0 8px; }
table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10pt; }
th { background: #4338ca; color: white; padding: 8px 10px; font-weight: 600; }
td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
tr:nth-child(even) td { background: #f9fafb; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9pt; font-weight: 600; }
.badge.paid { background: #d1fae5; color: #065f46; }
.badge.pending { background: #fef3c7; color: #92400e; }
.badge.overdue { background: #fee2e2; color: #991b1b; }
.totals { margin-top: 14px; padding: 12px 16px; background: linear-gradient(90deg,#eef2ff,#fff); border-radius: 10px; border: 1px solid #c7d2fe; }
.totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11pt; }
.totals .row.grand { border-top: 2px solid #6366f1; margin-top: 6px; padding-top: 8px; font-size: 13pt; font-weight: 700; color: #4338ca; }
.footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 8pt; color: #9ca3af; text-align: center; }
.empty { padding: 40px; text-align: center; color: #9ca3af; font-style: italic; border: 2px dashed #e5e7eb; border-radius: 10px; }
"""

def _format_currency(amount: float, currency: str = "EGP") -> str:
    try:
        return f"{float(amount):,.2f} {currency}"
    except Exception:
        return f"0.00 {currency}"

def _header_html(compound_name: str, report_title: str, period: str, report_no: str) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return f"""
    <div class="header">
      <div>
        <div class="brand">HomeMe</div>
        <div class="brand-sub">منصة إدارة المجمعات السكنية</div>
      </div>
      <div class="report-meta">
        <div><strong>{compound_name}</strong></div>
        <div>الفترة: {period}</div>
        <div>رقم التقرير: {report_no}</div>
        <div>تاريخ الإصدار: {now}</div>
      </div>
    </div>
    <div class="title">{report_title}</div>
    """

def _footer_html() -> str:
    return """
    <div class="footer">
      © HomeMe 2026 — تم توليد هذا التقرير تلقائياً. لأي استفسار يرجى التواصل مع إدارة المجمع.
    </div>
    """

def _render_pdf(html_str: str) -> bytes:
    buf = BytesIO()
    HTML(string=html_str).write_pdf(buf, stylesheets=[CSS(string=BASE_CSS)])
    return buf.getvalue()


# ---------- Unit Monthly Statement ----------
def render_unit_statement(
    *,
    compound_name: str,
    resident_name: str,
    unit_number: str,
    period: str,
    charges: list,
    payments: list,
    currency: str = "EGP",
) -> bytes:
    total_charges = sum(c.get("amount", 0) for c in charges)
    total_paid = sum(p.get("amount", 0) for p in payments)
    balance = total_charges - total_paid

    rows_charges = "".join([
        f"<tr><td>{c.get('description','-')}</td><td>{c.get('charge_type','-')}</td>"
        f"<td>{c.get('due_date','-')}</td><td>{_format_currency(c.get('amount',0), currency)}</td>"
        f"<td><span class='badge {c.get('status','pending')}'>{c.get('status','pending')}</span></td></tr>"
        for c in charges
    ]) or "<tr><td colspan='5' class='empty'>لا توجد رسوم</td></tr>"

    rows_payments = "".join([
        f"<tr><td>{p.get('reference','-')}</td><td>{p.get('payment_method','-')}</td>"
        f"<td>{p.get('payment_date','-')}</td><td>{_format_currency(p.get('amount',0), currency)}</td></tr>"
        for p in payments
    ]) or "<tr><td colspan='4' class='empty'>لا توجد مدفوعات</td></tr>"

    html_str = f"""<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"></head><body class="rtl">
    {_header_html(compound_name, 'كشف حساب الوحدة', period, f'STM-{unit_number}-{period}')}
    <div class="subtitle">الساكن: <strong>{resident_name}</strong> &nbsp;•&nbsp; رقم الوحدة: <strong>{unit_number}</strong></div>
    <div class="kpis">
      <div class="kpi indigo"><div class="label">إجمالي الرسوم</div><div class="value">{_format_currency(total_charges, currency)}</div></div>
      <div class="kpi green"><div class="label">إجمالي المدفوعات</div><div class="value">{_format_currency(total_paid, currency)}</div></div>
      <div class="kpi {'red' if balance>0 else 'green'}"><div class="label">الرصيد المستحق</div><div class="value">{_format_currency(balance, currency)}</div></div>
    </div>
    <div class="section"><h2>الرسوم</h2>
      <table><thead><tr><th>الوصف</th><th>النوع</th><th>تاريخ الاستحقاق</th><th>المبلغ</th><th>الحالة</th></tr></thead>
      <tbody>{rows_charges}</tbody></table>
    </div>
    <div class="section"><h2>المدفوعات</h2>
      <table><thead><tr><th>المرجع</th><th>طريقة الدفع</th><th>التاريخ</th><th>المبلغ</th></tr></thead>
      <tbody>{rows_payments}</tbody></table>
    </div>
    <div class="totals">
      <div class="row"><span>إجمالي الرسوم</span><span>{_format_currency(total_charges, currency)}</span></div>
      <div class="row"><span>إجمالي المدفوعات</span><span>- {_format_currency(total_paid, currency)}</span></div>
      <div class="row grand"><span>الرصيد المستحق</span><span>{_format_currency(balance, currency)}</span></div>
    </div>
    {_footer_html()}
    </body></html>"""
    return _render_pdf(html_str)


# ---------- Compound Occupancy Report ----------
def render_occupancy_report(
    *,
    compound_name: str,
    period: str,
    total_units: int,
    occupied_units: int,
    vacant_units: int,
    total_residents: int,
    families_count: int,
    units_by_status: list,
) -> bytes:
    occ_rate = (occupied_units / total_units * 100) if total_units else 0
    rows = "".join([
        f"<tr><td>{u.get('unit_number','-')}</td><td>{u.get('resident_name','-')}</td>"
        f"<td>{u.get('family_size',0)}</td><td><span class='badge {u.get('status','vacant')}'>{u.get('status','vacant')}</span></td></tr>"
        for u in units_by_status
    ]) or "<tr><td colspan='4' class='empty'>لا توجد بيانات وحدات</td></tr>"

    html_str = f"""<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"></head><body class="rtl">
    {_header_html(compound_name, 'تقرير الإشغال الشهري', period, f'OCC-{period}')}
    <div class="subtitle">نظرة شاملة على إشغال الوحدات والسكان داخل المجمع.</div>
    <div class="kpis">
      <div class="kpi indigo"><div class="label">إجمالي الوحدات</div><div class="value">{total_units}</div></div>
      <div class="kpi green"><div class="label">المشغولة</div><div class="value">{occupied_units}</div></div>
      <div class="kpi red"><div class="label">الشاغرة</div><div class="value">{vacant_units}</div></div>
      <div class="kpi indigo"><div class="label">معدّل الإشغال</div><div class="value">{occ_rate:.1f}%</div></div>
      <div class="kpi green"><div class="label">إجمالي السكان</div><div class="value">{total_residents}</div></div>
      <div class="kpi indigo"><div class="label">عدد العائلات</div><div class="value">{families_count}</div></div>
    </div>
    <div class="section"><h2>تفاصيل الوحدات</h2>
      <table><thead><tr><th>رقم الوحدة</th><th>اسم رب الأسرة</th><th>عدد الأفراد</th><th>الحالة</th></tr></thead>
      <tbody>{rows}</tbody></table>
    </div>
    {_footer_html()}
    </body></html>"""
    return _render_pdf(html_str)


# ---------- Invoices / Collections Report ----------
def render_invoices_report(
    *,
    compound_name: str,
    period: str,
    rows: list,
    currency: str = "EGP",
) -> bytes:
    total_billed = sum(r.get("amount", 0) for r in rows)
    total_paid = sum(r.get("amount", 0) for r in rows if r.get("status") == "paid")
    total_pending = sum(r.get("amount", 0) for r in rows if r.get("status") == "pending")
    total_overdue = sum(r.get("amount", 0) for r in rows if r.get("status") == "overdue")

    table_rows = "".join([
        f"<tr><td>{r.get('reference','-')}</td><td>{r.get('resident_name','-')}</td>"
        f"<td>{r.get('unit_number','-')}</td><td>{r.get('charge_type','-')}</td>"
        f"<td>{r.get('due_date','-')}</td><td>{_format_currency(r.get('amount',0), currency)}</td>"
        f"<td><span class='badge {r.get('status','pending')}'>{r.get('status','pending')}</span></td></tr>"
        for r in rows
    ]) or "<tr><td colspan='7' class='empty'>لا توجد فواتير في هذه الفترة</td></tr>"

    html_str = f"""<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"></head><body class="rtl">
    {_header_html(compound_name, 'تقرير الفواتير والتحصيلات', period, f'INV-{period}')}
    <div class="subtitle">تفصيل الفواتير الصادرة والمدفوعة والمتأخرة لكل سكان المجمع.</div>
    <div class="kpis">
      <div class="kpi indigo"><div class="label">إجمالي الفواتير</div><div class="value">{_format_currency(total_billed, currency)}</div></div>
      <div class="kpi green"><div class="label">المُحصَّلة</div><div class="value">{_format_currency(total_paid, currency)}</div></div>
      <div class="kpi"><div class="label">قيد الانتظار</div><div class="value">{_format_currency(total_pending, currency)}</div></div>
      <div class="kpi red"><div class="label">المتأخرة</div><div class="value">{_format_currency(total_overdue, currency)}</div></div>
    </div>
    <div class="section"><h2>تفاصيل الفواتير</h2>
      <table><thead><tr><th>المرجع</th><th>الساكن</th><th>الوحدة</th><th>النوع</th><th>الاستحقاق</th><th>المبلغ</th><th>الحالة</th></tr></thead>
      <tbody>{table_rows}</tbody></table>
    </div>
    {_footer_html()}
    </body></html>"""
    return _render_pdf(html_str)


# ---------- Compound Summary Report ----------
def render_summary_report(
    *,
    compound_name: str,
    period: str,
    occupancy: dict,
    finance: dict,
    operations: dict,
    currency: str = "EGP",
) -> bytes:
    html_str = f"""<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"></head><body class="rtl">
    {_header_html(compound_name, 'التقرير الشامل للمجمع', period, f'SUM-{period}')}
    <div class="subtitle">ملخص تنفيذي لأداء المجمع: الإشغال، الماليات، والعمليات.</div>

    <div class="section"><h2>الإشغال</h2>
      <div class="kpis">
        <div class="kpi indigo"><div class="label">الوحدات</div><div class="value">{occupancy.get('total_units',0)}</div></div>
        <div class="kpi green"><div class="label">المشغولة</div><div class="value">{occupancy.get('occupied_units',0)}</div></div>
        <div class="kpi red"><div class="label">الشاغرة</div><div class="value">{occupancy.get('vacant_units',0)}</div></div>
        <div class="kpi indigo"><div class="label">معدّل الإشغال</div><div class="value">{occupancy.get('occupancy_rate',0):.1f}%</div></div>
      </div>
    </div>

    <div class="section"><h2>الأداء المالي</h2>
      <div class="kpis">
        <div class="kpi green"><div class="label">إجمالي الإيرادات</div><div class="value">{_format_currency(finance.get('total_revenue',0), currency)}</div></div>
        <div class="kpi red"><div class="label">إجمالي المصروفات</div><div class="value">{_format_currency(finance.get('total_expenses',0), currency)}</div></div>
        <div class="kpi indigo"><div class="label">صافي الربح</div><div class="value">{_format_currency(finance.get('net_profit',0), currency)}</div></div>
        <div class="kpi"><div class="label">المتأخرات</div><div class="value">{_format_currency(finance.get('outstanding',0), currency)}</div></div>
      </div>
    </div>

    <div class="section"><h2>العمليات</h2>
      <div class="kpis">
        <div class="kpi indigo"><div class="label">طلبات الصيانة</div><div class="value">{operations.get('maintenance_requests',0)}</div></div>
        <div class="kpi"><div class="label">الشكاوى</div><div class="value">{operations.get('complaints',0)}</div></div>
        <div class="kpi green"><div class="label">حجوزات المرافق</div><div class="value">{operations.get('facility_bookings',0)}</div></div>
        <div class="kpi"><div class="label">تصاريح الزوّار</div><div class="value">{operations.get('visitor_passes',0)}</div></div>
      </div>
    </div>

    {_footer_html()}
    </body></html>"""
    return _render_pdf(html_str)
