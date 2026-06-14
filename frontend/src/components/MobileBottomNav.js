import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HomeIcon,
  BellIcon,
  UserCircleIcon,
  Bars3BottomLeftIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

/**
 * MobileBottomNav — Feature #48.
 *
 * Sticky bottom navigation visible only on small screens (< lg).
 * 5 primary actions: Home / Reports / Notifications / Profile / More-menu.
 */
const MobileBottomNav = ({ user, unreadCount = 0, onOpenSidebar }) => {
  const { t } = useTranslation();
  const location = useLocation();

  // Pick a home route per role
  const homeHref = (() => {
    if (!user) return '/login';
    const role = user.role;
    if (role === 'app_owner' || role === 'super_admin') return '/app/super-admin';
    if (role === 'company_admin') return '/app/dashboard';
    if (role === 'resident') return '/app/dashboard';
    return '/app/dashboard';
  })();

  const items = [
    { href: homeHref,        Icon: HomeIcon,             label: t('mn_home', 'الرئيسية'),     test: 'mnav-home' },
    { href: '/app/reports',  Icon: ChartBarIcon,         label: t('mn_reports', 'تقارير'),    test: 'mnav-reports' },
    {
      href: '/app/notifications',
      Icon: BellIcon,
      label: t('mn_notifications', 'الإشعارات'),
      badge: unreadCount,
      test: 'mnav-notifications',
    },
    { href: '/app/profile',  Icon: UserCircleIcon,       label: t('mn_profile', 'حسابي'),     test: 'mnav-profile' },
    {
      href: null,
      Icon: Bars3BottomLeftIcon,
      label: t('mn_more', 'المزيد'),
      onClick: onOpenSidebar,
      test: 'mnav-more',
    },
  ];

  const isActive = (href) =>
    href && (location.pathname === href || location.pathname.startsWith(href + '/'));

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_14px_rgba(0,0,0,0.08)] safe-area-bottom"
      data-testid="mobile-bottom-nav"
      aria-label={t('mn_navigation', 'التنقل السفلي')}
    >
      <ul className="grid grid-cols-5 h-16">
        {items.map(({ href, Icon, label, badge, onClick, test }, idx) => {
          const active = isActive(href);
          const baseCls =
            'relative flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-bold transition';
          const colorCls = active
            ? 'text-purple-600 dark:text-purple-400'
            : 'text-gray-600 dark:text-gray-400 hover:text-purple-500';

          const inner = (
            <>
              <div className="relative">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className="leading-tight">{label}</span>
              {active && (
                <span
                  className="absolute -top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-purple-600 dark:bg-purple-400"
                  aria-hidden="true"
                />
              )}
            </>
          );

          if (onClick) {
            return (
              <li key={idx}>
                <button
                  type="button"
                  onClick={onClick}
                  className={`${baseCls} ${colorCls} w-full`}
                  data-testid={test}
                  aria-label={label}
                >
                  {inner}
                </button>
              </li>
            );
          }
          return (
            <li key={idx}>
              <Link
                to={href || '#'}
                className={`${baseCls} ${colorCls}`}
                data-testid={test}
                aria-current={active ? 'page' : undefined}
              >
                {inner}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
