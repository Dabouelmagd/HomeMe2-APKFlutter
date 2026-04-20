import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * AlertsDashboard — /app/alerts
 * Central feed of urgent items from all sources with quick actions.
 */
const AlertsDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ severity: 'all', type: 'all' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios.get(`${API}/alerts/dashboard`, getToken())
      .then(res => { if (alive) setData(res.data); })
      .catch(err => { if (alive) toast.error(err.response?.data?.detail || 'فشل التحميل'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [refreshKey]);

  const alerts = data?.alerts || [];
  const summary = data?.summary || { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
  const byType = data?.by_type || {};

  const filtered = useMemo(() => alerts.filter(a => {
    if (filter.severity !== 'all' && a.severity !== filter.severity) return false;
    if (filter.type !== 'all' && a.type !== filter.type) return false;
    return true;
  }), [alerts, filter]);

  const typeLabels = {
    contract_expiring: '📋 عقود',
    empty_company: '🏢 شركات فارغة',
    pending_ad: '📢 إعلانات تنتظر',
    sub_expiring: '🔑 اشتراكات',
    invite_alert: '🔗 روابط دعوة',
  };

  const severityStyles = {
    critical: { bg: 'from-red-600/30 to-red-900/10', border: 'border-red-500/40', icon: '🔴', text: 'text-red-300' },
    high: { bg: 'from-orange-600/25 to-orange-900/10', border: 'border-orange-500/40', icon: '🟠', text: 'text-orange-300' },
    medium: { bg: 'from-amber-600/20 to-amber-900/10', border: 'border-amber-500/40', icon: '🟡', text: 'text-amber-300' },
    low: { bg: 'from-sky-600/15 to-sky-900/10', border: 'border-sky-500/40', icon: '🔵', text: 'text-sky-300' },
  };

  const severityLabels = {
    critical: 'حرج', high: 'مرتفع', medium: 'متوسط', low: 'منخفض',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-indigo-950 p-6" dir="rtl" data-testid="alerts-dashboard">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">🔔 لوحة التنبيهات المركزية</h1>
            <p className="text-sm text-gray-400 mt-1">كل الأمور العاجلة في مكان واحد — اتخذ الإجراء المناسب مباشرة</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRefreshKey(k => k + 1)} className="px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold" data-testid="alerts-refresh">↻ تحديث</button>
            <button onClick={() => navigate(-1)} className="px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg">← رجوع</button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard onClick={() => setFilter({...filter, severity: 'all'})} active={filter.severity === 'all'} icon="📊" label="الإجمالي" value={summary.total} color="indigo" testid="alerts-sev-all" />
          <SummaryCard onClick={() => setFilter({...filter, severity: 'critical'})} active={filter.severity === 'critical'} icon="🔴" label="حرج" value={summary.critical} color="red" testid="alerts-sev-critical" />
          <SummaryCard onClick={() => setFilter({...filter, severity: 'high'})} active={filter.severity === 'high'} icon="🟠" label="مرتفع" value={summary.high} color="orange" testid="alerts-sev-high" />
          <SummaryCard onClick={() => setFilter({...filter, severity: 'medium'})} active={filter.severity === 'medium'} icon="🟡" label="متوسط" value={summary.medium} color="amber" testid="alerts-sev-medium" />
          <SummaryCard onClick={() => setFilter({...filter, severity: 'low'})} active={filter.severity === 'low'} icon="🔵" label="منخفض" value={summary.low} color="sky" testid="alerts-sev-low" />
        </div>

        {/* Type pills */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter({...filter, type: 'all'})}
            className={`px-3 py-1.5 text-xs rounded-full border font-semibold ${filter.type === 'all' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
            data-testid="alerts-type-all">
            كل الأنواع ({summary.total})
          </button>
          {Object.entries(byType).map(([type, count]) => (
            <button key={type} onClick={() => setFilter({...filter, type})}
              className={`px-3 py-1.5 text-xs rounded-full border font-semibold ${filter.type === type ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
              data-testid={`alerts-type-${type}`}>
              {typeLabels[type] || type} ({count})
            </button>
          ))}
        </div>

        {/* Alerts list */}
        {loading ? <div className="text-center text-gray-400 py-16">جاري التحميل...</div>
          : filtered.length === 0 ? (
            <div className="text-center py-16 bg-gray-800/40 rounded-2xl border-2 border-dashed border-gray-700" data-testid="alerts-empty">
              <div className="text-6xl mb-3">✨</div>
              <h3 className="text-lg text-white mb-2">{alerts.length === 0 ? 'لا توجد تنبيهات — كل شيء تحت السيطرة!' : 'لا تنبيهات مطابقة للفلترة'}</h3>
              <p className="text-sm text-gray-400">{alerts.length === 0 ? 'عمل رائع 👏' : 'جرّب إزالة الفلاتر لعرض المزيد'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(alert => {
                const style = severityStyles[alert.severity] || severityStyles.low;
                return (
                  <div key={alert.id} className={`bg-gradient-to-br ${style.bg} border ${style.border} rounded-xl p-4 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between`} data-testid={`alert-row-${alert.id}`}>
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="text-3xl">{style.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white">{alert.title}</h4>
                          <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${style.border} ${style.text}`}>
                            {severityLabels[alert.severity]}
                          </span>
                          <span className="text-[9px] text-gray-500">{typeLabels[alert.type] || alert.type}</span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1">{alert.description}</p>
                      </div>
                    </div>
                    {alert.action?.href && (
                      <button
                        onClick={() => navigate(alert.action.href)}
                        className={`whitespace-nowrap px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg border ${style.border}`}
                        data-testid={`alert-action-${alert.id}`}>
                        {alert.action.label} ←
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        {data?.generated_at && (
          <div className="text-center text-[10px] text-gray-500 pt-4">
            آخر تحديث: {new Date(data.generated_at).toLocaleString('ar-EG')}
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({ icon, label, value, color, onClick, active, testid }) => (
  <button
    onClick={onClick}
    className={`bg-gradient-to-br from-${color}-600/25 to-${color}-800/10 border rounded-xl p-4 text-center transition ${active ? `border-${color}-400 ring-2 ring-${color}-400/50` : `border-${color}-600/40 hover:border-${color}-500`}`}
    data-testid={testid}>
    <div className="text-2xl mb-1">{icon}</div>
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-xs text-gray-400">{label}</div>
  </button>
);

export default AlertsDashboard;
