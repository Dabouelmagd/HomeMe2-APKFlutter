import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import InviteLinkModal from '../components/shared/InviteLinkModal';
import CompanyPlanUsageCard from '../components/CompanyPlanUsageCard';
import CompoundOnboardingWizard from '../components/company-admin/CompoundOnboardingWizard';
import AggregatedStatsPanel from '../components/company-admin/AggregatedStatsPanel';
import CompoundsComparisonView from '../components/company-admin/CompoundsComparisonView';
import CompoundsTrendChart from '../components/company-admin/CompoundsTrendChart';
import CrmRetentionPanel from '../components/company-admin/CrmRetentionPanel';
import CompanyReferralPanel from '../components/company-admin/CompanyReferralPanel';
import UserTimelineModal from '../components/UserTimelineModal';
import CompanyAssistantsManager from '../components/company-admin/CompanyAssistantsManager';
import PageHeader from '../components/shared/PageHeader';
import SectionCard from '../components/shared/SectionCard';
import EmptyState from '../components/shared/EmptyState';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/** Safely extract a string error message from an axios error.
 *  Backend may return `detail` as a string OR a structured object
 *  (e.g. plan_limit_* errors). Passing an object directly to sonner
 *  crashes React with "Objects are not valid as a React child". */
const errMsg = (err, fallback) => {
  const d = err?.response?.data?.detail;
  if (d && typeof d === 'object') return d.message || fallback;
  return d || fallback;
};

/**
 * CompanyAdminDashboard — لوحة تحكم مدير الشركة (role = company_admin)
 * - يعرض بيانات الشركة + ملخص
 * - يسرد كل المجمعات تحت الشركة
 * - يسمح بإضافة/تعديل/حذف المجمعات
 * - يسمح بإضافة سكان/إداريين/أمن لأي مجمع
 */
const CompanyAdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [compounds, setCompounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editFor, setEditFor] = useState(null);
  const [addUserFor, setAddUserFor] = useState(null);
  const [inviteFor, setInviteFor] = useState(null);
  const [crmUser, setCrmUser] = useState(null);
  const [teamFor, setTeamFor] = useState(null);
  const [error, setError] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [onboardingSkipped, setOnboardingSkipped] = useState(() => {
    return localStorage.getItem('cad_onboarding_skipped') === '1';
  });

  const uploadCompanyLogo = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('الملف يجب أن يكون صورة'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('حجم الصورة يتجاوز 5MB'); return; }
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.put(`${API}/company-admin/logo`, fd, {
        ...getToken(),
        headers: { ...getToken().headers, 'Content-Type': 'multipart/form-data' },
      });
      toast.success('تم رفع لوجو الشركة');
      setMe(prev => prev ? { ...prev, company: { ...prev.company, logo_url: res.data.logo_url } } : prev);
    } catch (err) {
      toast.error(errMsg(err, 'فشل رفع اللوجو'));
    } finally {
      setLogoUploading(false);
    }
  };

  const removeCompanyLogo = async () => {
    if (!window.confirm('حذف لوجو الشركة؟')) return;
    try {
      await axios.delete(`${API}/company-admin/logo`, getToken());
      toast.success('تم حذف اللوجو');
      setMe(prev => prev ? { ...prev, company: { ...prev.company, logo_url: undefined } } : prev);
    } catch (err) {
      toast.error(errMsg(err, 'فشل حذف اللوجو'));
    }
  };

  const uploadCompoundLogo = async (compoundId, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('الملف يجب أن يكون صورة'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('حجم الصورة يتجاوز 5MB'); return; }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.put(`${API}/company-admin/compounds/${compoundId}/logo`, fd, {
        ...getToken(),
        headers: { ...getToken().headers, 'Content-Type': 'multipart/form-data' },
      });
      toast.success('تم رفع لوجو المجمع');
      setCompounds(prev => prev.map(c => c.id === compoundId ? { ...c, logo_url: res.data.logo_url } : c));
    } catch (err) {
      toast.error(errMsg(err, 'فشل رفع اللوجو'));
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      axios.get(`${API}/company-admin/me`, getToken()),
      axios.get(`${API}/company-admin/compounds`, getToken()),
    ]).then(([m, c]) => {
      if (!alive) return;
      setMe(m.data);
      setCompounds(c.data.compounds || []);
      setError(null);
    }).catch(err => {
      if (!alive) return;
      setError(err.response?.data?.detail || 'فشل التحميل');
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [refreshKey]);

  const reload = () => {
    setRefreshKey(k => k + 1);
    // Notify the header PlanLimitBadge (and CompanyPlanUsageCard) to re-fetch usage.
    window.dispatchEvent(new CustomEvent('planUsageRefresh'));
  };

  const createCompound = async (form) => {
    try {
      await axios.post(`${API}/company-admin/compounds`, form, getToken());
      toast.success('تم إنشاء المجمع');
      setCreateOpen(false);
      reload();
    } catch (err) { toast.error(errMsg(err, 'فشل الإنشاء')); }
  };

  const saveEdit = async () => {
    if (!editFor?.id) return;
    try {
      await axios.put(`${API}/company-admin/compounds/${editFor.id}`, {
        name: editFor.name, location: editFor.location, address: editFor.address, description: editFor.description,
      }, getToken());
      toast.success('تم التحديث');
      setEditFor(null);
      reload();
    } catch (err) { toast.error(errMsg(err, 'فشل التحديث')); }
  };

  const removeCompound = async (c) => {
    const usersCount = c.users_count || 0;
    const msg = usersCount > 0
      ? `هذا المجمع به ${usersCount} مستخدم. حذف مع إلغاء ربطهم؟`
      : `تأكيد حذف "${c.name}"؟`;
    if (!window.confirm(msg)) return;
    try {
      const url = `${API}/company-admin/compounds/${c.id}${usersCount > 0 ? '?force=true' : ''}`;
      await axios.delete(url, getToken());
      toast.success('تم الحذف');
      reload();
    } catch (err) { toast.error(errMsg(err, 'فشل الحذف')); }
  };

  const addUser = async (form) => {
    if (!addUserFor?.id) return;
    try {
      await axios.post(`${API}/company-admin/compounds/${addUserFor.id}/users`, form, getToken());
      toast.success('تمت إضافة المستخدم');
      setAddUserFor(null);
      reload();
    } catch (err) { toast.error(errMsg(err, 'فشل الإضافة')); }
  };

  if (loading) return (
    <div className="company-admin-bg flex items-center justify-center text-violet-200" dir="rtl">جاري التحميل...</div>
  );

  if (error) return (
    <div className="company-admin-bg flex items-center justify-center p-6" dir="rtl">
      <div className="bg-red-900/30 border border-red-700 rounded-2xl p-6 max-w-md text-center relative z-10">
        <div className="text-3xl mb-2">⚠️</div>
        <h2 className="text-xl font-bold text-white mb-2">حسابك غير مرتبط بشركة</h2>
        <p className="text-sm text-red-200 mb-4">{error}</p>
        <p className="text-xs text-gray-400">تواصل مع مالك التطبيق لربط حسابك بشركة إدارة.</p>
        <button onClick={() => navigate('/login')} className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">تسجيل الخروج</button>
      </div>
    </div>
  );

  const company = me?.company || {};

  // Onboarding gate: first login + no compounds yet → show wizard
  const showOnboarding = !loading && !error && compounds.length === 0 && !onboardingSkipped;
  if (showOnboarding) {
    return (
      <CompoundOnboardingWizard
        companyName={company.name}
        onComplete={() => {
          window.dispatchEvent(new CustomEvent('planUsageRefresh'));
          reload();
        }}
        onSkip={() => { localStorage.setItem('cad_onboarding_skipped', '1'); setOnboardingSkipped(true); }}
      />
    );
  }

  return (
    <div className="company-admin-bg p-6" dir="rtl" data-testid="company-admin-dashboard">
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Unified Page Header */}
        <PageHeader
          theme="indigo"
          iconEmoji="🏢"
          logoUrl={company.logo_url}
          badge="Co./Admin — شركة إدارة"
          title={company.name || '—'}
          subtitle={company.description || undefined}
          meta={<>
            {company.contact_email && <span>📧 {company.contact_email}</span>}
            {company.contact_phone && <span>📱 {company.contact_phone}</span>}
            {company.company_code && <span className="bg-indigo-900/40 text-indigo-200 px-2 py-0.5 rounded">#{company.company_code}</span>}
          </>}
          actions={
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-xs font-bold transition ${logoUploading ? 'opacity-60 cursor-wait' : ''}`} data-testid="cad-upload-logo-btn">
                  📷 {company.logo_url ? 'تغيير اللوجو' : 'رفع اللوجو'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={logoUploading}
                    onChange={(e) => uploadCompanyLogo(e.target.files?.[0])}
                    data-testid="cad-logo-file-input"
                  />
                </label>
                {company.logo_url && (
                  <button
                    onClick={removeCompanyLogo}
                    className="p-1.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-200 rounded-lg text-xs transition"
                    title="حذف اللوجو"
                    data-testid="cad-delete-logo-btn"
                  >
                    🗑
                  </button>
                )}
              </div>
              <div className="text-[11px] text-gray-400 text-end">
                <div>مرحباً</div>
                <div className="text-white font-semibold text-sm">{user?.full_name || user?.username}</div>
              </div>
            </div>
          }
          testId="cad-page-header"
        />

        {/* Compounds Section — moved to top per user request */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">🏘️ مجمعاتي</h2>
          <button onClick={() => setCreateOpen(true)} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-indigo-500/30 transition" data-testid="cad-create-compound-btn">
            ➕ إضافة مجمع
          </button>
        </div>

        {/* Compounds grid */}
        {compounds.length === 0 ? (
          <EmptyState
            icon="🏗️"
            title="لا توجد مجمعات بعد"
            subtitle="ابدأ بإضافة أول مجمع تحت إدارة شركتك"
            cta={
              <button onClick={() => setCreateOpen(true)} className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-indigo-500/30 hover:shadow-lg text-white rounded-lg font-bold text-sm" data-testid="cad-create-first-btn">
                ➕ أنشئ أول مجمع
              </button>
            }
            testId="cad-empty-state"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {compounds.map(c => (
              <div key={c.id} className="company-admin-card p-5 space-y-3" data-testid={`cad-compound-${c.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {c.logo_url ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shadow-md flex-shrink-0 ring-1 ring-white/10" data-testid={`cad-compound-logo-${c.id}`}>
                          <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <span className="text-3xl">🏘️</span>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-white truncate">{c.name}</h3>
                        <p className="text-[11px] text-gray-400 truncate">{c.location || 'بدون موقع'}</p>
                      </div>
                    </div>
                  </div>
                  <label className="cursor-pointer p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-lg text-xs transition flex-shrink-0" title={c.logo_url ? 'تغيير لوجو المجمع' : 'رفع لوجو المجمع'} data-testid={`cad-compound-logo-upload-${c.id}`}>
                    📷
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => uploadCompoundLogo(c.id, e.target.files?.[0])}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-4 gap-1 text-center">
                  <MiniStat label="سكان" val={c.residents || 0} color="blue" />
                  <MiniStat label="إدارة" val={c.managers || 0} color="purple" />
                  <MiniStat label="أمن" val={c.security || 0} color="amber" />
                  <MiniStat label="الإجمالي" val={c.users_count || 0} color="emerald" />
                </div>

                {c.address && <div className="text-[11px] text-gray-500 border-t border-gray-700/50 pt-2">📍 {c.address}</div>}

                <div className="grid grid-cols-4 gap-2 pt-2">
                  <button onClick={() => { 
                    // Set compound context then navigate to compound management
                    localStorage.setItem('impersonateCompoundId', c.id);
                    navigate(`/app/compound?compound_id=${c.id}`); 
                  }} className="col-span-2 bg-emerald-600/40 hover:bg-emerald-600/70 text-emerald-200 text-xs py-2 rounded font-bold border border-emerald-500/30" data-testid={`cad-manage-${c.id}`}>🏢 إدارة الكمبوند كاملة</button>
                  <button onClick={() => setTeamFor(c)} className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs py-1.5 rounded font-semibold">👥 فريق العمل</button>
                  <button onClick={() => setInviteFor(c)} className="bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 text-xs py-1.5 rounded font-semibold" data-testid={`cad-invite-${c.id}`}>🔗 دعوة</button>
                  <button onClick={() => setAddUserFor(c)} className="bg-green-600/30 hover:bg-green-600/50 text-green-200 text-xs py-1.5 rounded font-semibold" data-testid={`cad-add-user-${c.id}`}>➕ ساكن</button>
                  <button onClick={() => setEditFor({ ...c })} className="bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-xs py-1.5 rounded font-semibold" data-testid={`cad-edit-${c.id}`}>✏️ تعديل</button>
                  <button onClick={() => removeCompound(c)} className="bg-red-600/30 hover:bg-red-600/50 text-red-200 text-xs py-1.5 rounded font-semibold" data-testid={`cad-delete-${c.id}`}>🗑 حذف</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Plan Usage + Upgrade CTA */}
        <CompanyPlanUsageCard />

        {/* Aggregated Stats Panel — إحصائيات شاملة + drill-down per-compound */}
        <AggregatedStatsPanel refreshKey={refreshKey} onSelectCompound={(c) => {
          // Select this compound and navigate to the shared admin dashboard (same UX as Owner/Admin)
          localStorage.setItem('selectedCompoundId', c.id);
          localStorage.setItem('selectedCompoundName', c.name || '');
          navigate('/app/dashboard');
        }} />

        {/* 📊 Cross-compound Comparison (Iter 141) — bar chart + sortable table + CSV/PDF export */}
        <SectionCard
          title="📊 مقارنة الكمبوندات"
          subtitle="مقارنة جنباً إلى جنب: السكان، الإيرادات، الصيانة، الشكاوى — مع تصدير PDF و CSV"
          variant="dark"
        >
          <CompoundsComparisonView />
        </SectionCard>

        {/* 📈 Compounds 6-month Trend (Iter 142, Feature #36) */}
        <SectionCard
          title="📈 اتجاهات الكمبوندات (6 أشهر)"
          subtitle="مخطط متعدد الخطوط — يكشف نمو أو تراجع كل مجمع في الإيرادات، السكان، الشكاوى والصيانة"
          variant="dark"
        >
          <CompoundsTrendChart />
        </SectionCard>

        {/* CRM / Retention Panel — VIP + Late Payers cross-compound */}
        <SectionCard
          title="🧠 CRM & الاحتفاظ بالعملاء"
          subtitle="تاغات وملاحظات السكان عبر كل المجمعات"
          variant="light"
          testId="cad-crm-section"
        >
          <CrmRetentionPanel
            refreshKey={refreshKey}
            onUserClick={(u) => setCrmUser(u)}
          />
        </SectionCard>

        {/* Referral Panel — viral loop, earn free months by inviting other companies */}
        <SectionCard
          title="🚀 برنامج الإحالة"
          subtitle="ادعُ شركات صديقة، اربح أشهر مجانية"
          variant="light"
          testId="cad-referral-section"
        >
          <CompanyReferralPanel
            refreshKey={refreshKey}
            onRefresh={() => setRefreshKey(k => k + 1)}
          />
        </SectionCard>
      </div>

      {createOpen && <CompoundFormModal title="➕ إضافة مجمع جديد" initial={{}} onClose={() => setCreateOpen(false)} onSave={createCompound} saveLabel="إضافة" />}
      {editFor && <CompoundFormModal title="✏️ تعديل المجمع" initial={editFor} onClose={() => setEditFor(null)} onSave={async (f) => { setEditFor({...editFor, ...f}); setTimeout(saveEdit, 0); }} saveLabel="حفظ" />}
      {addUserFor && <AddUserModal compound={addUserFor} onClose={() => setAddUserFor(null)} onSave={addUser} />}
      {inviteFor && <InviteLinkModal compound={inviteFor} onClose={() => setInviteFor(null)} />}

      {/* Compound Team Modal */}
      {teamFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setTeamFor(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">👥 فريق عمل: {teamFor.name}</h2>
              <button onClick={() => setTeamFor(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <CompanyAssistantsManager compoundId={teamFor.id} compoundName={teamFor.name} />
          </div>
        </div>
      )}
      {crmUser && <UserTimelineModal user={crmUser} onClose={() => { setCrmUser(null); setRefreshKey(k => k + 1); }} />}
    </div>
  );
};

const MiniStat = ({ label, val, color }) => (
  <div className={`bg-${color}-900/30 border border-${color}-700/40 rounded p-1.5`}>
    <div className={`text-sm font-bold text-${color}-300`}>{val}</div>
    <div className="text-[9px] text-gray-400">{label}</div>
  </div>
);

const CompoundFormModal = ({ title, initial, onClose, onSave, saveLabel }) => {
  const [form, setForm] = useState({
    name: initial.name || '', location: initial.location || '',
    address: initial.address || '', description: initial.description || '',
  });
  const submit = () => {
    if (!form.name.trim()) { toast.error('اسم المجمع مطلوب'); return; }
    onSave(form);
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-indigo-500/30" onClick={e => e.stopPropagation()} data-testid="cad-compound-form-modal">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">اسم المجمع *</label>
            <input type="text" placeholder="اسم المجمع" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="cad-cpd-name" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">الموقع</label>
            <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="cad-cpd-location" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">العنوان التفصيلي</label>
            <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">الوصف</label>
            <textarea rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={submit} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold" data-testid="cad-cpd-save">{saveLabel}</button>
          <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg text-sm">إلغاء</button>
        </div>
      </div>
    </div>
  );
};

const AddUserModal = ({ compound, onClose, onSave }) => {
  const [form, setForm] = useState({
    full_name: '', username: '', email: '', password: '', role: 'resident', phone: '', unit_number: '',
  });
  const roles = [
    { v: 'resident', l: 'ساكن', emoji: '🏠' },
    { v: 'family_head', l: 'رب أسرة', emoji: '👨‍👩‍👧' },
    { v: 'manager', l: 'إداري', emoji: '👔' },
    { v: 'assistant_manager', l: 'مدير مساعد', emoji: '🤝' },
    { v: 'accountant', l: 'محاسب', emoji: '🧾' },
    { v: 'security', l: 'أمن', emoji: '🛡' },
    { v: 'admin', l: 'أدمن', emoji: '⚙️' },
  ];
  const submit = () => {
    if (!form.full_name.trim() || !form.username.trim() || !form.email.trim() || !form.password) {
      toast.error('كل الحقول المميّزة بنجمة مطلوبة'); return;
    }
    if (form.password.length < 6) { toast.error('كلمة المرور 6 أحرف على الأقل'); return; }
    onSave(form);
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-green-500/30 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="cad-add-user-modal">
        <h3 className="text-lg font-bold text-white">👤 إضافة مستخدم — <span className="text-green-300">{compound.name}</span></h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">الاسم الكامل *</label>
            <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="cad-user-fullname" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">اسم المستخدم *</label>
              <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="cad-user-username" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">كلمة المرور *</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="cad-user-password" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">البريد الإلكتروني *</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="cad-user-email" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">الهاتف</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">رقم الوحدة</label>
              <input value={form.unit_number} onChange={e => setForm({...form, unit_number: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="cad-user-unit" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">الدور</label>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-1">
              {roles.map(r => (
                <button key={r.v} type="button" onClick={() => setForm({...form, role: r.v})}
                  className={`px-1 py-1.5 rounded-lg text-[10px] font-semibold border ${form.role === r.v ? 'bg-green-600 border-green-400 text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'}`}
                  data-testid={`cad-user-role-${r.v}`}>
                  <div className="text-base">{r.emoji}</div>
                  <div>{r.l}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={submit} className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold" data-testid="cad-user-save">💾 إضافة</button>
          <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg text-sm">إلغاء</button>
        </div>
      </div>
    </div>
  );
};

export default CompanyAdminDashboard;
