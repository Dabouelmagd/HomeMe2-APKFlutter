"""
Feature Flags — exposes the current user's plan and feature matrix to the frontend.

Used by `useFeatureFlag()` hook to gate UI elements based on the company's subscription tier.
Returns the SAME `_PLAN_FEATURES` matrix used by backend assert_feature_enabled,
so frontend gates and backend enforcement stay in sync.
"""
from fastapi import APIRouter, Depends
from typing import Optional

from database import get_db
from auth_deps import get_current_user
from plan_limits import (
    get_company_plan_limits,
    _PLAN_FEATURES,
    _PLAN_NAME_AR,
)

router = APIRouter(prefix="/api/feature-flags", tags=["feature-flags"])


# Human-readable labels for each feature (used by upgrade toast)
FEATURE_LABELS_AR = {
    "billing_payments": "المدفوعات والفواتير",
    "ads_campaigns": "الحملات الإعلانية",
    "pdf_excel_exports": "تصدير PDF / Excel",
    "ai_financial_insights": "التحليلات المالية الذكية",
    "advanced_dashboard": "لوحة التحليلات المتقدمة",
    "custom_api": "API مخصص للشركة",
    "whitelabel": "العلامة البيضاء (White-label)",
    "priority_support": "دعم فني متقدم",
}

# Minimum plan required for each feature (lowest plan that enables it)
FEATURE_MIN_PLAN = {
    "billing_payments": "company_startup",
    "ads_campaigns": "company_startup",
    "pdf_excel_exports": "company_business",
    "ai_financial_insights": "company_business",
    "advanced_dashboard": "company_business",
    "custom_api": "company_business",
    "whitelabel": "company_enterprise",
    "priority_support": "company_business",
}


async def _resolve_company_id(current_user: dict) -> Optional[str]:
    """Find the user's company_id by role."""
    role = current_user.get("role")
    if role == "company_admin":
        return current_user.get("company_id") or current_user.get("management_company_id")
    if role in ("admin", "manager", "resident", "security"):
        # Find the compound's parent company
        compound_id = current_user.get("compound_id")
        if not compound_id:
            return None
        db = get_db()
        compound = await db.compounds.find_one(
            {"id": compound_id},
            {"_id": 0, "company_id": 1, "management_company_id": 1},
        )
        if compound:
            return compound.get("company_id") or compound.get("management_company_id")
    return None


@router.get("/me")
async def get_my_feature_flags(current_user: dict = Depends(get_current_user)):
    """
    Returns the feature matrix for the current user's company.
    
    Response:
    {
      "plan": "company_business",
      "plan_name_ar": "شركة متوسطة",
      "features": { "advanced_dashboard": true, ... },
      "feature_min_plan": { "advanced_dashboard": "company_business", ... },
      "feature_labels_ar": { "advanced_dashboard": "...", ... },
      "plan_name_ar_by_key": { "starter": "مجاني", ... }
    }
    """
    role = current_user.get("role")
    
    # Owner / super_admin always see all features (full power)
    if role in ("app_owner", "super_admin"):
        return {
            "plan": "company_enterprise",
            "plan_name_ar": _PLAN_NAME_AR["company_enterprise"],
            "features": _PLAN_FEATURES["company_enterprise"],
            "feature_min_plan": FEATURE_MIN_PLAN,
            "feature_labels_ar": FEATURE_LABELS_AR,
            "plan_name_ar_by_key": _PLAN_NAME_AR,
            "is_unlimited_role": True,
        }
    
    company_id = await _resolve_company_id(current_user)
    if not company_id:
        # User without a company → starter (most restrictive)
        return {
            "plan": "starter",
            "plan_name_ar": _PLAN_NAME_AR["starter"],
            "features": _PLAN_FEATURES["starter"],
            "feature_min_plan": FEATURE_MIN_PLAN,
            "feature_labels_ar": FEATURE_LABELS_AR,
            "plan_name_ar_by_key": _PLAN_NAME_AR,
            "is_unlimited_role": False,
        }
    
    plan = await get_company_plan_limits(company_id)
    return {
        "plan": plan["plan"],
        "plan_name_ar": plan["plan_name_ar"],
        "features": plan.get("feature_flags", {}),
        "feature_min_plan": FEATURE_MIN_PLAN,
        "feature_labels_ar": FEATURE_LABELS_AR,
        "plan_name_ar_by_key": _PLAN_NAME_AR,
        "is_unlimited_role": False,
    }
