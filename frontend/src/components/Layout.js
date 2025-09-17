import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, useNotifications } from '../App';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftEllipsisIcon,
  BellIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  WrenchScrewdriverIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import LanguageSwitcher from './LanguageSwitcher';

const Layout = () => {
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    {
      name: t('dashboard'),
      href: '/dashboard',
      icon: HomeIcon,
      show: true
    },
    {
      name: t('compound_management'),
      href: '/compound',
      icon: BuildingOfficeIcon,
      show: user?.role === 'admin'
    },
    {
      name: t('services_management'),
      href: '/services',
      icon: WrenchScrewdriverIcon,
      show: true
    },
    {
      name: t('government_utility_gateway'),
      href: '/utilities',
      icon: BoltIcon,
      show: true
    },
    {
      name: t('family_management'),
      href: '/family',
      icon: UsersIcon,
      show: user?.role === 'resident'
    },
    {
      name: t('financial_management'),
      href: '/finances',
      icon: CurrencyDollarIcon,
      show: true
    },
    {
      name: t('message_center'),
      href: '/messages',
      icon: ChatBubbleLeftEllipsisIcon,
      show: true
    },
    {
      name: t('notifications'),
      href: '/notifications',
      icon: BellIcon,
      show: true
    }
  ];

  const isActive = (href) => location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <div className={`flex h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}
      `}>
        <div className="flex items-center justify-between h-20 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img 
                src="https://customer-assets.emergentagent.com/job_c6284a52-3971-4d5d-97ad-6dbfb32cfec5/artifacts/lwjnxovk_WhatsApp%20Image%202022-01-17%20at%2010.23.44%20AM.637bf42d664818.47361218.jpeg"
                alt="HomeMe Logo"
                className="h-24 w-auto"
              />
            </div>
          </div>
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.filter(item => item.show).map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                  ${isActive(item.href)
                    ? `bg-blue-50 text-blue-700 ${isRTL ? 'border-l-2 border-blue-700' : 'border-r-2 border-blue-700'}`
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className={`${isRTL ? 'ml-3' : 'mr-3'} h-5 w-5 ${
                    isActive(item.href) ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-700'
                  }`}
                />
                {item.name}
                {item.name === t('notifications') && unreadCount > 0 && (
                  <span className={`${isRTL ? 'mr-auto' : 'ml-auto'} bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="px-3 py-2">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                </div>
                <div className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
                  <p className="text-sm font-medium text-gray-700">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {t(user?.role)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-2 space-y-1">
              <LanguageSwitcher className="w-full justify-start" />
              
              <button
                onClick={handleLogout}
                className={`group flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900`}
              >
                <ArrowRightOnRectangleIcon className={`${isRTL ? 'ml-3' : 'mr-3'} h-5 w-5 text-gray-500 group-hover:text-gray-700`} />
                {t('sign_out')}
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-0">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6 text-gray-500" />
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {navigation.find(item => isActive(item.href))?.name || 'HomeMe'}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                to="/notifications"
                className="p-2 text-gray-500 hover:text-gray-700 relative"
              >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;