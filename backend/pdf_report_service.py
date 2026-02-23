"""
PDF Report Generation Service
Generates PDF reports for HomeMe compound management
"""
import os
import io
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from bson import ObjectId
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

# Try to register Arabic font
try:
    pdfmetrics.registerFont(TTFont('Arabic', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    ARABIC_FONT = 'Arabic'
except:
    ARABIC_FONT = 'Helvetica'


class PDFReportService:
    def __init__(self, db):
        self.db = db
        self.styles = getSampleStyleSheet()
        self._setup_styles()
    
    def _setup_styles(self):
        """Setup custom styles for reports"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            fontName='Helvetica-Bold',
            fontSize=18,
            textColor=colors.HexColor('#1e3a5f'),
            alignment=TA_CENTER,
            spaceAfter=20
        ))
        
        # Subtitle style
        self.styles.add(ParagraphStyle(
            name='ReportSubtitle',
            fontName='Helvetica',
            fontSize=12,
            textColor=colors.HexColor('#666666'),
            alignment=TA_CENTER,
            spaceAfter=30
        ))
        
        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            fontName='Helvetica-Bold',
            fontSize=14,
            textColor=colors.HexColor('#1e3a5f'),
            spaceBefore=20,
            spaceAfter=10
        ))
        
        # Arabic text style
        self.styles.add(ParagraphStyle(
            name='ArabicText',
            fontName=ARABIC_FONT,
            fontSize=11,
            alignment=TA_RIGHT,
            textColor=colors.black
        ))
    
    def _get_table_style(self):
        """Get standard table style"""
        return TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8f9fa')),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dee2e6')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ])
    
    async def generate_financial_report(
        self,
        compound_id: str,
        start_date: datetime,
        end_date: datetime,
        language: str = 'en'
    ) -> bytes:
        """Generate financial report PDF"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1*cm, bottomMargin=1*cm)
        elements = []
        
        # Get compound info
        compound = await self.db.compounds.find_one({"_id": ObjectId(compound_id)})
        compound_name = compound.get('name', 'Compound') if compound else 'Compound'
        
        # Title
        if language == 'ar':
            title = f"التقرير المالي - {compound_name}"
        else:
            title = f"Financial Report - {compound_name}"
        elements.append(Paragraph(title, self.styles['ReportTitle']))
        
        # Date range
        date_range = f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
        elements.append(Paragraph(date_range, self.styles['ReportSubtitle']))
        
        # Get financial data
        payments = await self._get_payments(compound_id, start_date, end_date)
        bills = await self._get_bills(compound_id, start_date, end_date)
        
        # Summary section
        total_collected = sum(p.get('amount', 0) for p in payments if p.get('status') == 'paid')
        total_pending = sum(b.get('amount', 0) for b in bills if b.get('status') in ['pending', 'unpaid'])
        total_overdue = sum(b.get('amount', 0) for b in bills if b.get('status') == 'overdue')
        
        summary_header = "الملخص المالي" if language == 'ar' else "Financial Summary"
        elements.append(Paragraph(summary_header, self.styles['SectionHeader']))
        
        if language == 'ar':
            summary_data = [
                ['البند', 'القيمة (ج.م)'],
                ['إجمالي المحصل', f'{total_collected:,.2f}'],
                ['المبالغ المعلقة', f'{total_pending:,.2f}'],
                ['المبالغ المتأخرة', f'{total_overdue:,.2f}'],
            ]
        else:
            summary_data = [
                ['Item', 'Amount (EGP)'],
                ['Total Collected', f'{total_collected:,.2f}'],
                ['Pending Amount', f'{total_pending:,.2f}'],
                ['Overdue Amount', f'{total_overdue:,.2f}'],
            ]
        
        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(self._get_table_style())
        elements.append(summary_table)
        elements.append(Spacer(1, 20))
        
        # Payments section
        payments_header = "تفاصيل المدفوعات" if language == 'ar' else "Payment Details"
        elements.append(Paragraph(payments_header, self.styles['SectionHeader']))
        
        if payments:
            if language == 'ar':
                payment_data = [['التاريخ', 'المقيم', 'المبلغ', 'الحالة']]
            else:
                payment_data = [['Date', 'Resident', 'Amount', 'Status']]
            
            for payment in payments[:20]:  # Limit to 20 entries
                payment_data.append([
                    payment.get('created_at', datetime.now()).strftime('%Y-%m-%d'),
                    payment.get('resident_name', 'N/A')[:20],
                    f"{payment.get('amount', 0):,.2f}",
                    payment.get('status', 'N/A')
                ])
            
            payment_table = Table(payment_data, colWidths=[1.5*inch, 2*inch, 1.5*inch, 1.5*inch])
            payment_table.setStyle(self._get_table_style())
            elements.append(payment_table)
        else:
            no_data = "لا توجد مدفوعات" if language == 'ar' else "No payments found"
            elements.append(Paragraph(no_data, self.styles['Normal']))
        
        # Footer
        elements.append(Spacer(1, 30))
        footer_text = f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')} | HomeMe Compound Management"
        elements.append(Paragraph(footer_text, self.styles['ReportSubtitle']))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
    
    async def generate_residents_report(
        self,
        compound_id: str,
        language: str = 'en'
    ) -> bytes:
        """Generate residents report PDF"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1*cm, bottomMargin=1*cm)
        elements = []
        
        # Get compound info
        compound = await self.db.compounds.find_one({"_id": ObjectId(compound_id)})
        compound_name = compound.get('name', 'Compound') if compound else 'Compound'
        
        # Title
        title = f"تقرير السكان - {compound_name}" if language == 'ar' else f"Residents Report - {compound_name}"
        elements.append(Paragraph(title, self.styles['ReportTitle']))
        elements.append(Paragraph(datetime.now().strftime('%Y-%m-%d'), self.styles['ReportSubtitle']))
        
        # Get residents
        residents = await self._get_residents(compound_id)
        
        # Statistics
        stats_header = "الإحصائيات" if language == 'ar' else "Statistics"
        elements.append(Paragraph(stats_header, self.styles['SectionHeader']))
        
        total_residents = len(residents)
        active_residents = len([r for r in residents if r.get('status') == 'active'])
        
        if language == 'ar':
            stats_data = [
                ['البند', 'العدد'],
                ['إجمالي السكان', str(total_residents)],
                ['السكان النشطين', str(active_residents)],
            ]
        else:
            stats_data = [
                ['Item', 'Count'],
                ['Total Residents', str(total_residents)],
                ['Active Residents', str(active_residents)],
            ]
        
        stats_table = Table(stats_data, colWidths=[3*inch, 2*inch])
        stats_table.setStyle(self._get_table_style())
        elements.append(stats_table)
        elements.append(Spacer(1, 20))
        
        # Residents list
        list_header = "قائمة السكان" if language == 'ar' else "Residents List"
        elements.append(Paragraph(list_header, self.styles['SectionHeader']))
        
        if residents:
            if language == 'ar':
                resident_data = [['الاسم', 'الوحدة', 'الهاتف', 'الحالة']]
            else:
                resident_data = [['Name', 'Unit', 'Phone', 'Status']]
            
            for resident in residents[:50]:  # Limit to 50 entries
                resident_data.append([
                    resident.get('full_name', 'N/A')[:25],
                    resident.get('unit_number', 'N/A'),
                    resident.get('phone', 'N/A'),
                    resident.get('status', 'N/A')
                ])
            
            resident_table = Table(resident_data, colWidths=[2.5*inch, 1.2*inch, 1.5*inch, 1.2*inch])
            resident_table.setStyle(self._get_table_style())
            elements.append(resident_table)
        
        # Footer
        elements.append(Spacer(1, 30))
        footer_text = f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')} | HomeMe"
        elements.append(Paragraph(footer_text, self.styles['ReportSubtitle']))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
    
    async def generate_maintenance_report(
        self,
        compound_id: str,
        start_date: datetime,
        end_date: datetime,
        language: str = 'en'
    ) -> bytes:
        """Generate maintenance requests report PDF"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1*cm, bottomMargin=1*cm)
        elements = []
        
        # Get compound info
        compound = await self.db.compounds.find_one({"_id": ObjectId(compound_id)})
        compound_name = compound.get('name', 'Compound') if compound else 'Compound'
        
        # Title
        title = f"تقرير الصيانة - {compound_name}" if language == 'ar' else f"Maintenance Report - {compound_name}"
        elements.append(Paragraph(title, self.styles['ReportTitle']))
        
        date_range = f"{start_date.strftime('%Y-%m-%d')} - {end_date.strftime('%Y-%m-%d')}"
        elements.append(Paragraph(date_range, self.styles['ReportSubtitle']))
        
        # Get maintenance requests
        requests = await self._get_maintenance_requests(compound_id, start_date, end_date)
        
        # Statistics
        total_requests = len(requests)
        completed = len([r for r in requests if r.get('status') == 'completed'])
        pending = len([r for r in requests if r.get('status') in ['pending', 'in_progress']])
        
        stats_header = "إحصائيات الطلبات" if language == 'ar' else "Request Statistics"
        elements.append(Paragraph(stats_header, self.styles['SectionHeader']))
        
        if language == 'ar':
            stats_data = [
                ['البند', 'العدد'],
                ['إجمالي الطلبات', str(total_requests)],
                ['الطلبات المكتملة', str(completed)],
                ['الطلبات المعلقة', str(pending)],
            ]
        else:
            stats_data = [
                ['Item', 'Count'],
                ['Total Requests', str(total_requests)],
                ['Completed', str(completed)],
                ['Pending', str(pending)],
            ]
        
        stats_table = Table(stats_data, colWidths=[3*inch, 2*inch])
        stats_table.setStyle(self._get_table_style())
        elements.append(stats_table)
        elements.append(Spacer(1, 20))
        
        # Requests list
        list_header = "تفاصيل الطلبات" if language == 'ar' else "Request Details"
        elements.append(Paragraph(list_header, self.styles['SectionHeader']))
        
        if requests:
            if language == 'ar':
                request_data = [['التاريخ', 'النوع', 'الوحدة', 'الحالة']]
            else:
                request_data = [['Date', 'Type', 'Unit', 'Status']]
            
            for req in requests[:30]:
                request_data.append([
                    req.get('created_at', datetime.now()).strftime('%Y-%m-%d'),
                    req.get('category', 'N/A')[:15],
                    req.get('unit_number', 'N/A'),
                    req.get('status', 'N/A')
                ])
            
            request_table = Table(request_data, colWidths=[1.5*inch, 2*inch, 1.5*inch, 1.5*inch])
            request_table.setStyle(self._get_table_style())
            elements.append(request_table)
        
        # Footer
        elements.append(Spacer(1, 30))
        footer_text = f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')} | HomeMe"
        elements.append(Paragraph(footer_text, self.styles['ReportSubtitle']))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
    
    async def _get_payments(self, compound_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Get payments for a compound within date range"""
        cursor = self.db.payment_transactions.find({
            "compound_id": compound_id,
            "created_at": {"$gte": start_date, "$lte": end_date}
        }).sort("created_at", -1)
        return await cursor.to_list(length=100)
    
    async def _get_bills(self, compound_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Get bills for a compound within date range"""
        cursor = self.db.bills.find({
            "compound_id": compound_id,
            "created_at": {"$gte": start_date, "$lte": end_date}
        }).sort("created_at", -1)
        return await cursor.to_list(length=100)
    
    async def _get_residents(self, compound_id: str) -> List[Dict]:
        """Get residents for a compound"""
        cursor = self.db.users.find({
            "compound_id": compound_id,
            "role": "resident"
        }).sort("full_name", 1)
        return await cursor.to_list(length=200)
    
    async def _get_maintenance_requests(self, compound_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Get maintenance requests for a compound within date range"""
        cursor = self.db.maintenance_requests.find({
            "compound_id": compound_id,
            "created_at": {"$gte": start_date, "$lte": end_date}
        }).sort("created_at", -1)
        return await cursor.to_list(length=100)
