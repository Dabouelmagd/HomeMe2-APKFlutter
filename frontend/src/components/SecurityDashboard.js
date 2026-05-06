import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import useTabState from '../hooks/useTabState';
import PageHeader from './shared/PageHeader';
import {
  ShieldCheckIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  IdentificationIcon,
  ExclamationTriangleIcon,
  BellIcon,
  ArrowPathIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  FireIcon,
  ArrowDownTrayIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const SecurityDashboard = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const isAdmin = ['admin', 'super_admin', 'company_admin', 'app_owner', 'manager'].includes(user?.role);

  const [activeTab, setActiveTab] = useTabState('visitors');
  const [securityLogs, setSecurityLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ todayVisitors: 0, checkedIn: 0, checkedOut: 0, unreadMessages: 0 });
  const [analytics, setAnalytics] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [incidentStats, setIncidentStats] = useState({ open: 0, critical: 0, total: 0 });
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [newIncident, setNewIncident] = useState({ title: '', description: '', severity: 'low', location: '' });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
    if (activeTab === 'incidents') fetchIncidents();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, messagesRes] = await Promise.all([
        axios.get(`${API}/security/visitor-logs`, getHeaders()).catch(() => ({ data: { logs: [] } })),
        axios.get(`${API}/security/messages`, getHeaders()).catch(() => ({ data: { messages: [] } })),
      ]);

      const logs = logsRes.data.logs || [];
      const msgs = messagesRes.data.messages || [];
      setSecurityLogs(logs);
      setMessages(msgs);

      const today = new Date().toDateString();
      const todayLogs = logs.filter(l => new Date(l.timestamp || l.created_at).toDateString() === today);
      setStats({
        todayVisitors: todayLogs.length,
        checkedIn: logs.filter(l => l.action === 'check_in').length,
        checkedOut: logs.filter(l => l.action === 'check_out').length,
        unreadMessages: msgs.filter(m => !m.read).length,
      });
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const markRead = async (id) => {
    try {
      await axios.patch(`${API}/security/messages/${id}/read`, {}, getHeaders());
      fetchData();
    } catch { /* silent */ }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API}/security/analytics?days=7`, getHeaders());
      setAnalytics(res.data);
    } catch { /* silent */ }
  };

  const fetchIncidents = async () => {
    try {
      const res = await axios.get(`${API}/security/incidents`, getHeaders());
      setIncidents(res.data.incidents || []);
      setIncidentStats({
        open: res.data.open_count || 0,
        critical: res.data.critical_open || 0,
        total: res.data.total || 0,
      });
    } catch { /* silent */ }
  };

  const createIncident = async () => {
    if (!newIncident.title.trim() || !newIncident.description.trim()) {
      toast.error(t('sec_inc_missing', 'العنوان والوصف مطلوبان'));
      return;
    }
    try {
      await axios.post(`${API}/security/incidents`, newIncident, getHeaders());
      toast.success(t('sec_inc_created', 'تم إنشاء البلاغ'));
      setNewIncident({ title: '', description: '', severity: 'low', location: '' });
      setShowIncidentForm(false);
      fetchIncidents();
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('sec_failed', 'فشل'));
    }
  };

  const updateIncidentStatus = async (id, status) => {
    try {
      await axios.patch(`${API}/security/incidents/${id}?status=${status}`, {}, getHeaders());
      toast.success(t('sec_inc_updated', 'تم التحديث'));
      fetchIncidents();
    } catch { toast.error(t('sec_failed', 'فشل')); }
  };

  const deleteIncident = async (id) => {
    if (!window.confirm(t('sec_inc_confirm_delete', 'حذف هذا البلاغ؟'))) return;
    try {
      await axios.delete(`${API}/security/incidents/${id}`, getHeaders());
      toast.success(t('sec_inc_deleted', 'تم الحذف'));
      fetchIncidents();
    } catch { toast.error(t('sec_failed', 'فشل')); }
  };

  const exportLogsCSV = () => {
    if (!securityLogs.length) {
      toast.error(t('sec_no_data', 'لا توجد بيانات'));
      return;
    }
    const headers = ['Visitor', 'Action', 'Checked By', 'ID Verified', 'Photo', 'Notes', 'Timestamp'];
    const rows = securityLogs.map(l => [
      l.visitor_name || '',
      l.action || '',
      l.checked_by || '',
      l.id_verified ? 'Yes' : 'No',
      l.photo_taken ? 'Yes' : 'No',
      (l.security_notes || '').replace(/,/g, ' '),
      l.timestamp || l.created_at || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitor_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('sec_exported', 'تم التصدير'));
  };

  const severityColors = {
    low: 'bg-blue-100 text-blue-700 border-blue-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    critical: 'bg-red-100 text-red-700 border-red-200',
  };
  const severityLabels = {
    low: t('sec_sev_low', 'منخفضة'),
    medium: t('sec_sev_medium', 'متوسطة'),
    high: t('sec_sev_high', 'عالية'),
    critical: t('sec_sev_critical', 'حرجة'),
  };

  const filteredLogs = securityLogs.filter(l =>
    !searchQuery || (l.visitor_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return t('sec_just_now', 'الآن');
    if (diff < 3600) return `${Math.floor(diff / 60)} ${t('sec_min', 'د')}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('sec_hr', 'س')}`;
    return `${Math.floor(diff / 86400)} ${t('sec_day', 'ي')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 p-6" dir={isRTL ? 'rtl' : 'ltr'} data-testid="security-dashboard">
      <div className="max-w-7xl mx-auto space-y-5">
      {/* Header — Unified */}
      <PageHeader
        theme="blue"
        icon={ShieldCheckIcon}
        badge={t('sec_welcome', 'مرحباً') + '، ' + (user?.full_name || user?.username)}
        title={t('sec_dashboard', 'لوحة تحكم الأمن')}
        subtitle={user?.compound_name || ''}
        actions={
          <div className="hidden sm:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 bg-green-500/15 backdrop-blur px-3 py-1.5 rounded-lg border border-green-500/25">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs text-green-300">{t('sec_monitoring', 'مراقبة مباشرة')}</span>
            </div>
            <span className="text-[10px] text-gray-500">{new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
        }
        testId="sec-page-header"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: t('sec_today_visitors', 'زوار اليوم'), value: stats.todayVisitors, icon: UsersIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: t('sec_checked_in', 'دخول'), value: stats.checkedIn, icon: CheckCircleIcon, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: t('sec_checked_out', 'خروج'), value: stats.checkedOut, icon: XCircleIcon, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: t('sec_new_msgs', 'رسائل جديدة'), value: stats.unreadMessages, icon: BellIcon, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl border ${s.border} p-4 hover:shadow-md transition-all`} data-testid={`sec-stat-${i}`}>
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'visitors', label: t('sec_visitor_log', 'سجل الزوار'), icon: IdentificationIcon, count: securityLogs.length },
            { id: 'messages', label: t('sec_messages', 'رسائل السكان'), icon: ChatBubbleLeftRightIcon, count: stats.unreadMessages },
            { id: 'incidents', label: t('sec_incidents', 'الحوادث الأمنية'), icon: ExclamationTriangleIcon, count: incidentStats.open },
            { id: 'analytics', label: t('sec_analytics', 'التحليلات'), icon: ChartBarIcon, count: 0 },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
              data-testid={`sec-tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-cyan-100 text-cyan-700'}`}>{tab.count}</span>}
            </button>
          ))}
        </div>
        {activeTab === 'visitors' && (
          <>
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-4 h-4 absolute top-2.5 start-3 text-gray-400" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('sec_search', 'بحث عن زائر...')}
                className="w-full ps-9 pe-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-cyan-500 focus:border-cyan-500"
                data-testid="sec-search-input" />
            </div>
            <button onClick={exportLogsCSV} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-500 transition-all flex items-center gap-1.5" data-testid="sec-export-csv">
              <ArrowDownTrayIcon className="w-4 h-4" />
              {t('sec_export_csv', 'CSV')}
            </button>
          </>
        )}
        <button onClick={fetchData} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-all" data-testid="sec-refresh">
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Visitor Logs */}
      {activeTab === 'visitors' && (
        <div className="space-y-3" data-testid="sec-visitors-tab">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
              <IdentificationIcon className="w-12 h-12 mb-3" />
              <p className="text-sm">{t('sec_no_logs', 'لا يوجد سجل زوار')}</p>
            </div>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={log.id || i} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden" data-testid={`visitor-log-${i}`}>
                <div className="p-4 flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${log.action === 'check_in' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    {log.action === 'check_in'
                      ? <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                      : <XCircleIcon className="w-5 h-5 text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-gray-900">{log.visitor_name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${log.action === 'check_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {log.action === 'check_in' ? t('sec_entry', 'دخول') : t('sec_exit', 'خروج')}
                      </span>
                      <span className="text-[10px] text-gray-400">{timeAgo(log.timestamp || log.created_at)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {log.checked_by && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
                          {t('sec_by', 'بواسطة')}: {log.checked_by}
                        </span>
                      )}
                      {log.id_verified !== undefined && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${log.id_verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t('sec_id', 'الهوية')}: {log.id_verified ? t('sec_verified', 'تم التحقق') : t('sec_not_verified', 'لم يتحقق')}
                        </span>
                      )}
                      {log.photo_taken && (
                        <span className="px-2 py-0.5 bg-blue-100 rounded text-[10px] text-blue-700">
                          <EyeIcon className="w-3 h-3 inline-block me-0.5" />{t('sec_photo', 'صورة')}
                        </span>
                      )}
                      {log.temperature_check && (
                        <span className="px-2 py-0.5 bg-purple-100 rounded text-[10px] text-purple-700">{log.temperature_check}°C</span>
                      )}
                    </div>
                    {log.security_notes && (
                      <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                        <p className="text-[10px] text-amber-700"><ExclamationTriangleIcon className="w-3 h-3 inline-block me-1" />{log.security_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Messages */}
      {activeTab === 'messages' && (
        <div className="space-y-3" data-testid="sec-messages-tab">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
              <ChatBubbleLeftRightIcon className="w-12 h-12 mb-3" />
              <p className="text-sm">{t('sec_no_msgs', 'لا توجد رسائل')}</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={msg.id || i}
                className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer ${!msg.read ? 'border-cyan-200 bg-cyan-50/30' : 'border-gray-100'}`}
                onClick={() => !msg.read && markRead(msg.id)}
                data-testid={`sec-msg-${i}`}
              >
                <div className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">{(msg.sender_name || 'U').charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-bold text-gray-900">{msg.sender_name}</h3>
                      {msg.unit_number && <span className="text-[10px] text-gray-400">{t('unit', 'وحدة')} {msg.unit_number}</span>}
                      {!msg.read && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full">{t('sec_new', 'جديد')}</span>}
                    </div>
                    {msg.subject && <p className="text-xs font-medium text-gray-700 mb-0.5">{msg.subject}</p>}
                    <p className="text-[10px] text-gray-500 truncate">{msg.content || msg.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] text-gray-400">{timeAgo(msg.created_at)}</span>
                      {msg.category && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] rounded">{msg.category}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {/* Incidents */}
      {activeTab === 'incidents' && (
        <div className="space-y-4" data-testid="sec-incidents-tab">
          {/* Banner + Report button */}
          <div className="flex items-center justify-between bg-gradient-to-r from-rose-50 to-orange-50 rounded-xl border border-rose-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center shadow-md">
                <ExclamationTriangleIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-rose-900">
                  {incidentStats.open} {t('sec_inc_open', 'بلاغ مفتوح')}
                  {incidentStats.critical > 0 && (
                    <span className="ms-2 px-2 py-0.5 bg-red-600 text-white text-[10px] rounded-full">{incidentStats.critical} {t('sec_inc_crit', 'حرج')}</span>
                  )}
                </p>
                <p className="text-[10px] text-rose-700">{t('sec_inc_hint', 'سجّل أي حادث أو ملاحظة أمنية مباشرة')}</p>
              </div>
            </div>
            <button onClick={() => setShowIncidentForm(!showIncidentForm)} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-500 shadow flex items-center gap-1.5" data-testid="sec-report-btn">
              <PlusCircleIcon className="w-4 h-4" />
              {t('sec_report_incident', 'بلاغ جديد')}
            </button>
          </div>

          {/* New incident form */}
          {showIncidentForm && (
            <div className="bg-white rounded-xl border border-rose-200 p-4 space-y-3" data-testid="sec-incident-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" placeholder={t('sec_inc_title_ph', 'عنوان البلاغ')} value={newIncident.title} onChange={e => setNewIncident({ ...newIncident, title: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="sec-inc-title" />
                <input type="text" placeholder={t('sec_inc_location_ph', 'الموقع (اختياري)')} value={newIncident.location} onChange={e => setNewIncident({ ...newIncident, location: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="sec-inc-location" />
              </div>
              <textarea placeholder={t('sec_inc_desc_ph', 'وصف تفصيلي للحادث...')} value={newIncident.description} onChange={e => setNewIncident({ ...newIncident, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="sec-inc-desc" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">{t('sec_inc_severity', 'الخطورة')}:</label>
                {['low', 'medium', 'high', 'critical'].map(s => (
                  <button key={s} onClick={() => setNewIncident({ ...newIncident, severity: s })}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${newIncident.severity === s ? severityColors[s] + ' ring-2 ring-offset-1 ring-cyan-400' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                    data-testid={`sec-inc-sev-${s}`}
                  >
                    {severityLabels[s]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowIncidentForm(false)} className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200">{t('sec_cancel', 'إلغاء')}</button>
                <button onClick={createIncident} className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-500" data-testid="sec-inc-submit">{t('sec_inc_submit', 'إرسال البلاغ')}</button>
              </div>
            </div>
          )}

          {/* Incident list */}
          {incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
              <ExclamationTriangleIcon className="w-12 h-12 mb-3" />
              <p className="text-sm">{t('sec_no_incidents', 'لا توجد حوادث مسجلة')}</p>
            </div>
          ) : (
            incidents.map((inc) => (
              <div key={inc.id} className={`bg-white rounded-xl border shadow-sm p-4 ${inc.status === 'resolved' ? 'opacity-75 border-gray-100' : 'border-rose-100'}`} data-testid={`incident-${inc.id}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-bold text-gray-900">{inc.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${severityColors[inc.severity] || severityColors.low}`}>
                        {severityLabels[inc.severity] || inc.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inc.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : inc.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {inc.status === 'resolved' ? t('sec_st_resolved', 'محلول') : inc.status === 'in_progress' ? t('sec_st_progress', 'قيد المعالجة') : t('sec_st_open', 'مفتوح')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">{inc.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                      {inc.location && <span>📍 {inc.location}</span>}
                      {inc.reported_by_name && <span>{t('sec_by', 'بواسطة')}: {inc.reported_by_name}</span>}
                      <span>{timeAgo(inc.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {inc.status !== 'resolved' && (
                      <>
                        {inc.status === 'open' && (
                          <button onClick={() => updateIncidentStatus(inc.id, 'in_progress')} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-medium hover:bg-amber-200" data-testid={`inc-progress-${inc.id}`}>
                            {t('sec_st_progress', 'قيد المعالجة')}
                          </button>
                        )}
                        <button onClick={() => updateIncidentStatus(inc.id, 'resolved')} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-medium hover:bg-emerald-200" data-testid={`inc-resolve-${inc.id}`}>
                          {t('sec_resolve', 'حل')}
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <button onClick={() => deleteIncident(inc.id)} className="px-2 py-1 bg-red-50 text-red-500 rounded text-[10px] hover:bg-red-100" data-testid={`inc-delete-${inc.id}`}>
                        {t('sec_delete', 'حذف')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-4" data-testid="sec-analytics-tab">
          {!analytics ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-2xl font-black text-cyan-600">{analytics.total_visits}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{t('sec_total_visits_7d', 'إجمالي الزيارات (7 أيام)')}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-2xl font-black text-emerald-600">{analytics.check_in_count}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{t('sec_checkins', 'تسجيلات دخول')}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-2xl font-black text-amber-600">{analytics.check_out_count}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{t('sec_checkouts', 'تسجيلات خروج')}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-2xl font-black text-indigo-600">{analytics.id_verified_ratio}%</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{t('sec_id_ratio', 'نسبة التحقق من الهوية')}</p>
                </div>
              </div>

              {/* 7-day trend bar chart */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <ChartBarIcon className="w-4 h-4 text-cyan-600" />
                    {t('sec_trend_title', 'اتجاه الزوار - آخر 7 أيام')}
                  </h3>
                </div>
                {analytics.total_visits === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <ChartBarIcon className="w-10 h-10 mb-2" />
                    <p className="text-xs">{t('sec_no_trend_data', 'لا توجد بيانات زيارات في آخر 7 أيام')}</p>
                  </div>
                ) : (
                  <div className="flex items-end gap-2 h-40" data-testid="sec-trend-chart">
                  {(analytics.trend || []).map((d, i) => {
                    const maxVal = Math.max(1, ...analytics.trend.map(x => x.total));
                    const pct = (d.total / maxVal) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="flex-1 flex items-end w-full">
                          <div className="w-full bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-t-lg transition-all hover:from-cyan-600" style={{ height: `${pct}%`, minHeight: d.total > 0 ? '8px' : '2px' }} title={`${d.date}: ${d.total}`}>
                            {d.total > 0 && <p className="text-[9px] text-white font-bold text-center pt-0.5">{d.total}</p>}
                          </div>
                        </div>
                        <p className="text-[9px] text-gray-500">{d.date.slice(5)}</p>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>

              {/* Peak hours */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                  <FireIcon className="w-4 h-4 text-rose-500" />
                  {t('sec_peak_title', 'ساعات الذروة')}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {(analytics.peak_hours || []).map((p, i) => (
                    <div key={i} className={`rounded-xl border p-3 text-center ${i === 0 ? 'bg-rose-50 border-rose-200' : i === 1 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`text-xs font-medium ${i === 0 ? 'text-rose-600' : i === 1 ? 'text-amber-600' : 'text-gray-500'}`}>#{i + 1}</p>
                      <p className="text-xl font-black text-gray-900 mt-1">{p.hour}:00</p>
                      <p className="text-[10px] text-gray-500">{p.count} {t('sec_visits', 'زيارة')}</p>
                    </div>
                  ))}
                </div>
                {/* 24h heatmap */}
                <div className="mt-4">
                  <p className="text-[10px] text-gray-500 mb-2">{t('sec_hourly_dist', 'توزيع النشاط خلال 24 ساعة')}</p>
                  <div className="grid grid-cols-24 gap-0.5" style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}>
                    {(analytics.hourly || []).map((c, h) => {
                      const max = Math.max(1, ...analytics.hourly);
                      const intensity = c / max;
                      return (
                        <div key={h}
                          className="aspect-square rounded border"
                          style={{
                            backgroundColor: intensity === 0 ? '#f9fafb' : `rgba(6,182,212,${0.2 + intensity * 0.8})`,
                            borderColor: intensity === 0 ? '#e5e7eb' : 'transparent',
                          }}
                          title={`${h}:00 — ${c} ${t('sec_visits', 'زيارة')}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1 text-[8px] text-gray-400">
                    <span>00:00</span>
                    <span>12:00</span>
                    <span>23:00</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      </div>
    </div>
  );
};

export default SecurityDashboard;
