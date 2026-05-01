import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import PageHeader from '../components/shared/PageHeader';
import SectionCard from '../components/shared/SectionCard';
import EmptyState from '../components/shared/EmptyState';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * ChangelogManagementPage — app_owner only.
 *
 * Manages the bullets shown in the post-update "What's new?" modal.
 * Stored in MongoDB (collection: changelog_entries) so the owner can
 * publish release notes WITHOUT a redeploy.
 */
const ChangelogManagementPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ ar: '', en: '', fr: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState({}); // {id: {ar, en, fr}}

  useEffect(() => {
    if (user && user.role !== 'app_owner') {
      toast.error('هذه الصفحة مخصصة لمالك التطبيق فقط');
      navigate('/app/dashboard');
    }
  }, [user, navigate]);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/owner/changelog`, auth());
      setItems(res.data?.items || []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل تحميل القائمة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const onCreate = async () => {
    if (!draft.ar.trim()) {
      toast.error('النص العربي مطلوب');
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API}/owner/changelog`, draft, auth());
      toast.success('تمت إضافة العنصر');
      setDraft({ ar: '', en: '', fr: '', is_active: true });
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (it) => {
    try {
      await axios.put(`${API}/owner/changelog/${it.id}`, { is_active: !it.is_active }, auth());
      toast.success(it.is_active ? 'تم الإخفاء' : 'تم التفعيل');
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل التحديث');
    }
  };

  const onSaveEdit = async (id) => {
    const data = editing[id];
    if (!data || !data.ar?.trim()) {
      toast.error('النص العربي مطلوب');
      return;
    }
    try {
      await axios.put(`${API}/owner/changelog/${id}`, data, auth());
      toast.success('تم الحفظ');
      setEditing((e) => { const c = { ...e }; delete c[id]; return c; });
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل الحفظ');
    }
  };

  const onDelete = async (it) => {
    if (!window.confirm(`حذف العنصر؟\n"${it.ar.slice(0, 60)}..."`)) return;
    try {
      await axios.delete(`${API}/owner/changelog/${it.id}`, auth());
      toast.success('تم الحذف');
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل الحذف');
    }
  };

  const onMoveOrder = async (it, delta) => {
    try {
      await axios.put(`${API}/owner/changelog/${it.id}`, { order: (it.order || 0) + delta }, auth());
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل تغيير الترتيب');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50 p-6" dir="rtl" data-testid="changelog-management-page">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          theme="indigo"
          iconEmoji="📝"
          badge="App Owner — مالك التطبيق"
          title="إدارة سجل التحديثات"
          subtitle="حرّري النقاط التي تظهر للمستخدمين بعد تحديث التطبيق (٣ لغات). التغييرات تظهر فوراً بدون نشر جديد."
          testId="changelog-page-header"
        />

        {/* Add new entry */}
        <SectionCard title="➕ إضافة نقطة جديدة" variant="light" testId="changelog-add-section">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">العربية *</label>
              <textarea
                rows="3"
                value={draft.ar}
                onChange={(e) => setDraft({ ...draft, ar: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
                placeholder="مثال: تحسين سرعة لوحة التحكم 🚀"
                data-testid="changelog-draft-ar"
                dir="rtl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">English</label>
              <textarea
                rows="3"
                value={draft.en}
                onChange={(e) => setDraft({ ...draft, en: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
                placeholder="e.g. Faster dashboard 🚀"
                data-testid="changelog-draft-en"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">Français</label>
              <textarea
                rows="3"
                value={draft.fr}
                onChange={(e) => setDraft({ ...draft, fr: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
                placeholder="ex. Tableau de bord plus rapide 🚀"
                data-testid="changelog-draft-fr"
                dir="ltr"
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                className="w-4 h-4"
                data-testid="changelog-draft-active"
              />
              مرئي للمستخدمين فوراً بعد الحفظ
            </label>
            <button
              onClick={onCreate}
              disabled={saving || !draft.ar.trim()}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-bold text-sm hover:shadow-violet-500/30 hover:shadow-lg transition disabled:opacity-60"
              data-testid="changelog-save-new-btn"
            >
              {saving ? '...جارِ الحفظ' : 'حفظ النقطة'}
            </button>
          </div>
        </SectionCard>

        {/* Existing entries */}
        <SectionCard
          title={`📋 النقاط الحالية (${items.length})`}
          subtitle="استخدمي الأسهم لتغيير الترتيب — العين لإخفاء/إظهار العنصر."
          variant="light"
          testId="changelog-list-section"
        >
          {loading ? (
            <div className="text-center text-gray-500 py-8">جاري التحميل...</div>
          ) : items.length === 0 ? (
            <EmptyState
              icon="📭"
              title="لا توجد نقاط بعد"
              subtitle="أضيفي أول نقطة من النموذج بالأعلى. حالياً المستخدمون يرون قائمة افتراضية مدمجة في الكود."
              testId="changelog-empty"
            />
          ) : (
            <div className="space-y-3">
              {items.map((it, idx) => {
                const isEditing = !!editing[it.id];
                const draft2 = editing[it.id] || { ar: it.ar, en: it.en, fr: it.fr };
                return (
                  <div
                    key={it.id}
                    className={`border rounded-xl p-4 transition ${it.is_active ? 'border-violet-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'}`}
                    data-testid={`changelog-row-${it.id}`}
                  >
                    <div className="flex items-start gap-3 flex-wrap">
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <span className="text-xs font-bold text-gray-500">#{it.order ?? idx + 1}</span>
                        <button onClick={() => onMoveOrder(it, -1)} className="text-gray-400 hover:text-violet-600 text-sm" title="لأعلى">▲</button>
                        <button onClick={() => onMoveOrder(it, 1)} className="text-gray-400 hover:text-violet-600 text-sm" title="لأسفل">▼</button>
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        {isEditing ? (
                          <>
                            <textarea rows="2" value={draft2.ar} onChange={(e) => setEditing({ ...editing, [it.id]: { ...draft2, ar: e.target.value } })} className="w-full border rounded p-2 text-sm" dir="rtl" placeholder="العربية" />
                            <textarea rows="2" value={draft2.en} onChange={(e) => setEditing({ ...editing, [it.id]: { ...draft2, en: e.target.value } })} className="w-full border rounded p-2 text-sm" dir="ltr" placeholder="English" />
                            <textarea rows="2" value={draft2.fr} onChange={(e) => setEditing({ ...editing, [it.id]: { ...draft2, fr: e.target.value } })} className="w-full border rounded p-2 text-sm" dir="ltr" placeholder="Français" />
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-semibold text-gray-900" dir="rtl">{it.ar}</div>
                            {it.en && <div className="text-xs text-gray-600" dir="ltr">EN: {it.en}</div>}
                            {it.fr && <div className="text-xs text-gray-600" dir="ltr">FR: {it.fr}</div>}
                          </>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 shrink-0">
                        {isEditing ? (
                          <>
                            <button onClick={() => onSaveEdit(it.id)} className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700">حفظ</button>
                            <button onClick={() => setEditing((e) => { const c = { ...e }; delete c[it.id]; return c; })} className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">إلغاء</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditing({ ...editing, [it.id]: { ar: it.ar, en: it.en, fr: it.fr } })} className="px-3 py-1.5 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200" data-testid={`changelog-edit-${it.id}`}>✏️ تعديل</button>
                            <button onClick={() => onToggleActive(it)} className={`px-3 py-1.5 text-xs rounded ${it.is_active ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`} data-testid={`changelog-toggle-${it.id}`}>
                              {it.is_active ? '🙈 إخفاء' : '👁️ إظهار'}
                            </button>
                            <button onClick={() => onDelete(it)} className="px-3 py-1.5 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200" data-testid={`changelog-delete-${it.id}`}>🗑 حذف</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <p className="text-xs text-gray-500 text-center">
          💡 ملاحظة: عند فراغ القائمة، يستخدم التطبيق نسخة افتراضية مدمجة في الكود حتى لا يخلو الـ Modal من المحتوى.
        </p>
      </div>
    </div>
  );
};

export default ChangelogManagementPage;
