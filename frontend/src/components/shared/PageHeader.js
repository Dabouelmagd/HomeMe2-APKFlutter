import React from 'react';

/**
 * PageHeader — Unified page header for all HomeMe dashboards.
 *
 * Theme presets:
 *   indigo (default) — company_admin / admin
 *   rose             — app_owner / owner-only
 *   emerald          — compound admin
 *   blue             — resident
 *   amber            — security / alerts
 *   slate            — super_admin / system
 *
 * Usage:
 *   <PageHeader theme="indigo" iconEmoji="🏢" badge="Co./Admin" title="شركة الإدارة"
 *               subtitle="إحصائيات شاملة" actions={<button>+ جديد</button>} />
 */
const THEMES = {
  indigo:  { bg: 'from-gray-900 via-indigo-950 to-gray-900',  dotA: 'rgba(99,102,241,0.4)',  dotB: 'rgba(168,85,247,0.3)',  badge: 'text-indigo-300',  iconBg: 'from-indigo-500 to-purple-600' },
  rose:    { bg: 'from-gray-900 via-rose-950 to-gray-900',    dotA: 'rgba(244,63,94,0.4)',    dotB: 'rgba(168,85,247,0.3)',  badge: 'text-rose-300',    iconBg: 'from-rose-500 to-pink-600' },
  emerald: { bg: 'from-gray-900 via-emerald-950 to-gray-900', dotA: 'rgba(16,185,129,0.4)',  dotB: 'rgba(59,130,246,0.3)',  badge: 'text-emerald-300', iconBg: 'from-emerald-500 to-teal-600' },
  blue:    { bg: 'from-gray-900 via-blue-950 to-gray-900',    dotA: 'rgba(59,130,246,0.4)',  dotB: 'rgba(139,92,246,0.3)',  badge: 'text-blue-300',    iconBg: 'from-blue-500 to-cyan-600' },
  amber:   { bg: 'from-gray-900 via-amber-950 to-gray-900',   dotA: 'rgba(245,158,11,0.4)',  dotB: 'rgba(239,68,68,0.3)',   badge: 'text-amber-300',   iconBg: 'from-amber-500 to-orange-600' },
  slate:   { bg: 'from-gray-900 via-slate-800 to-gray-900',   dotA: 'rgba(148,163,184,0.35)', dotB: 'rgba(71,85,105,0.3)',  badge: 'text-slate-300',   iconBg: 'from-slate-500 to-gray-600' },
};

const PageHeader = ({
  theme = 'indigo',
  icon: Icon,
  iconEmoji,
  logoUrl,
  badge,
  title,
  subtitle,
  actions,
  meta,
  className = '',
  testId = 'page-header',
}) => {
  const t = THEMES[theme] || THEMES.indigo;
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-r ${t.bg} text-white shadow-xl rounded-2xl border border-white/5 ${className}`}
      data-testid={testId}
    >
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, ${t.dotA}, transparent 50%), radial-gradient(circle at 80% 50%, ${t.dotB}, transparent 50%)`,
        }}
      />
      <div className="relative px-6 py-5 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {logoUrl ? (
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-lg flex-shrink-0 ring-2 ring-white/20" data-testid={`${testId}-logo`}>
              <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
            </div>
          ) : (Icon || iconEmoji) && (
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.iconBg} flex items-center justify-center shadow-lg flex-shrink-0`}>
              {Icon ? <Icon className="w-8 h-8 text-white" /> : <span className="text-3xl">{iconEmoji}</span>}
            </div>
          )}
          <div className="min-w-0">
            {badge && (
              <p className={`${t.badge} text-[10px] font-bold tracking-wider uppercase mb-0.5`} aria-label="role">{badge}</p>
            )}
            <h1 className="text-2xl md:text-3xl font-extrabold text-white truncate">{title}</h1>
            {subtitle && <p className="text-xs text-gray-300 mt-1">{subtitle}</p>}
            {meta && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400 mt-2" role="list">
                {React.Children.map(meta.props?.children || meta, (child, i) =>
                  child ? <span role="listitem" key={i}>{child}</span> : null
                )}
              </div>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
