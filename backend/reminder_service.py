"""
Automated Payment Reminders Service
Handles automatic reminders for bills and payments
"""
import os
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
from bson import ObjectId
from email_service import EmailService
from push_service import PushNotificationService
from dotenv import load_dotenv

load_dotenv()

class PaymentReminderService:
    def __init__(self, db):
        self.db = db
        self.email_service = EmailService()
        self.push_service = PushNotificationService(db)
        
    async def check_and_send_reminders(self):
        """
        Main function to check all bills and send appropriate reminders
        Should be called periodically (e.g., daily via cron or scheduled task)
        """
        now = datetime.now(timezone.utc)
        
        # Get all unpaid bills
        unpaid_bills = await self._get_unpaid_bills()
        
        reminders_sent = {
            "before_due": 0,
            "on_due_date": 0,
            "overdue": 0
        }
        
        for bill in unpaid_bills:
            try:
                due_date = bill.get("due_date")
                if not due_date:
                    continue
                
                # Convert to datetime if string
                if isinstance(due_date, str):
                    due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                
                days_until_due = (due_date - now).days
                
                # Check if reminder already sent today
                last_reminder = bill.get("last_reminder_sent")
                if last_reminder:
                    if isinstance(last_reminder, str):
                        last_reminder = datetime.fromisoformat(last_reminder.replace('Z', '+00:00'))
                    if (now - last_reminder).days < 1:
                        continue  # Already sent today
                
                # Determine reminder type
                if days_until_due == 3:
                    # Send reminder 3 days before due date
                    await self._send_reminder(bill, "before_due", days_until_due)
                    reminders_sent["before_due"] += 1
                elif days_until_due == 0:
                    # Send reminder on due date
                    await self._send_reminder(bill, "on_due_date", days_until_due)
                    reminders_sent["on_due_date"] += 1
                elif days_until_due < 0:
                    # Send overdue reminder (daily for first week)
                    overdue_days = abs(days_until_due)
                    if overdue_days <= 7 or overdue_days % 7 == 0:
                        await self._send_reminder(bill, "overdue", overdue_days)
                        reminders_sent["overdue"] += 1
                        
            except Exception as e:
                print(f"Error processing bill {bill.get('_id')}: {e}")
                continue
        
        return reminders_sent
    
    async def _get_unpaid_bills(self) -> List[Dict]:
        """Get all unpaid bills"""
        cursor = self.db.bills.find({
            "status": {"$in": ["pending", "unpaid", "overdue"]},
            "reminder_enabled": {"$ne": False}
        })
        return await cursor.to_list(length=1000)
    
    async def _send_reminder(self, bill: Dict, reminder_type: str, days: int):
        """Send reminder via email and push notification"""
        user_id = bill.get("user_id")
        
        # Get user details
        user = await self.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return
        
        email = user.get("email")
        name = user.get("full_name", user.get("username", "Resident"))
        amount = bill.get("amount", 0)
        bill_type = bill.get("type", "Bill")
        due_date = bill.get("due_date")
        
        # Format due date
        if isinstance(due_date, datetime):
            due_date_str = due_date.strftime("%Y-%m-%d")
        else:
            due_date_str = str(due_date)[:10]
        
        # Prepare message content based on reminder type
        if reminder_type == "before_due":
            subject = f"تذكير: فاتورة {bill_type} تستحق خلال {days} أيام | Payment Reminder"
            message_ar = f"""
            مرحباً {name}،
            
            نود تذكيرك بأن لديك فاتورة {bill_type} بقيمة {amount} ج.م تستحق الدفع في {due_date_str}.
            
            يرجى الدفع قبل تاريخ الاستحقاق لتجنب أي رسوم تأخير.
            
            شكراً لك،
            إدارة المجمع
            """
            message_en = f"""
            Hello {name},
            
            This is a reminder that your {bill_type} bill of {amount} EGP is due on {due_date_str}.
            
            Please make the payment before the due date to avoid any late fees.
            
            Thank you,
            Compound Management
            """
        elif reminder_type == "on_due_date":
            subject = f"تنبيه: فاتورة {bill_type} مستحقة اليوم | Payment Due Today"
            message_ar = f"""
            مرحباً {name}،
            
            فاتورة {bill_type} بقيمة {amount} ج.م مستحقة الدفع اليوم.
            
            يرجى الدفع في أقرب وقت ممكن.
            
            شكراً لك،
            إدارة المجمع
            """
            message_en = f"""
            Hello {name},
            
            Your {bill_type} bill of {amount} EGP is due today.
            
            Please make the payment as soon as possible.
            
            Thank you,
            Compound Management
            """
        else:  # overdue
            subject = f"تحذير: فاتورة {bill_type} متأخرة {days} أيام | Overdue Payment Alert"
            message_ar = f"""
            مرحباً {name}،
            
            فاتورة {bill_type} بقيمة {amount} ج.م متأخرة منذ {days} أيام.
            
            يرجى الدفع فوراً لتجنب أي إجراءات إضافية.
            
            إذا كنت قد دفعت بالفعل، يرجى تجاهل هذه الرسالة.
            
            شكراً لك،
            إدارة المجمع
            """
            message_en = f"""
            Hello {name},
            
            Your {bill_type} bill of {amount} EGP is {days} days overdue.
            
            Please make the payment immediately to avoid any additional actions.
            
            If you have already paid, please disregard this message.
            
            Thank you,
            Compound Management
            """
        
        # Combined message
        message = f"{message_ar}\n\n---\n\n{message_en}"
        
        # Send email
        if email:
            try:
                await self.email_service.send_email(
                    to_email=email,
                    subject=subject,
                    body=message
                )
            except Exception as e:
                print(f"Failed to send email to {email}: {e}")
        
        # Send push notification
        try:
            push_title = subject.split(" | ")[0]  # Arabic part
            push_body = f"فاتورة {bill_type}: {amount} ج.م"
            
            await self.push_service.send_notification_to_user(
                user_id=str(user_id),
                title=push_title,
                body=push_body,
                data={
                    "type": "payment_reminder",
                    "bill_id": str(bill.get("_id")),
                    "amount": str(amount),
                    "due_date": due_date_str
                }
            )
        except Exception as e:
            print(f"Failed to send push notification to user {user_id}: {e}")
        
        # Update bill with last reminder sent
        await self.db.bills.update_one(
            {"_id": bill["_id"]},
            {
                "$set": {
                    "last_reminder_sent": datetime.now(timezone.utc),
                    "last_reminder_type": reminder_type
                },
                "$inc": {"reminder_count": 1}
            }
        )
        
        # Log the reminder
        await self.db.reminder_logs.insert_one({
            "bill_id": str(bill["_id"]),
            "user_id": str(user_id),
            "reminder_type": reminder_type,
            "days": days,
            "sent_at": datetime.now(timezone.utc),
            "email_sent": email is not None,
            "push_sent": True
        })
    
    async def send_custom_reminder(
        self,
        bill_id: str,
        custom_message: Optional[str] = None
    ) -> Dict:
        """Send a custom reminder for a specific bill"""
        bill = await self.db.bills.find_one({"_id": ObjectId(bill_id)})
        if not bill:
            raise ValueError("Bill not found")
        
        user_id = bill.get("user_id")
        user = await self.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise ValueError("User not found")
        
        email = user.get("email")
        name = user.get("full_name", user.get("username", "Resident"))
        amount = bill.get("amount", 0)
        bill_type = bill.get("type", "Bill")
        
        subject = f"تذكير بالدفع | Payment Reminder"
        
        if custom_message:
            message = custom_message
        else:
            message = f"""
            مرحباً {name}،
            
            هذا تذكير بشأن فاتورة {bill_type} بقيمة {amount} ج.م.
            
            يرجى الدفع في أقرب وقت ممكن.
            
            شكراً لك،
            إدارة المجمع
            """
        
        result = {"email_sent": False, "push_sent": False}
        
        if email:
            try:
                await self.email_service.send_email(
                    to_email=email,
                    subject=subject,
                    body=message
                )
                result["email_sent"] = True
            except Exception as e:
                result["email_error"] = str(e)
        
        try:
            await self.push_service.send_notification_to_user(
                user_id=str(user_id),
                title="تذكير بالدفع",
                body=f"فاتورة {bill_type}: {amount} ج.م",
                data={"type": "payment_reminder", "bill_id": bill_id}
            )
            result["push_sent"] = True
        except Exception as e:
            result["push_error"] = str(e)
        
        return result
    
    async def get_reminder_settings(self, compound_id: str) -> Dict:
        """Get reminder settings for a compound"""
        settings = await self.db.reminder_settings.find_one({"compound_id": compound_id})
        
        if not settings:
            # Return default settings
            return {
                "enabled": True,
                "days_before_due": [7, 3, 1],
                "send_on_due_date": True,
                "overdue_frequency": "daily",  # daily, weekly
                "email_enabled": True,
                "push_enabled": True
            }
        
        settings.pop("_id", None)
        return settings
    
    async def update_reminder_settings(self, compound_id: str, settings: Dict) -> Dict:
        """Update reminder settings for a compound"""
        settings["compound_id"] = compound_id
        settings["updated_at"] = datetime.now(timezone.utc)
        
        await self.db.reminder_settings.update_one(
            {"compound_id": compound_id},
            {"$set": settings},
            upsert=True
        )
        
        return settings


async def run_reminder_scheduler(db):
    """
    Background task to run reminders periodically
    Should be started when the server starts
    """
    reminder_service = PaymentReminderService(db)
    
    while True:
        try:
            # Run reminders
            results = await reminder_service.check_and_send_reminders()
            print(f"Reminder check completed: {results}")
        except Exception as e:
            print(f"Error in reminder scheduler: {e}")
        
        # Wait 6 hours before next check
        await asyncio.sleep(6 * 60 * 60)
