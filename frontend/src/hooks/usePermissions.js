import { useMemo } from 'react';
import { useAuth } from '../App';

/**
 * usePermissions — مصدر موحّد لكل فحوص الأدوار (RBAC) في الـ Frontend.
 *
 * بدل تكرار `user?.role === 'admin'` في كل مكون (الذي يخفي الأزرار عن
 * `company_admin` / `super_admin` / `app_owner`)، استورد هذا الـ hook
 * واستخدم الـ booleans التالية.
 *
 * Usage:
 *   const { isAdmin, isCompanyAdmin, isResident } = usePermissions();
 *   {isAdmin && <button>إنشاء</button>}
 */
const ADMIN_ROLES = ['admin', 'company_admin', 'super_admin', 'app_owner'];
const STAFF_ROLES = ['admin', 'manager', 'accountant', 'assistant_manager', 'company_admin', 'super_admin', 'app_owner'];

export const usePermissions = () => {
  const { user } = useAuth() || {};

  return useMemo(() => {
    const activeRole = user?.active_role || user?.role || null;
    return {
      user,
      activeRole,
      // Any admin-level role that can create/edit content & manage users
      isAdmin: ADMIN_ROLES.includes(activeRole),
      // Staff includes managers/accountants but excludes residents/security/advertisers
      isStaff: STAFF_ROLES.includes(activeRole),
      // Role-specific flags (use when you need granular UI)
      isCompoundAdmin: activeRole === 'admin',
      isCompanyAdmin: activeRole === 'company_admin',
      isSuperAdmin: activeRole === 'super_admin',
      isAppOwner: activeRole === 'app_owner',
      isManager: activeRole === 'manager',
      isAccountant: activeRole === 'accountant',
      isResident: activeRole === 'resident',
      isSecurity: activeRole === 'security',
      isAdvertiser: activeRole === 'advertiser',
    };
  }, [user]);
};

export default usePermissions;
