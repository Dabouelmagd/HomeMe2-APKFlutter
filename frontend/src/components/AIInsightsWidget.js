import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  SparklesIcon,
  ArrowPathIcon,
  ArrowRightCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import AIActionModal from './AIActionModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SEVERITY_STYLES = {
  high: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600',
    badge: 'bg-rose-500 text-white',
    badgeLabel: 'عاجل',
    pulse: true,
  },
  medium: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-700',
    badge: 'bg-amber-500 text-white',
    badgeLabel: 'متوسط',
    pulse: false,
  },
  low: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-700',
    badge: 'bg-emerald-500 text-white',
    badgeLabel: 'منخفض',
    pulse: false,
  },
};

// Insights that support automated AI actions (must match backend ACTION_CATALOG keys)
const ACTIONABLE_INSIGHTS = new Set(['late_invoices', 'old_maintenance', 'negative_ratings']);

const AIInsightsWidget = () => {
  const navigate = useNavigate();
  const [insights, setInsights] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activeAction, setActiveAction] = useState(null); // { insightId, compoundId }
  const [compoundIdState, setCompoundIdState] = useState(null);

  const fetchInsights = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const res = await axios.get(`${API}/ai-insights/me${refresh ? '?refresh=true' : ''}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setInsights(res.data?.insights || []);
      setGeneratedAt(res.data?.generated_at);
      setCached(res.data?.cached);
      setCompoundIdState(res.data?.compound_id);
    } catch { /* silent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6 animate-pulse"
        data-testid="ai-insights-loading"
      >
        <div className="h-5 bg-gray-100 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          <div className="h-16 bg-gray-50 rounded-xl" />
          <div className="h-16 bg-gray-50 rounded-xl" />
        </div>
      </div>
    );
  }

  if (insights.length === 0) return null;

  const highCount = insights.filter((i) => i.severity === 'high').length;

  return (
    <div
      className="bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 rounded-2xl shadow-sm border border-violet-200 p-5 mb-6"
      data-testid="ai-insights-widget"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-right hover:opacity-80 transition-opacity"
          data-testid="ai-insights-toggle"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-sm">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              مستشار HomeMe الذكي
              {highCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 animate-pulse">
                  {highCount} عاجل
                </span>
              )}
            </h3>
            <p className="text-[11px] text-gray-500">
              {insights.length} تنبيه نشط · {cached ? 'مخزن مؤقتاً' : 'محدث الآن'}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fetchInsights(true)}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-violet-100 text-violet-600 transition-colors"
            title="تحديث"
            data-testid="ai-insights-refresh"
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-violet-100 text-violet-600 transition-colors"
            data-testid="ai-insights-collapse"
          >
            {collapsed ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronUpIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Insights List */}
      {!collapsed && (
        <div className="space-y-2.5">
          {insights.map((insight) => {
            const style = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.low;
            return (              <div
                key={insight.id}
                className={`relative ${style.bg} ${style.border} border rounded-xl p-3.5 transition-all hover:shadow-sm`}
                data-testid={`ai-insight-${insight.id}`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${style.iconBg} ${style.iconText} flex items-center justify-center text-xl ${style.pulse ? 'animate-pulse' : ''}`}>
                    {insight.icon}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-gray-900">{insight.title}</h4>
                      <span className={`${style.badge} text-[9px] font-bold px-1.5 py-0.5 rounded`}>
                        {style.badgeLabel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed mb-2">
                      {insight.description}
                    </p>
                    {insight.action_route && insight.action_label && (
                      <button
                        onClick={() => navigate(insight.action_route)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-900 hover:bg-white px-2 py-1 rounded-md transition-colors"
                        data-testid={`ai-insight-action-${insight.id}`}
                      >
                        <ArrowRightCircleIcon className="w-4 h-4" />
                        {insight.action_label}
                      </button>
                    )}
                    {ACTIONABLE_INSIGHTS.has(insight.id) && compoundIdState && (
                      <button
                        onClick={() => setActiveAction({ insightId: insight.id, compoundId: compoundIdState })}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 px-3 py-1 rounded-md transition-colors mr-2 shadow-sm"
                        data-testid={`ai-insight-execute-${insight.id}`}
                      >
                        <BoltIcon className="w-3.5 h-3.5" />
                        تنفيذ بالـ AI
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Action Modal */}
      {activeAction && (
        <AIActionModal
          insightId={activeAction.insightId}
          compoundId={activeAction.compoundId}
          onClose={() => setActiveAction(null)}
          onComplete={() => {
            // Refresh insights after successful action (cache was invalidated server-side)
            fetchInsights(true);
          }}
        />
      )}
    </div>
  );
};

export default AIInsightsWidget;
