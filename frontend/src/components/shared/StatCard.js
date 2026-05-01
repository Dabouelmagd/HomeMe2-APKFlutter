import React from 'react';

/**
 * StatCard — Unified KPI/metric card for all dashboards.
 *
 * Color presets: indigo, rose, emerald, amber, blue, purple, pink, slate, red.
 * Variants:
 *   - dark (default)  → on gradient/dark backgrounds
 *   - light           → on white/light surfaces
 *
 * Usage:
 *   <StatCard icon="👥" label="سكان" value={230} color="indigo" hint="+12 هذا الشهر" />
 *   <StatCard icon="💰" label="إيرادات" value="42,500 ج.م" color="emerald" variant="light" />
 */
const COLORS = {
  indigo:  { bg: 'from-indigo-600/25 to-indigo-800/10',  border: 'border-indigo-500/30',  text: 'text-indigo-300',   lightBg: 'from-indigo-50 to-indigo-100/30',   lightText: 'text-indigo-700',   lightBorder: 'border-indigo-200' },
  rose:    { bg: 'from-rose-600/25 to-rose-800/10',      border: 'border-rose-500/30',    text: 'text-rose-300',     lightBg: 'from-rose-50 to-rose-100/30',       lightText: 'text-rose-700',     lightBorder: 'border-rose-200' },
  emerald: { bg: 'from-emerald-600/25 to-emerald-800/10', border: 'border-emerald-500/30', text: 'text-emerald-300',  lightBg: 'from-emerald-50 to-emerald-100/30', lightText: 'text-emerald-700', lightBorder: 'border-emerald-200' },
  amber:   { bg: 'from-amber-600/25 to-amber-800/10',    border: 'border-amber-500/30',   text: 'text-amber-300',    lightBg: 'from-amber-50 to-amber-100/30',     lightText: 'text-amber-700',    lightBorder: 'border-amber-200' },
  blue:    { bg: 'from-blue-600/25 to-blue-800/10',      border: 'border-blue-500/30',    text: 'text-blue-300',     lightBg: 'from-blue-50 to-blue-100/30',       lightText: 'text-blue-700',     lightBorder: 'border-blue-200' },
  purple:  { bg: 'from-purple-600/25 to-purple-800/10',  border: 'border-purple-500/30',  text: 'text-purple-300',   lightBg: 'from-purple-50 to-purple-100/30',   lightText: 'text-purple-700',   lightBorder: 'border-purple-200' },
  pink:    { bg: 'from-pink-600/25 to-pink-800/10',      border: 'border-pink-500/30',    text: 'text-pink-300',     lightBg: 'from-pink-50 to-pink-100/30',       lightText: 'text-pink-700',     lightBorder: 'border-pink-200' },
  slate:   { bg: 'from-slate-600/25 to-slate-800/10',    border: 'border-slate-500/30',   text: 'text-slate-300',    lightBg: 'from-slate-50 to-slate-100/30',     lightText: 'text-slate-700',    lightBorder: 'border-slate-200' },
  red:     { bg: 'from-red-600/25 to-red-800/10',        border: 'border-red-500/30',     text: 'text-red-300',      lightBg: 'from-red-50 to-red-100/30',         lightText: 'text-red-700',      lightBorder: 'border-red-200' },
};

const StatCard = ({
  icon, label, value, hint, color = 'indigo', variant = 'dark', onClick, className = '', testId,
}) => {
  const c = COLORS[color] || COLORS.indigo;
  const isLight = variant === 'light';
  const base = isLight
    ? `bg-gradient-to-br ${c.lightBg} ${c.lightBorder} border rounded-2xl p-4`
    : `bg-gradient-to-br ${c.bg} ${c.border} border rounded-2xl p-4`;
  const labelCls = isLight ? c.lightText : c.text;
  const valueCls = isLight ? 'text-gray-900' : 'text-white';
  const hintCls = isLight ? 'text-gray-500' : 'text-gray-400';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`${base} ${onClick ? 'text-right hover:scale-[1.01] hover:shadow-lg transition cursor-pointer' : ''} ${className}`}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] font-bold tracking-wider ${labelCls}`}>{label}</div>
          <div className={`text-2xl md:text-3xl font-extrabold mt-1 ${valueCls}`}>{value}</div>
          {hint && <div className={`text-[10px] ${hintCls} mt-1`}>{hint}</div>}
        </div>
        {icon && (
          <div className="text-3xl opacity-80 leading-none select-none">
            {typeof icon === 'string' ? icon : icon}
          </div>
        )}
      </div>
    </Tag>
  );
};

export default StatCard;
