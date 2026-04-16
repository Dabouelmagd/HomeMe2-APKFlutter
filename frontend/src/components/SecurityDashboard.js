import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
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
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const SecurityDashboard = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState('visitors');
  const [securityLogs, setSecurityLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ todayVisitors: 0, checkedIn: 0, checkedOut: 0, unreadMessages: 0 });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'} data-testid="security-dashboard">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cyan-500/15 via-transparent to-transparent"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <ShieldCheckIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black" data-testid="sec-title">{t('sec_dashboard', 'لوحة تحكم الأمن')}</h1>
              <p className="text-cyan-300 text-xs">{t('sec_welcome', 'مرحباً')}، {user?.full_name || user?.username}</p>
              <p className="text-[10px] text-gray-400">{user?.compound_name || ''}</p>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 bg-green-500/15 backdrop-blur px-3 py-1.5 rounded-lg border border-green-500/25">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs text-green-300">{t('sec_monitoring', 'مراقبة مباشرة')}</span>
            </div>
            <span className="text-[10px] text-gray-500">{new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

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
        <div className="flex gap-2">
          {[
            { id: 'visitors', label: t('sec_visitor_log', 'سجل الزوار'), icon: IdentificationIcon, count: securityLogs.length },
            { id: 'messages', label: t('sec_messages', 'رسائل السكان'), icon: ChatBubbleLeftRightIcon, count: stats.unreadMessages },
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
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 absolute top-2.5 start-3 text-gray-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('sec_search', 'بحث عن زائر...')}
              className="w-full ps-9 pe-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-cyan-500 focus:border-cyan-500"
              data-testid="sec-search-input" />
          </div>
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
    </div>
  );
};

export default SecurityDashboard;
