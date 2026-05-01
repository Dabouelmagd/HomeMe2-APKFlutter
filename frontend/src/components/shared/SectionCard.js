import React from 'react';

/**
 * SectionCard — Unified rounded container for content sections.
 *
 * Usage:
 *   <SectionCard title="مجمعاتي" icon="🏘️" actions={<button>+ جديد</button>} variant="dark">
 *     ...content...
 *   </SectionCard>
 */
const SectionCard = ({
  title, icon, subtitle, actions, children, variant = 'dark', padded = true, className = '', testId,
}) => {
  const base = variant === 'light'
    ? 'bg-white border border-gray-200 rounded-2xl shadow-sm'
    : 'bg-gray-800/60 backdrop-blur border border-gray-700/50 rounded-2xl shadow-lg';
  const titleCls = variant === 'light' ? 'text-gray-900' : 'text-white';
  const subCls = variant === 'light' ? 'text-gray-500' : 'text-gray-400';
  const divider = variant === 'light' ? 'border-gray-200' : 'border-gray-700/60';
  return (
    <section className={`${base} ${className}`} data-testid={testId}>
      {(title || actions) && (
        <div className={`flex items-center justify-between gap-2 flex-wrap px-5 py-4 border-b ${divider}`}>
          <div className="flex items-center gap-2 min-w-0">
            {icon && <span className="text-2xl">{icon}</span>}
            <div className="min-w-0">
              {title && <h3 className={`text-base font-extrabold ${titleCls} truncate`}>{title}</h3>}
              {subtitle && <p className={`text-[11px] ${subCls} truncate`}>{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
};

export default SectionCard;
