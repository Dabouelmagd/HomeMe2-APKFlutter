import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const TAG_STYLE = {
  vip: { bg: 'from-amber-500/20 to-yellow-500/10', border: 'border-amber-500/40', icon: '⭐', text: 'text-amber-600', label: 'سكان VIP' },
  late_payer: { bg: 'from-red-500/20 to-rose-500/10', border: 'border-red-500/40', icon: '⚠️', text: 'text-red-600', label: 'متأخرون عن الدفع' },
  complainer: { bg: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/40', icon: '📣', text: 'text-purple-600', label: 'شكاوى متكررة' },
};

/**
 * CrmRetentionPanel — يعرض ملخص CRM عبر كل كمبوندات الشركة.
 * كرتان سريعتان (VIP + late_payers) + شريط كل التاغات.
 */
const CrmRetentionPanel = ({ refreshKey = 0, onUserClick }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drilldown, setDrilldown] = useState(null); // 'vip' | 'late_payer' | null

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios.get(`${API}/company-admin/crm-summary`, getToken())
      .then((res) => { if (alive) setData(res.data); })
      .catch((err) => {
        if (!alive) return;
        setData(null);
        // Suppress noisy first-load 401s / network blips (AppVersionGuard reload etc.)
        const st = err?.response?.status;
        if (st && st >= 500) {
          toast.error('فشل تحميل ملخص CRM');
        }
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5" dir="rtl" data-testid="crm-panel-loading">
        <div className="h-20 animate-pulse bg-gray-100 rounded-xl"></div>
      </div>
    );
  }
  if (!data) return null;

  const tagCounts = data.tag_counts || {};
  const vipCount = tagCounts.vip || 0;
  const lateCount = tagCounts.late_payer || 0;
  const otherTags = Object.entries(tagCounts)
    .filter(([k]) => k !== 'vip' && k !== 'late_payer')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const renderUsers = (list) => (
    <div className="space-y-2 max-h-[240px] overflow-y-auto">
      {list.length === 0 && (
        <div className="text-xs text-gray-400 italic p-2">لا يوجد سكان بهذا التصنيف</div>
      )}
      {list.map((u) => (
        <button
          key={u.id}
          onClick={() => onUserClick?.(u)}
          data-testid={`crm-user-${u.id}`}
          className="w-full text-right bg-gray-50 hover:bg-indigo-50 border border-gray-200 rounded-lg p-2.5 transition flex items-center justify-between gap-2"
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-gray-900 truncate">{u.full_name || u.username}</div>
            <div className="text-[11px] text-gray-500 truncate">
              {u.compound_name} {u.unit_number ? `• وحدة ${u.unit_number}` : ''}
            </div>
          </div>
          <div className="text-[10px] text-gray-400">{u.phone || u.email || ''}</div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4" dir="rtl" data-testid="crm-retention-panel">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">🧠 CRM & الاحتفاظ بالعملاء</h2>
          <p className="text-xs text-gray-500">ملخص تاغات وملاحظات السكان عبر كل المجمعات</p>
        </div>
        <div className="text-xs text-gray-500">
          📝 ملاحظات إدارية: <strong className="text-indigo-700">{data.notes_total || 0}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* VIP card */}
        <button
          onClick={() => setDrilldown(drilldown === 'vip' ? null : 'vip')}
          data-testid="crm-vip-card"
          className={`text-right bg-gradient-to-br ${TAG_STYLE.vip.bg} border ${TAG_STYLE.vip.border} rounded-2xl p-5 transition hover:scale-[1.01] hover:shadow-lg ${drilldown === 'vip' ? 'ring-2 ring-amber-400' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-xs font-bold ${TAG_STYLE.vip.text}`}>⭐ سكان VIP</div>
              <div className="text-4xl font-extrabold text-gray-900 mt-1">{vipCount}</div>
              <div className="text-[11px] text-gray-600 mt-1">
                {vipCount === 0 ? 'لا يوجد VIP بعد' : 'اضغط لعرض القائمة'}
              </div>
            </div>
            <div className="text-5xl opacity-60">⭐</div>
          </div>
        </button>

        {/* Late payers card */}
        <button
          onClick={() => setDrilldown(drilldown === 'late_payer' ? null : 'late_payer')}
          data-testid="crm-late-card"
          className={`text-right bg-gradient-to-br ${TAG_STYLE.late_payer.bg} border ${TAG_STYLE.late_payer.border} rounded-2xl p-5 transition hover:scale-[1.01] hover:shadow-lg ${drilldown === 'late_payer' ? 'ring-2 ring-red-400' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-xs font-bold ${TAG_STYLE.late_payer.text}`}>⚠️ متأخرون عن الدفع</div>
              <div className="text-4xl font-extrabold text-gray-900 mt-1">{lateCount}</div>
              <div className="text-[11px] text-gray-600 mt-1">
                {lateCount === 0 ? 'لا يوجد متأخرون' : 'اضغط لعرض القائمة'}
              </div>
            </div>
            <div className="text-5xl opacity-60">⚠️</div>
          </div>
        </button>
      </div>

      {/* Drilldown list */}
      {drilldown && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm" data-testid={`crm-drilldown-${drilldown}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">
              {TAG_STYLE[drilldown].icon} {TAG_STYLE[drilldown].label}
            </h3>
            <button onClick={() => setDrilldown(null)} className="text-gray-400 hover:text-gray-600 text-sm" data-testid="crm-drilldown-close">✕</button>
          </div>
          {renderUsers(drilldown === 'vip' ? (data.vip_users || []) : (data.late_payers || []))}
        </div>
      )}

      {/* Other tags */}
      {otherTags.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-3 flex flex-wrap items-center gap-2" data-testid="crm-other-tags">
          <span className="text-xs text-gray-500 font-bold">🏷️ تاغات أخرى:</span>
          {otherTags.map(([tag, count]) => (
            <span
              key={tag}
              className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold"
            >
              {tag} <span className="opacity-70">({count})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CrmRetentionPanel;
