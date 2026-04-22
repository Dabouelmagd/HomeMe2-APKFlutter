import React from 'react';

/**
 * OwnerPageHeader — Reusable page header matching the owner's rose theme.
 * Use at the top of any page to unify visual identity.
 */
const OwnerPageHeader = ({ icon: Icon, iconEmoji, badge, title, subtitle, actions, className = '' }) => {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-r from-gray-900 via-rose-950 to-gray-900 text-white shadow-xl ${className}`} data-testid="owner-page-header">
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, rgba(244,63,94,0.4), transparent 50%), radial-gradient(circle at 80% 50%, rgba(168,85,247,0.3), transparent 50%)',
        }}
      />
      <div className="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {(Icon || iconEmoji) && (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg flex-shrink-0">
              {Icon ? <Icon className="w-8 h-8 text-white" /> : <span className="text-3xl">{iconEmoji}</span>}
            </div>
          )}
          <div>
            {badge && (
              <p className="text-rose-300 text-xs font-medium tracking-wider mb-1">{badge}</p>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
            {subtitle && <p className="text-sm text-gray-300 mt-1">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};

export default OwnerPageHeader;
