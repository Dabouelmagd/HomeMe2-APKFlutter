import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const fmt = (n) => {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('ar-EG', { maximumFractionDigits: 0 });
};

/**
 * AggregatedStatsPanel — إحصائيات شاملة لكل كمبوندات شركة الإدارة.
 * تعرض: إجماليات المستخدمين، الأقساط المستحقة، الالتزامات المفتوحة،
 *        الشكاوى المفتوحة، طلبات الصيانة، مع tooltip/drill-down لكل كمبوند.
 */
const AggregatedStatsPanel = ({ onSelectCompound, refreshKey = 0 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCompoundId, setExpandedCompoundId] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios.get(`${API}/company-admin/aggregated-stats`, getToken())
      .then(res => { if (alive) setData(res.data); })
      .catch(() => { if (alive) setData(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [refreshKey]);

  if (loading) return <div className="bg-gray-900/40 rounded-2xl p-8 text-center text-gray-400 text-sm">⏳ جارٍ تحميل الإحصائيات الشاملة...</div>;
  if (!data) return null;

  const t = data.totals || {};
  const per = data.per_compound || [];

  const cards = [
    { label: 'الكمبوندات', val: t.compounds_count, icon: '🏘️', color: 'from-blue-600/30 to-blue-800/10 border-blue-500/40', text: 'text-blue-200' },
    { label: 'إجمالي السكان', val: t.residents, icon: '👥', color: 'from-emerald-600/30 to-emerald-800/10 border-emerald-500/40', text: 'text-emerald-200' },
    { label: 'الإدارة', val: t.managers, icon: '👔', color: 'from-purple-600/30 to-purple-800/10 border-purple-500/40', text: 'text-purple-200' },
    { label: 'المحاسبون', val: t.accountants, icon: '🧾', color: 'from-cyan-600/30 to-cyan-800/10 border-cyan-500/40', text: 'text-cyan-200' },
    { label: 'الأمن', val: t.security, icon: '🛡', color: 'from-amber-600/30 to-amber-800/10 border-amber-500/40', text: 'text-amber-200' },
    { label: 'شكاوى مفتوحة', val: t.open_complaints, icon: '📮', color: 'from-rose-600/30 to-rose-800/10 border-rose-500/40', text: 'text-rose-200', urgent: (t.open_complaints || 0) > 0 },
    { label: 'طلبات صيانة معلّقة', val: t.pending_maintenance, icon: '🔧', color: 'from-orange-600/30 to-orange-800/10 border-orange-500/40', text: 'text-orange-200', urgent: (t.pending_maintenance || 0) > 0 },
    { label: 'أقساط مستحقة', val: t.unpaid_charges_count, extra: `${fmt(t.unpaid_charges_amount)} ج.م`, icon: '💰', color: 'from-red-600/30 to-red-800/10 border-red-500/40', text: 'text-red-200', urgent: (t.unpaid_charges_amount || 0) > 0 },
    { label: 'فروق صيانة مفتوحة', val: t.open_obligations_count, extra: `${fmt(t.open_obligations_amount)} ج.م`, icon: '📋', color: 'from-yellow-600/30 to-yellow-800/10 border-yellow-500/40', text: 'text-yellow-200', urgent: (t.open_obligations_amount || 0) > 0 },
  ];

  return (
    <div className="space-y-5" data-testid="aggregated-stats-panel">
      {/* Stat cards — aggregated */}
      <div>
        <h3 className="text-sm font-bold text-indigo-300 mb-3">📊 ملخص جميع كمبوندات شركتك</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {cards.map((c, i) => (
            <div
              key={i}
              className={`bg-gradient-to-br ${c.color} border rounded-xl p-3 text-center relative ${c.urgent ? 'ring-1 ring-red-500/50 animate-pulse' : ''}`}
              data-testid={`agg-stat-${i}`}
            >
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className={`text-2xl font-bold ${c.text}`}>{fmt(c.val)}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{c.label}</div>
              {c.extra && <div className={`text-[11px] ${c.text} font-semibold mt-1`}>{c.extra}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Per-compound breakdown */}
      {per.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-gray-200 mb-3">🏘️ تفصيل لكل كمبوند</h3>
          <div className="space-y-2">
            {per.map(c => {
              const expanded = expandedCompoundId === c.id;
              const hasIssues = (c.open_complaints || 0) + (c.pending_maintenance || 0) + (c.unpaid_charges_count || 0) + (c.open_obligations_count || 0);
              return (
                <div key={c.id} className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden" data-testid={`agg-cpd-${c.id}`}>
                  <div
                    className="p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-800/90 transition"
                    onClick={() => setExpandedCompoundId(expanded ? null : c.id)}
                  >
                    <span className="text-2xl">🏘️</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate">{c.name}</div>
                      <div className="text-[11px] text-gray-400 truncate">
                        {c.location || '—'} • 👥 {fmt(c.users)} • 🏠 {fmt(c.residents)} سكان
                        {hasIssues > 0 && <span className="ms-2 text-red-400 font-semibold">• ⚠️ {fmt(hasIssues)} تنبيه</span>}
                      </div>
                    </div>
                    {onSelectCompound && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectCompound(c); }}
                        className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold flex-shrink-0"
                        data-testid={`agg-cpd-open-${c.id}`}
                      >
                        🚀 فتح
                      </button>
                    )}
                    <span className="text-gray-500 text-lg">{expanded ? '▾' : '▸'}</span>
                  </div>
                  {expanded && (
                    <div className="border-t border-gray-700 bg-gray-900/50 p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                      <MiniTile label="سكان" val={c.residents} color="emerald" />
                      <MiniTile label="إدارة" val={c.managers} color="purple" />
                      <MiniTile label="محاسبون" val={c.accountants} color="cyan" />
                      <MiniTile label="أمن" val={c.security} color="amber" />
                      <MiniTile label="شكاوى مفتوحة" val={c.open_complaints} color="rose" urgent />
                      <MiniTile label="صيانة معلّقة" val={c.pending_maintenance} color="orange" urgent />
                      <MiniTile label={`أقساط مستحقة (${fmt(c.unpaid_charges_count)})`} val={fmt(c.unpaid_charges_amount) + ' ج.م'} color="red" urgent />
                      <MiniTile label={`فروق صيانة (${fmt(c.open_obligations_count)})`} val={fmt(c.open_obligations_amount) + ' ج.م'} color="yellow" urgent />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const MiniTile = ({ label, val, color, urgent }) => (
  <div className={`bg-${color}-900/30 border border-${color}-700/40 rounded-lg p-2 ${urgent && val && val !== '0 ج.م' && val !== 0 ? 'ring-1 ring-red-500/40' : ''}`}>
    <div className={`text-sm font-bold text-${color}-200`}>{typeof val === 'number' ? fmt(val) : val}</div>
    <div className="text-[10px] text-gray-400">{label}</div>
  </div>
);

export default AggregatedStatsPanel;
