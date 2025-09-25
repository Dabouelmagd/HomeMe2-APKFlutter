# Permission System for Individual vs Enterprise Management
from enum import Enum
from typing import List, Dict, Set
from pydantic import BaseModel

class PermissionLevel(str, Enum):
    # Individual Compound Permissions
    INDIVIDUAL_ADMIN = "individual_admin"          # Full control of single compound
    INDIVIDUAL_MANAGER = "individual_manager"      # Limited management of single compound
    
    # Enterprise Company Permissions
    ENTERPRISE_ADMIN = "enterprise_admin"          # Full control of company and all compounds
    COMPANY_MANAGER = "company_manager"            # Manage multiple compounds within company
    COMPOUND_MANAGER = "compound_manager"          # Manage specific compounds only
    
    # System Permissions
    SUPER_ADMIN = "super_admin"                    # System-wide access (platform owner)

class Permission(str, Enum):
    # Compound Management
    VIEW_COMPOUND = "view_compound"
    EDIT_COMPOUND = "edit_compound" 
    DELETE_COMPOUND = "delete_compound"
    CREATE_COMPOUND = "create_compound"
    
    # User Management
    VIEW_USERS = "view_users"
    INVITE_USERS = "invite_users"
    EDIT_USERS = "edit_users"
    DELETE_USERS = "delete_users"
    MANAGE_ADMINS = "manage_admins"
    
    # Financial Management
    VIEW_BILLING = "view_billing"
    EDIT_BILLING = "edit_billing"
    PROCESS_PAYMENTS = "process_payments"
    VIEW_PRICING = "view_pricing"
    EDIT_PRICING = "edit_pricing"
    
    # Company Management (Enterprise Only)
    VIEW_COMPANY = "view_company"
    EDIT_COMPANY = "edit_company"
    DELETE_COMPANY = "delete_company"
    MANAGE_COMPANY_SETTINGS = "manage_company_settings"
    MANAGE_COMPANY_BRANDING = "manage_company_branding"
    
    # Analytics & Reports
    VIEW_ANALYTICS = "view_analytics"
    EXPORT_DATA = "export_data"
    VIEW_REPORTS = "view_reports"
    
    # Service Management
    MANAGE_SERVICES = "manage_services"
    BOOK_SERVICES = "book_services"
    APPROVE_BOOKINGS = "approve_bookings"
    
    # Communication
    SEND_NOTIFICATIONS = "send_notifications"
    MANAGE_ANNOUNCEMENTS = "manage_announcements"
    ACCESS_CHAT = "access_chat"
    MODERATE_CHAT = "moderate_chat"

class PermissionMatrix:
    """Define permissions for each role"""
    
    ROLE_PERMISSIONS: Dict[PermissionLevel, Set[Permission]] = {
        # Individual Compound Admin - Full control of single compound
        PermissionLevel.INDIVIDUAL_ADMIN: {
            Permission.VIEW_COMPOUND,
            Permission.EDIT_COMPOUND,
            Permission.VIEW_USERS,
            Permission.INVITE_USERS,
            Permission.EDIT_USERS,
            Permission.DELETE_USERS,
            Permission.VIEW_BILLING,
            Permission.EDIT_BILLING,
            Permission.PROCESS_PAYMENTS,
            Permission.VIEW_PRICING,
            Permission.VIEW_ANALYTICS,
            Permission.EXPORT_DATA,
            Permission.VIEW_REPORTS,
            Permission.MANAGE_SERVICES,
            Permission.APPROVE_BOOKINGS,
            Permission.SEND_NOTIFICATIONS,
            Permission.MANAGE_ANNOUNCEMENTS,
            Permission.ACCESS_CHAT,
            Permission.MODERATE_CHAT,
        },
        
        # Individual Compound Manager - Limited management
        PermissionLevel.INDIVIDUAL_MANAGER: {
            Permission.VIEW_COMPOUND,
            Permission.VIEW_USERS,
            Permission.INVITE_USERS,
            Permission.VIEW_BILLING,
            Permission.VIEW_ANALYTICS,
            Permission.VIEW_REPORTS,
            Permission.MANAGE_SERVICES,
            Permission.BOOK_SERVICES,
            Permission.APPROVE_BOOKINGS,
            Permission.SEND_NOTIFICATIONS,
            Permission.ACCESS_CHAT,
        },
        
        # Enterprise Admin - Full control of company and all compounds
        PermissionLevel.ENTERPRISE_ADMIN: {
            Permission.VIEW_COMPOUND,
            Permission.EDIT_COMPOUND,
            Permission.DELETE_COMPOUND,
            Permission.CREATE_COMPOUND,
            Permission.VIEW_USERS,
            Permission.INVITE_USERS,
            Permission.EDIT_USERS,
            Permission.DELETE_USERS,
            Permission.MANAGE_ADMINS,
            Permission.VIEW_BILLING,
            Permission.EDIT_BILLING,
            Permission.PROCESS_PAYMENTS,
            Permission.VIEW_PRICING,
            Permission.EDIT_PRICING,
            Permission.VIEW_COMPANY,
            Permission.EDIT_COMPANY,
            Permission.MANAGE_COMPANY_SETTINGS,
            Permission.MANAGE_COMPANY_BRANDING,
            Permission.VIEW_ANALYTICS,
            Permission.EXPORT_DATA,
            Permission.VIEW_REPORTS,
            Permission.MANAGE_SERVICES,
            Permission.APPROVE_BOOKINGS,
            Permission.SEND_NOTIFICATIONS,
            Permission.MANAGE_ANNOUNCEMENTS,
            Permission.ACCESS_CHAT,
            Permission.MODERATE_CHAT,
        },
        
        # Company Manager - Manage multiple compounds within company
        PermissionLevel.COMPANY_MANAGER: {
            Permission.VIEW_COMPOUND,
            Permission.EDIT_COMPOUND,
            Permission.CREATE_COMPOUND,
            Permission.VIEW_USERS,
            Permission.INVITE_USERS,
            Permission.EDIT_USERS,
            Permission.VIEW_BILLING,
            Permission.EDIT_BILLING,
            Permission.PROCESS_PAYMENTS,
            Permission.VIEW_PRICING,
            Permission.VIEW_COMPANY,
            Permission.VIEW_ANALYTICS,
            Permission.EXPORT_DATA,
            Permission.VIEW_REPORTS,
            Permission.MANAGE_SERVICES,
            Permission.APPROVE_BOOKINGS,
            Permission.SEND_NOTIFICATIONS,
            Permission.MANAGE_ANNOUNCEMENTS,
            Permission.ACCESS_CHAT,
            Permission.MODERATE_CHAT,
        },
        
        # Compound Manager - Manage specific compounds only
        PermissionLevel.COMPOUND_MANAGER: {
            Permission.VIEW_COMPOUND,
            Permission.EDIT_COMPOUND,
            Permission.VIEW_USERS,
            Permission.INVITE_USERS,
            Permission.EDIT_USERS,
            Permission.VIEW_BILLING,
            Permission.VIEW_PRICING,
            Permission.VIEW_ANALYTICS,
            Permission.VIEW_REPORTS,
            Permission.MANAGE_SERVICES,
            Permission.BOOK_SERVICES,
            Permission.APPROVE_BOOKINGS,
            Permission.SEND_NOTIFICATIONS,
            Permission.ACCESS_CHAT,
        },
        
        # Super Admin - System-wide access
        PermissionLevel.SUPER_ADMIN: set(Permission),  # All permissions
    }

