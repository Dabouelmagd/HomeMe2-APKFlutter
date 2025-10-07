from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import uuid
from enum import Enum

class SubscriptionDuration(str, Enum):
    ONE_MONTH = "1_month"
    TWO_MONTHS = "2_months" 
    THREE_MONTHS = "3_months"
    SIX_MONTHS = "6_months"
    ONE_YEAR = "1_year"

class CodeStatus(str, Enum):
    ACTIVE = "active"
    USED = "used"
    EXPIRED = "expired"
    DISABLED = "disabled"

class SubscriptionCode(BaseModel):
    """نموذج كود الاشتراك"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str = Field(..., description="الكود الفريد")
    duration: SubscriptionDuration = Field(..., description="مدة الاشتراك")
    duration_days: int = Field(..., description="عدد الأيام")
    max_uses: int = Field(default=1, description="عدد مرات الاستخدام المسموح")
    current_uses: int = Field(default=0, description="عدد مرات الاستخدام الحالية")
    compound_id: Optional[str] = Field(None, description="معرف المجمع السكني (اختياري)")
    compound_name: Optional[str] = Field(None, description="اسم المجمع السكني")
    status: CodeStatus = Field(default=CodeStatus.ACTIVE, description="حالة الكود")
    
    # تواريخ مهمة
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    created_by: str = Field(..., description="منشئ الكود")
    expires_at: Optional[datetime] = Field(None, description="تاريخ انتهاء صلاحية الكود")
    
    # إحصائيات
    used_by_users: List[str] = Field(default=[], description="قائمة المستخدمين الذين استخدموا الكود")
    usage_history: List[Dict[str, Any]] = Field(default=[], description="تاريخ الاستخدام")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class CreateSubscriptionCodeRequest(BaseModel):
    """طلب إنشاء كود اشتراك جديد"""
    duration: SubscriptionDuration = Field(..., description="مدة الاشتراك")
    max_uses: int = Field(default=1, ge=1, le=1000, description="عدد مرات الاستخدام (1-1000)")
    compound_id: Optional[str] = Field(None, description="معرف المجمع السكني")
    expires_in_days: Optional[int] = Field(None, ge=1, le=365, description="صلاحية الكود بالأيام")
    custom_code: Optional[str] = Field(None, description="كود مخصص (اختياري)")

class ActivateSubscriptionCodeRequest(BaseModel):
    """طلب تفعيل كود اشتراك"""
    code: str = Field(..., min_length=1, description="الكود")
    user_id: str = Field(..., description="معرف المستخدم")

class UserSubscription(BaseModel):
    """نموذج اشتراك المستخدم"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., description="معرف المستخدم")
    code_id: str = Field(..., description="معرف الكود المستخدم")
    code: str = Field(..., description="الكود المستخدم")
    duration: SubscriptionDuration = Field(..., description="مدة الاشتراك")
    
    # تواريخ الاشتراك
    activated_at: datetime = Field(default_factory=lambda: datetime.now())
    starts_at: datetime = Field(default_factory=lambda: datetime.now())
    expires_at: datetime = Field(..., description="تاريخ انتهاء الاشتراك")
    
    # حالة الاشتراك
    is_active: bool = Field(default=True)
    auto_renewal: bool = Field(default=False)
    
    # معلومات إضافية
    compound_id: Optional[str] = Field(None, description="معرف المجمع السكني")
    notes: Optional[str] = Field(None, description="ملاحظات")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class SubscriptionCodeStats(BaseModel):
    """إحصائيات أكواد الاشتراك"""
    total_codes: int = Field(default=0)
    active_codes: int = Field(default=0)
    used_codes: int = Field(default=0)
    expired_codes: int = Field(default=0)
    
    codes_by_duration: Dict[str, int] = Field(default={})
    total_activations: int = Field(default=0)
    active_subscriptions: int = Field(default=0)
    
    # إحصائيات الأشهر الماضية
    monthly_activations: List[Dict[str, Any]] = Field(default=[])
    
class BulkCreateCodesRequest(BaseModel):
    """طلب إنشاء أكواد متعددة"""
    duration: SubscriptionDuration = Field(..., description="مدة الاشتراك")
    count: int = Field(..., ge=1, le=1000, description="عدد الأكواد (1-1000)")
    max_uses_per_code: int = Field(default=1, description="عدد مرات الاستخدام لكل كود")
    compound_id: Optional[str] = Field(None, description="معرف المجمع السكني")
    expires_in_days: Optional[int] = Field(None, description="صلاحية الأكواد بالأيام")

class SubscriptionCodeResponse(BaseModel):
    """استجابة كود الاشتراك"""
    success: bool
    message: str
    code: Optional[SubscriptionCode] = None
    subscription: Optional[UserSubscription] = None

class BulkCodesResponse(BaseModel):
    """استجابة إنشاء الأكواد المتعددة"""
    success: bool
    message: str
    codes: List[SubscriptionCode] = Field(default=[])
    total_created: int = Field(default=0)