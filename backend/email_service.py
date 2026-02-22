"""
Email Service for HomeMe
Handles all email notifications for residents and administrators
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from typing import Optional, List
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

logger = logging.getLogger(__name__)

# Thread pool for async email sending
executor = ThreadPoolExecutor(max_workers=3)

class EmailService:
    def __init__(self):
        self.smtp_host = os.environ.get('SMTP_HOST', 'gtxm1001.siteground.biz')
        self.smtp_port = int(os.environ.get('SMTP_PORT', 465))
        self.smtp_user = os.environ.get('SMTP_USER', 'info@datalifeai.com')
        self.smtp_password = os.environ.get('SMTP_PASSWORD', '')
        self.from_email = os.environ.get('SMTP_FROM_EMAIL', 'info@datalifeai.com')
        self.from_name = os.environ.get('SMTP_FROM_NAME', 'HomeMe')
    
    def _send_email_sync(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
        """Synchronous email sending function"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            # Add text and HTML parts
            if text_content:
                part1 = MIMEText(text_content, 'plain', 'utf-8')
                msg.attach(part1)
            
            part2 = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(part2)
            
            # Create SSL context and connect
            context = ssl.create_default_context()
            
            with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, context=context) as server:
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.from_email, to_email, msg.as_string())
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    async def send_email(self, to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
        """Async wrapper for email sending"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            executor,
            self._send_email_sync,
            to_email,
            subject,
            html_content,
            text_content
        )
    
    # ==================== RESIDENT NOTIFICATIONS ====================
    
    async def send_welcome_email(self, to_email: str, full_name: str, username: str, compound_name: str = None) -> bool:
        """Send welcome email to new residents"""
        subject = "مرحباً بك في HomeMe - Welcome to HomeMe"
        
        html_content = f"""
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 28px; }}
                .content {{ padding: 30px; }}
                .welcome-box {{ background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }}
                .info-item {{ margin: 10px 0; padding: 10px; background: white; border-radius: 6px; border-right: 4px solid #667eea; }}
                .btn {{ display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin-top: 20px; }}
                .footer {{ background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏠 HomeMe</h1>
                    <p>نظام إدارة المجمعات السكنية</p>
                </div>
                <div class="content">
                    <h2>مرحباً {full_name}! 👋</h2>
                    <p>نرحب بك في عائلة HomeMe. تم إنشاء حسابك بنجاح.</p>
                    
                    <div class="welcome-box">
                        <h3>معلومات حسابك:</h3>
                        <div class="info-item">
                            <strong>اسم المستخدم:</strong> {username}
                        </div>
                        <div class="info-item">
                            <strong>المجمع السكني:</strong> {compound_name or 'غير محدد'}
                        </div>
                    </div>
                    
                    <p>يمكنك الآن:</p>
                    <ul>
                        <li>إدارة أفراد عائلتك</li>
                        <li>طلب الخدمات والصيانة</li>
                        <li>متابعة المدفوعات والفواتير</li>
                        <li>إدارة زيارات الضيوف</li>
                    </ul>
                    
                    <center>
                        <a href="https://homemeapp.net/login" class="btn">تسجيل الدخول الآن</a>
                    </center>
                </div>
                <div class="footer">
                    <p>© 2025 HomeMe - جميع الحقوق محفوظة</p>
                    <p>هذه رسالة آلية، يرجى عدم الرد عليها</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        مرحباً {full_name}!
        
        نرحب بك في عائلة HomeMe. تم إنشاء حسابك بنجاح.
        
        معلومات حسابك:
        - اسم المستخدم: {username}
        - المجمع السكني: {compound_name or 'غير محدد'}
        
        يمكنك تسجيل الدخول من: https://homemeapp.net/login
        
        مع تحيات فريق HomeMe
        """
        
        return await self.send_email(to_email, subject, html_content, text_content)
    
    async def send_payment_reminder(self, to_email: str, full_name: str, amount: float, due_date: str, invoice_description: str = None) -> bool:
        """Send payment reminder to residents"""
        subject = f"تذكير بالدفع - HomeMe Payment Reminder"
        
        html_content = f"""
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; }}
                .content {{ padding: 30px; }}
                .amount-box {{ background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }}
                .amount {{ font-size: 32px; font-weight: bold; color: #856404; }}
                .due-date {{ color: #dc3545; font-weight: bold; }}
                .btn {{ display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin-top: 20px; }}
                .footer {{ background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💰 تذكير بالدفع</h1>
                </div>
                <div class="content">
                    <h2>مرحباً {full_name}</h2>
                    <p>نود تذكيرك بوجود مبلغ مستحق الدفع.</p>
                    
                    <div class="amount-box">
                        <p>المبلغ المستحق:</p>
                        <div class="amount">{amount:.2f} ج.م</div>
                        <p class="due-date">تاريخ الاستحقاق: {due_date}</p>
                        {f'<p>{invoice_description}</p>' if invoice_description else ''}
                    </div>
                    
                    <p>يرجى سداد المبلغ في أقرب وقت ممكن لتجنب أي رسوم تأخير.</p>
                    
                    <center>
                        <a href="https://homemeapp.net/payments" class="btn">ادفع الآن</a>
                    </center>
                </div>
                <div class="footer">
                    <p>© 2025 HomeMe - جميع الحقوق محفوظة</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_content)
    
    async def send_visitor_arrival(self, to_email: str, resident_name: str, visitor_name: str, arrival_time: str, unit_number: str = None) -> bool:
        """Send visitor arrival notification to residents"""
        subject = f"وصول زائر - {visitor_name}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; }}
                .content {{ padding: 30px; }}
                .visitor-box {{ background: #d4edda; border: 2px solid #28a745; border-radius: 8px; padding: 20px; margin: 20px 0; }}
                .visitor-name {{ font-size: 24px; font-weight: bold; color: #155724; }}
                .footer {{ background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚪 إشعار وصول زائر</h1>
                </div>
                <div class="content">
                    <h2>مرحباً {resident_name}</h2>
                    <p>نود إعلامك بوصول زائر إلى المجمع.</p>
                    
                    <div class="visitor-box">
                        <p>اسم الزائر:</p>
                        <div class="visitor-name">{visitor_name}</div>
                        <p><strong>وقت الوصول:</strong> {arrival_time}</p>
                        {f'<p><strong>الوحدة:</strong> {unit_number}</p>' if unit_number else ''}
                    </div>
                    
                    <p>تم تسجيل دخول الزائر من قبل حراسة المجمع.</p>
                </div>
                <div class="footer">
                    <p>© 2025 HomeMe - جميع الحقوق محفوظة</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_content)
    
    # ==================== ADMIN NOTIFICATIONS ====================
    
    async def send_new_resident_notification(self, admin_email: str, admin_name: str, new_resident_name: str, unit_number: str, compound_name: str) -> bool:
        """Send notification to admin when new resident registers"""
        subject = f"مقيم جديد - {new_resident_name}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
                .content {{ padding: 30px; }}
                .info-box {{ background: #e7f3ff; border: 2px solid #007bff; border-radius: 8px; padding: 20px; margin: 20px 0; }}
                .btn {{ display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin-top: 20px; }}
                .footer {{ background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>👤 مقيم جديد</h1>
                </div>
                <div class="content">
                    <h2>مرحباً {admin_name}</h2>
                    <p>تم تسجيل مقيم جديد في المجمع.</p>
                    
                    <div class="info-box">
                        <p><strong>الاسم:</strong> {new_resident_name}</p>
                        <p><strong>الوحدة:</strong> {unit_number or 'غير محدد'}</p>
                        <p><strong>المجمع:</strong> {compound_name}</p>
                    </div>
                    
                    <center>
                        <a href="https://homemeapp.net/residents" class="btn">عرض السكان</a>
                    </center>
                </div>
                <div class="footer">
                    <p>© 2025 HomeMe - جميع الحقوق محفوظة</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(admin_email, subject, html_content)
    
    async def send_maintenance_request_notification(self, admin_email: str, admin_name: str, request_title: str, resident_name: str, unit_number: str, priority: str) -> bool:
        """Send notification to admin for new maintenance request"""
        priority_colors = {
            'emergency': '#dc3545',
            'urgent': '#fd7e14',
            'high': '#ffc107',
            'normal': '#17a2b8',
            'low': '#28a745'
        }
        priority_color = priority_colors.get(priority.lower(), '#17a2b8')
        
        subject = f"طلب صيانة جديد - {request_title}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; }}
                .content {{ padding: 30px; }}
                .request-box {{ background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-right: 5px solid {priority_color}; }}
                .priority-badge {{ display: inline-block; background: {priority_color}; color: white; padding: 5px 15px; border-radius: 15px; font-size: 14px; }}
                .btn {{ display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin-top: 20px; }}
                .footer {{ background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔧 طلب صيانة جديد</h1>
                </div>
                <div class="content">
                    <h2>مرحباً {admin_name}</h2>
                    <p>تم استلام طلب صيانة جديد يتطلب انتباهك.</p>
                    
                    <div class="request-box">
                        <h3>{request_title}</h3>
                        <p><strong>من:</strong> {resident_name}</p>
                        <p><strong>الوحدة:</strong> {unit_number or 'غير محدد'}</p>
                        <p><strong>الأولوية:</strong> <span class="priority-badge">{priority}</span></p>
                    </div>
                    
                    <center>
                        <a href="https://homemeapp.net/maintenance" class="btn">عرض الطلب</a>
                    </center>
                </div>
                <div class="footer">
                    <p>© 2025 HomeMe - جميع الحقوق محفوظة</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(admin_email, subject, html_content)
    
    async def send_daily_report(self, admin_email: str, admin_name: str, compound_name: str, stats: dict) -> bool:
        """Send daily report to admin"""
        today = datetime.now().strftime('%Y-%m-%d')
        subject = f"التقرير اليومي - {compound_name} - {today}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
                .content {{ padding: 30px; }}
                .stats-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }}
                .stat-box {{ background: #f8f9fa; border-radius: 8px; padding: 15px; text-align: center; }}
                .stat-number {{ font-size: 28px; font-weight: bold; color: #667eea; }}
                .stat-label {{ color: #666; font-size: 14px; }}
                .footer {{ background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 التقرير اليومي</h1>
                    <p>{compound_name} - {today}</p>
                </div>
                <div class="content">
                    <h2>مرحباً {admin_name}</h2>
                    <p>إليك ملخص نشاط اليوم:</p>
                    
                    <div class="stats-grid">
                        <div class="stat-box">
                            <div class="stat-number">{stats.get('new_residents', 0)}</div>
                            <div class="stat-label">مقيمين جدد</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-number">{stats.get('visitors_today', 0)}</div>
                            <div class="stat-label">زوار اليوم</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-number">{stats.get('maintenance_requests', 0)}</div>
                            <div class="stat-label">طلبات صيانة</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-number">{stats.get('payments_received', 0)}</div>
                            <div class="stat-label">مدفوعات مستلمة</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-number">{stats.get('pending_payments', 0)}</div>
                            <div class="stat-label">مدفوعات معلقة</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-number">{stats.get('messages_sent', 0)}</div>
                            <div class="stat-label">رسائل مرسلة</div>
                        </div>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 HomeMe - جميع الحقوق محفوظة</p>
                    <p>هذا تقرير آلي يومي</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(admin_email, subject, html_content)


# Create singleton instance
email_service = EmailService()