class PermissionChecker:
    """Utility class to check permissions"""
    
    @classmethod
    def has_permission(cls, user_role: PermissionLevel, permission: Permission) -> bool:
        """Check if a role has a specific permission"""
        return permission in PermissionMatrix.ROLE_PERMISSIONS.get(user_role, set())
    
    @classmethod
    def get_permissions(cls, user_role: PermissionLevel) -> Set[Permission]:
        """Get all permissions for a role"""
        return PermissionMatrix.ROLE_PERMISSIONS.get(user_role, set())
    
    @classmethod
    def can_manage_compound(cls, user_role: PermissionLevel, action: Permission) -> bool:
        """Check if user can perform compound management actions"""
        return cls.has_permission(user_role, action)
    
    @classmethod
    def can_manage_users(cls, user_role: PermissionLevel) -> bool:
        """Check if user can manage other users"""
        return cls.has_permission(user_role, Permission.EDIT_USERS)
    
    @classmethod
    def can_access_billing(cls, user_role: PermissionLevel) -> bool:
        """Check if user can access billing features"""
        return cls.has_permission(user_role, Permission.VIEW_BILLING)
    
    @classmethod
    def can_manage_company(cls, user_role: PermissionLevel) -> bool:
        """Check if user can manage company settings (Enterprise only)"""
        return cls.has_permission(user_role, Permission.EDIT_COMPANY)

class PermissionComparison:
    """Compare Individual vs Enterprise permissions for user understanding"""
    
    @classmethod
    def get_permission_comparison(cls) -> Dict:
        """Get comparison between Individual and Enterprise permissions"""
        return {
            "individual_compound": {
                "admin": {
                    "role": "Individual Compound Admin",
                    "description": "Complete control over single compound",
                    "key_features": [
                        "Manage single compound only",
                        "Full user management within compound",
                        "Complete billing and financial control",
                        "Analytics and reporting for compound",
                        "Service management and bookings",
                        "Communication and notifications"
                    ],
                    "limitations": [
                        "Cannot create additional compounds",
                        "No company-level management",
                        "Limited to individual compound pricing",
                        "No multi-compound analytics"
                    ]
                },
                "manager": {
                    "role": "Individual Compound Manager",
                    "description": "Limited management of single compound",
                    "key_features": [
                        "View compound information",
                        "Invite new users",
                        "Basic service management",
                        "View analytics and reports",
                        "Send notifications"
                    ],
                    "limitations": [
                        "Cannot edit compound settings",
                        "Cannot manage billing",
                        "Cannot delete users",
                        "Limited administrative access"
                    ]
                }
            },
            "enterprise_company": {
                "admin": {
                    "role": "Enterprise Admin",
                    "description": "Complete control over company and all compounds",
                    "key_features": [
                        "Manage unlimited compounds",
                        "Company-wide branding and settings",
                        "Multi-compound analytics and reporting",
                        "Volume-based pricing benefits",
                        "Advanced user role management", 
                        "Centralized billing and invoicing",
                        "Cross-compound resource management"
                    ],
                    "unique_benefits": [
                        "First year free for all compounds",
                        "Volume discounts (10-40% off)",
                        "Company branding across compounds",
                        "Consolidated analytics dashboard",
                        "Advanced permission management"
                    ]
                },
                "company_manager": {
                    "role": "Company Manager",
                    "description": "Manage multiple compounds within company",
                    "key_features": [
                        "Access multiple compounds",
                        "Create new compounds",
                        "Cross-compound user management",
                        "Company-level analytics",
                        "Advanced service coordination"
                    ]
                },
                "compound_manager": {
                    "role": "Compound Manager",
                    "description": "Manage specific assigned compounds",
                    "key_features": [
                        "Manage assigned compounds only",
                        "User management within compounds",
                        "Compound-specific analytics",
                        "Service management"
                    ]
                }
            }
        }

# Export the main classes
__all__ = [
    'PermissionLevel',
    'Permission', 
    'PermissionChecker',
    'PermissionComparison'
]