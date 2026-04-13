import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ExclamationTriangleIcon,
  LightBulbIcon,
  QuestionMarkCircleIcon,
  PlusIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const typeConfig = {
  complaint: { label: 'شكوى', icon: ExclamationTriangleIcon, color: 'text-red-600 bg-red-100' },
  suggestion: { label: 'اقتراح', icon: LightBulbIcon, color: 'text-amber-600 bg-amber-100' },
  inquiry: { label: 'استفسار', icon: QuestionMarkCircleIcon, color: 'text-blue-600 bg-blue-100' }
};

const statusConfig = {
  open: { label: 'مفتوحة', color: 'bg-red-100 text-red-700', icon: XCircleIcon },
  in_progress: { label: 'قيد المراجعة', color: 'bg-amber-100 text-amber-700', icon: ClockIcon },
  resolved: { label: 'تم الحل', color: 'bg-green-100 text-green-700', icon: CheckCircleIcon },
  closed: { label: 'مغلقة', color: 'bg-gray-100 text-gray-600', icon: CheckCircleIcon }
};

const ComplaintsSystem = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [complaints, setComplaints] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showRespond, setShowRespond] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    type: 'complaint', category: 'general', title: '', description: '', priority: 'normal'
  });
  const [respondForm, setRespondForm] = useState({ response: '', status: 'in_progress' });

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${API}/complaints?`;
      if (filterType) url += `type=${filterType}&`;
      if (filterStatus) url += `status=${filterStatus}&`;
      const res = await axios.get(url, getToken());
      setComplaints(res.data.complaints || []);
      setSummary(res.data.summary || {});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterType, filterStatus]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/complaints`, { ...form, unit_number: user?.unit_number || '' }, getToken());
      toast.success(t('complaint_sent', 'تم إرسال الشكوى/الاقتراح بنجاح'));
      setShowCreate(false);
      setForm({ type: 'complaint', category: 'general', title: '', description: '', priority: 'normal' });
      fetchComplaints();
    } catch (err) { toast.error(t('send_failed', 'فشل في الإرسال')); }
    finally { setSubmitting(false); }
  };

  const handleRespond = async (complaintId) => {
    setSubmitting(true);
    try {
      await axios.put(`${API}/complaints/${complaintId}/respond?status=${respondForm.status}&response=${encodeURIComponent(respondForm.response)}`, {}, getToken());
      toast.success(t('response_sent', 'تم إرسال الرد بنجاح'));
      setShowRespond(null);
      setRespondForm({ response: '', status: 'in_progress' });
      fetchComplaints();
    } catch (err) { toast.error(t('respond_failed', 'فشل في الرد')); }
    finally { setSubmitting(false); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-EG') : '-';

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="complaints-system">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('complaints_suggestions', 'الشكاوى والاقتراحات')}</h1>
            <p className="text-sm text-gray-500">{t('complaints_desc', 'تقديم شكاوى واقتراحات ومتابعة حالتها')}</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            data-testid="new-complaint-btn">
            <PlusIcon className="h-4 w-4" />{t('new_complaint', 'شكوى/اقتراح جديد')}
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" data-testid="complaints-summary">
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{summary.total || 0}</p>
            <p className="text-xs text-gray-500">{t('total', 'الإجمالي')}</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.open || 0}</p>
            <p className="text-xs text-red-600">{t('open', 'مفتوحة')}</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{summary.in_progress || 0}</p>
            <p className="text-xs text-amber-600">{t('in_progress', 'قيد المراجعة')}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{summary.resolved || 0}</p>
            <p className="text-xs text-green-600">{t('resolved', 'تم الحل')}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" data-testid="filter-type">
            <option value="">{t('all_types', 'كل الأنواع')}</option>
            <option value="complaint">{t('complaints_only', 'شكاوى فقط')}</option>
            <option value="suggestion">{t('suggestions_only', 'اقتراحات فقط')}</option>
            <option value="inquiry">{t('inquiries_only', 'استفسارات فقط')}</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" data-testid="filter-status">
            <option value="">{t('all_statuses', 'كل الحالات')}</option>
            <option value="open">{t('open', 'مفتوحة')}</option>
            <option value="in_progress">{t('in_progress', 'قيد المراجعة')}</option>
            <option value="resolved">{t('resolved', 'تم الحل')}</option>
          </select>
        </div>

        {/* List */}
        <div className="space-y-3">
          {complaints.length > 0 ? complaints.map(c => {
            const typeConf = typeConfig[c.type] || typeConfig.complaint;
            const statusConf = statusConfig[c.status] || statusConfig.open;
            const TypeIcon = typeConf.icon;
            const StatusIcon = statusConf.icon;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5" data-testid={`complaint-${c.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${typeConf.color} flex-shrink-0`}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-gray-900">{c.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConf.color}`}>
                          <StatusIcon className="h-3 w-3 inline mr-1" />{statusConf.label}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">{typeConf.label}</span>
                        {c.priority === 'urgent' && <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">{t('urgent', 'عاجل')}</span>}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{c.description}</p>
                      <div className="flex gap-4 text-xs text-gray-400">
                        <span>{c.user_name} {c.unit_number ? `| ${t('unit', 'وحدة')} ${c.unit_number}` : ''}</span>
                        <span>{formatDate(c.created_at)}</span>
                      </div>
                      {c.admin_response && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-xs font-bold text-blue-700 mb-1">{t('admin_response', 'رد الإدارة')}:</p>
                          <p className="text-sm text-blue-800">{c.admin_response}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {isAdmin && c.status !== 'resolved' && c.status !== 'closed' && (
                    <button onClick={() => { setShowRespond(c); setRespondForm({ response: '', status: c.status === 'open' ? 'in_progress' : 'resolved' }); }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 flex-shrink-0"
                      data-testid={`respond-${c.id}`}>
                      <ChatBubbleLeftIcon className="h-3.5 w-3.5 inline mr-1" />{t('respond', 'رد')}
                    </button>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-12 bg-white rounded-xl border">
              <ExclamationTriangleIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t('no_complaints', 'لا توجد شكاوى أو اقتراحات')}</p>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()} data-testid="create-complaint-modal">
              <h3 className="text-lg font-bold mb-4">{t('new_complaint', 'شكوى/اقتراح جديد')}</h3>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('type', 'النوع')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(typeConfig).map(([key, conf]) => {
                      const Icon = conf.icon;
                      return (
                        <button type="button" key={key}
                          onClick={() => setForm(p => ({ ...p, type: key }))}
                          className={`p-3 rounded-lg border-2 text-center text-sm font-medium transition-all ${form.type === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                          data-testid={`type-${key}`}>
                          <Icon className="h-5 w-5 mx-auto mb-1" />
                          {t(key, conf.label)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('category', 'التصنيف')}</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full border rounded-lg p-2.5">
                    <option value="general">{t('general', 'عام')}</option>
                    <option value="maintenance">{t('maintenance', 'صيانة')}</option>
                    <option value="security">{t('security', 'أمن وحراسة')}</option>
                    <option value="cleaning">{t('cleaning', 'نظافة')}</option>
                    <option value="noise">{t('noise', 'إزعاج/ضوضاء')}</option>
                    <option value="parking">{t('parking', 'مواقف')}</option>
                    <option value="financial">{t('financial', 'مالي')}</option>
                    <option value="other">{t('other', 'أخرى')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('title', 'العنوان')}</label>
                  <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full border rounded-lg p-2.5" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('description', 'التفاصيل')}</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="w-full border rounded-lg p-2.5 h-24 resize-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('priority', 'الأولوية')}</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="w-full border rounded-lg p-2.5">
                    <option value="low">{t('low', 'منخفضة')}</option>
                    <option value="normal">{t('normal', 'عادية')}</option>
                    <option value="high">{t('high', 'مرتفعة')}</option>
                    <option value="urgent">{t('urgent', 'عاجلة')}</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50">{submitting ? '...' : t('send', 'إرسال')}</button>
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium">{t('cancel', 'إلغاء')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Respond Modal */}
        {showRespond && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowRespond(null)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()} data-testid="respond-modal">
              <h3 className="text-lg font-bold mb-2">{t('respond_to', 'الرد على')}: {showRespond.title}</h3>
              <p className="text-sm text-gray-500 mb-4">{showRespond.description}</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('update_status', 'تحديث الحالة')}</label>
                  <select value={respondForm.status} onChange={e => setRespondForm(p => ({ ...p, status: e.target.value }))} className="w-full border rounded-lg p-2.5">
                    <option value="in_progress">{t('in_progress', 'قيد المراجعة')}</option>
                    <option value="resolved">{t('resolved', 'تم الحل')}</option>
                    <option value="closed">{t('closed', 'مغلقة')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('admin_response', 'رد الإدارة')}</label>
                  <textarea value={respondForm.response} onChange={e => setRespondForm(p => ({ ...p, response: e.target.value }))} className="w-full border rounded-lg p-2.5 h-24 resize-none" placeholder={t('write_response', 'اكتب ردك هنا...')} />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleRespond(showRespond.id)} disabled={submitting} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50">{submitting ? '...' : t('send_response', 'إرسال الرد')}</button>
                  <button onClick={() => setShowRespond(null)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium">{t('cancel', 'إلغاء')}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintsSystem;
