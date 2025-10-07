import random
import string
import hashlib
from datetime import datetime
from typing import Optional
from subscription_models import SubscriptionDuration

class HomeCodeGenerator:
    """مولد أكواد HomeMe المخصصة"""
    
    # بادئات الأكواد حسب المدة
    DURATION_PREFIXES = {
        SubscriptionDuration.ONE_MONTH: "HM1M",
        SubscriptionDuration.TWO_MONTHS: "HM2M", 
        SubscriptionDuration.THREE_MONTHS: "HM3M",
        SubscriptionDuration.SIX_MONTHS: "HM6M",
        SubscriptionDuration.ONE_YEAR: "HM1Y"
    }
    
    # أحرف وأرقام للكود (بدون أحرف مشبهة)
    CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"
    
    @classmethod
    def generate_code(cls, duration: SubscriptionDuration, custom_code: Optional[str] = None) -> str:
        """
        ينشئ كود فريد للاشتراك
        
        Format: HM[Duration]-YYYY-[RandomCode]
        Example: HM1M-2024-ABC5XY2Z
        """
        if custom_code:
            return cls._validate_and_format_custom_code(custom_code, duration)
        
        # البادئة حسب المدة
        prefix = cls.DURATION_PREFIXES[duration]
        
        # السنة الحالية
        year = datetime.now().year
        
        # كود عشوائي (8 أحرف)
        random_code = cls._generate_random_string(8)
        
        # تجميع الكود
        code = f"{prefix}-{year}-{random_code}"
        
        return code
    
    @classmethod
    def _generate_random_string(cls, length: int) -> str:
        """ينشئ نص عشوائي بالطول المحدد"""
        return ''.join(random.choices(cls.CODE_CHARS, k=length))
    
    @classmethod
    def _validate_and_format_custom_code(cls, custom_code: str, duration: SubscriptionDuration) -> str:
        """يتحقق من الكود المخصص وينسقه"""
        # إزالة المسافات وتحويل للأحرف الكبيرة
        cleaned_code = custom_code.strip().upper()
        
        # التحقق من الطول (8-20 حرف)
        if len(cleaned_code) < 8 or len(cleaned_code) > 20:
            raise ValueError("الكود المخصص يجب أن يكون بين 8-20 حرف")
        
        # التحقق من الأحرف المسموحة فقط
        allowed_chars = set(cls.CODE_CHARS + "-")
        if not all(c in allowed_chars for c in cleaned_code):
            raise ValueError("الكود يحتوي على أحرف غير مسموحة")
        
        # إضافة البادئة إذا لم تكن موجودة
        prefix = cls.DURATION_PREFIXES[duration]
        if not cleaned_code.startswith(prefix):
            year = datetime.now().year
            cleaned_code = f"{prefix}-{year}-{cleaned_code}"
        
        return cleaned_code
    
    @classmethod
    def get_duration_days(cls, duration: SubscriptionDuration) -> int:
        """يحصل على عدد الأيام للمدة المحددة"""
        duration_days = {
            SubscriptionDuration.ONE_MONTH: 30,
            SubscriptionDuration.TWO_MONTHS: 60,
            SubscriptionDuration.THREE_MONTHS: 90,
            SubscriptionDuration.SIX_MONTHS: 180,
            SubscriptionDuration.ONE_YEAR: 365
        }
        return duration_days[duration]
    
    @classmethod
    def get_duration_name_arabic(cls, duration: SubscriptionDuration) -> str:
        """يحصل على اسم المدة بالعربية"""
        names = {
            SubscriptionDuration.ONE_MONTH: "شهر واحد",
            SubscriptionDuration.TWO_MONTHS: "شهرين",
            SubscriptionDuration.THREE_MONTHS: "ثلاثة شهور",
            SubscriptionDuration.SIX_MONTHS: "ستة شهور", 
            SubscriptionDuration.ONE_YEAR: "سنة كاملة"
        }
        return names[duration]
    
    @classmethod
    def validate_code_format(cls, code: str) -> bool:
        """يتحقق من صحة تنسيق الكود"""
        try:
            # تنظيف الكود
            code = code.strip().upper()
            
            # التحقق من الطول الأساسي
            if len(code) < 10:
                return False
            
            # التحقق من وجود بادئة صحيحة
            has_valid_prefix = any(code.startswith(prefix) for prefix in cls.DURATION_PREFIXES.values())
            
            return has_valid_prefix
        except:
            return False
    
    @classmethod
    def extract_duration_from_code(cls, code: str) -> Optional[SubscriptionDuration]:
        """يستخرج نوع المدة من الكود"""
        try:
            code = code.strip().upper()
            for duration, prefix in cls.DURATION_PREFIXES.items():
                if code.startswith(prefix):
                    return duration
            return None
        except:
            return None
    
    @classmethod
    def generate_bulk_codes(cls, duration: SubscriptionDuration, count: int) -> list[str]:
        """ينشئ عدة أكواد فريدة"""
        codes = []
        for _ in range(count):
            code = cls.generate_code(duration)
            # التأكد من عدم التكرار
            while code in codes:
                code = cls.generate_code(duration)
            codes.append(code)
        return codes