/**
 * GovDashboard — لوحة تحكم المحافظات والمحليات
 * role: gov_admin | district_admin | markaz_admin
 * نفس فلسفة CompanyAdminDashboard لكن للجهات الحكومية
 */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import {
  BuildingOffice2Icon, MapPinIcon, UsersIcon, CurrencyDollarIcon,
  WrenchScrewdriverIcon, ChartBarIcon, BellAlertIcon, PlusIcon,
  ArrowTrendingUpIcon, DocumentTextIcon, ShieldCheckIcon,
  ExclamationTriangleIcon, CheckCircleIcon, ClockIcon,
  MagnifyingGlassIcon, FunnelIcon, ArrowPathIcon,
  BoltIcon, StarIcon, PhoneIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

// ─── Stat card ──────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'emerald', trend }) => {
  const colors = {
    emerald: 'from-emerald-500 to-teal-600',
    blue:    'from-blue-500 to-indigo-600',
    amber:   'from-amber-500 to-orange-600',
    rose:    'from-rose-500 to-pink-600',
    violet:  'from-violet-500 to-purple-600',
    sky:     'from-sky-500 to-cyan-600',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
};

// ─── District / Zone Card ────────────────────────────────────────────
const ZoneCard = ({ zone, onClick }) => {
  const statusColor = zone.status === 'active'
    ? 'bg-emerald-100 text-emerald-700'
    : zone.status === 'pending'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-gray-100 text-gray-600';

  return (
    <div onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">
            {zone.type === 'district' ? '🏘️' : zone.type === 'markaz' ? '🏛️' : '🏙️'}
          </div>
          <div>
            <h3 className="font-black text-gray-900 dark:text-white text-sm">{zone.name}</h3>
            <p className="text-[10px] text-gray-500">{zone.governorate} · {zone.type_label}</p>
          </div>
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusColor}`}>
          {zone.status === 'active' ? '✅ نشط' : zone.status === 'pending' ? '⏳ جديد' : zone.status}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        {[
          { l: 'المجمعات', v: zone.compounds_count || 0 },
          { l: 'الوحدات', v: (zone.units_count || 0).toLocaleString('ar-EG') },
          { l: 'السكان', v: (zone.residents_count || 0).toLocaleString('ar-EG') },
        ].map(({ l, v }) => (
          <div key={l} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-1.5 text-center">
            <p className="text-sm font-black text-gray-900 dark:text-white">{v}</p>
            <p className="text-[9px] text-gray-500">{l}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(zone.open_complaints > 0 || zone.pending_maintenance > 0) && (
        <div className="flex gap-2 mt-2">
          {zone.open_complaints > 0 && (
            <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
              🔴 {zone.open_complaints} شكوى
            </span>
          )}
          {zone.pending_maintenance > 0 && (
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
              🔧 {zone.pending_maintenance} صيانة
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Add Zone Modal ──────────────────────────────────────────────────
const AddZoneModal = ({ onClose, onSuccess, parentGovId }) => {
  const [form, setForm] = useState({
    name: '', type: 'district', governorate: '', address: '', phone: '', manager_name: ''
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) return toast.error('الاسم مطلوب');
    setSaving(true);
    try {
      await axios.post(`${API}/gov/zones`, { ...form, parent_gov_id: parentGovId }, tok());
      toast.success('✅ تمت الإضافة');
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الإضافة');
    } finally { setSaving(false); }
  };

  const types = [
    { v: 'district', l: '🏘️ حي / منطقة' },
    { v: 'markaz',   l: '🏛️ مركز / قضاء' },
    { v: 'city',     l: '🏙️ مدينة / محافظة' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-4 rounded-t-2xl">
          <h3 className="font-black text-white">➕ إضافة منطقة / حي / مركز</h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">نوع الوحدة الإدارية</label>
            <div className="grid grid-cols-3 gap-2">
              {types.map(t => (
                <button key={t.v} type="button" onClick={() => set('type', t.v)}
                  className={`p-2 rounded-xl border-2 text-xs font-bold text-center transition-all ${
                    form.type === t.v
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                  }`}>{t.l}</button>
              ))}
            </div>
          </div>

          {[
            ['الاسم *', 'name', 'text', 'مثال: حي النزهة، مركز بنها...'],
            ['المحافظة', 'governorate', 'text', 'القاهرة، الجيزة...'],
            ['العنوان', 'address', 'text', 'الشارع والمنطقة...'],
            ['هاتف المسؤول', 'phone', 'tel', '01xxxxxxxxx'],
            ['اسم المسؤول', 'manager_name', 'text', 'المهندس / الدكتور...'],
          ].map(([label, key, type, ph]) => (
            <div key={key}>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
                placeholder={ph}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none" />
            </div>
          ))}

          <button onClick={submit} disabled={saving}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black py-3 rounded-xl text-sm disabled:opacity-60">
            {saving ? 'جاري الإضافة...' : '✅ إضافة الوحدة الإدارية'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Dashboard ─────────────────────────────────────────────────
export default function GovDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [showAdd, setShowAdd] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [financial, setFinancial] = useState({});
  const [subs, setSubs] = useState({});
  const [selectedZone, setSelectedZone] = useState(null);
  const [zoneStaff, setZoneStaff] = useState([]);
  const [zoneInvites, setZoneInvites] = useState([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [financialPeriod, setFinancialPeriod] = useState('month');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, zonesRes, alertsRes] = await Promise.all([
        axios.get(`${API}/gov/stats`, tok()).catch(() => ({ data: {} })),
        axios.get(`${API}/gov/zones`, tok()).catch(() => ({ data: { zones: [] } })),
        axios.get(`${API}/gov/alerts`, tok()).catch(() => ({ data: { alerts: [] } })),
      ]);
      setStats(statsRes.data || {});
      setZones(zonesRes.data.zones || []);
      setAlerts(alertsRes.data.alerts || []);
      const [finRes, subsRes] = await Promise.all([
        axios.get(`${API}/gov/financial/summary?period=${financialPeriod}`, tok()).catch(() => ({ data: {} })),
        axios.get(`${API}/gov/subscriptions`, tok()).catch(() => ({ data: {} })),
      ]);
      setFinancial(finRes.data || {});
      setSubs(subsRes.data || {});
    } catch { toast.error('فشل تحميل البيانات'); }
    finally { setLoading(false); }
  }, [financialPeriod]);

  useEffect(() => { load(); }, [load]);

  const filtered = zones.filter(z => {
    const matchSearch = !search || z.name.includes(search) || z.governorate?.includes(search);
    const matchType = filterType === 'all' || z.type === filterType;
    return matchSearch && matchType;
  });

  const loadZoneStaff = useCallback(async (zoneId) => {
    if (!zoneId) return;
    const [staffRes, invRes] = await Promise.all([
      axios.get(`${API}/gov/zones/${zoneId}/staff`, tok()).catch(() => ({ data: { staff: [] } })),
      axios.get(`${API}/gov/zones/${zoneId}/invites`, tok()).catch(() => ({ data: { invites: [] } })),
    ]);
    setZoneStaff(staffRes.data.staff || []);
    setZoneInvites(invRes.data.invites || []);
  }, []);

  const handleSelectZone = (zone) => {
    setSelectedZone(zone);
    loadZoneStaff(zone.id);
    setActiveTab('zone_detail');
  };

  const tabs = [
    { id: 'overview',      label: 'نظرة عامة',       icon: ChartBarIcon },
    { id: 'zones',         label: 'الوحدات الإدارية', icon: MapPinIcon },
    { id: 'financial',     label: 'المالية',           icon: CurrencyDollarIcon },
    { id: 'maintenance',   label: 'الصيانة والخدمات', icon: WrenchScrewdriverIcon },
    { id: 'complaints',    label: 'الشكاوى',          icon: ExclamationTriangleIcon },
    { id: 'reports',       label: 'التقارير',          icon: DocumentTextIcon },
    { id: 'security',      label: 'الأمان',           icon: ShieldCheckIcon },
    { id: 'staff',         label: 'الموظفون',         icon: UsersIcon },
    { id: 'financial',     label: 'الإيرادات',        icon: CurrencyDollarIcon },
    { id: 'subscriptions', label: 'الاشتراكات',       icon: BoltIcon },
    ...(selectedZone ? [{ id: 'zone_detail', label: `📍 ${selectedZone.name}`, icon: MapPinIcon }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-8" dir="rtl">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-4 pt-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🏛️</span>
                <h1 className="text-xl font-black text-white">
                  {stats?.gov_name || 'لوحة التحكم الحكومية'}
                </h1>
              </div>
              <p className="text-blue-200 text-sm">
                {stats?.gov_type_label || 'إدارة الوحدات الإدارية'}
                {stats?.governorate && ` · ${stats.governorate}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 bg-white text-blue-700 font-black px-3 py-2 rounded-xl text-xs shadow hover:bg-blue-50">
                <PlusIcon className="h-4 w-4" /> إضافة وحدة
              </button>
              <button onClick={load}
                className="p-2 bg-white/20 text-white rounded-xl hover:bg-white/30">
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { l: 'الوحدات الإدارية', v: stats?.total_zones ?? '—', icon: '🏛️' },
              { l: 'الوحدات السكنية', v: (stats?.total_units ?? 0).toLocaleString('ar-EG'), icon: '🏠' },
              { l: 'إجمالي السكان', v: (stats?.total_residents ?? 0).toLocaleString('ar-EG'), icon: '👥' },
              { l: 'الشكاوى المفتوحة', v: stats?.open_complaints ?? 0, icon: '🔴' },
            ].map(({ l, v, icon }) => (
              <div key={l} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
                <p className="text-2xl mb-0.5">{icon}</p>
                <p className="text-xl font-black text-white">{v}</p>
                <p className="text-[10px] text-white/70">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 -mt-14">

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <div className="flex gap-0">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-700 bg-blue-50/50 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}>
                  <tab.icon className="h-3.5 w-3.5 flex-shrink-0" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts bar */}
        {alerts.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-3 mb-4 flex items-center gap-3">
            <BellAlertIcon className="h-5 w-5 text-red-600 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700 dark:text-red-300">
                {alerts.length} تنبيه تحتاج اهتمامك
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">{alerts[0]?.message}</p>
            </div>
          </div>
        )}

        {/* ── Overview Tab ─────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard icon={MapPinIcon}          label="أحياء / مراكز"   value={stats?.districts_count ?? 0}   color="blue" />
              <StatCard icon={BuildingOffice2Icon}  label="كمبوندات / عمارات" value={stats?.compounds_count ?? 0} color="emerald" />
              <StatCard icon={UsersIcon}            label="موظفو الإدارة"  value={stats?.staff_count ?? 0}       color="violet" />
              <StatCard icon={WrenchScrewdriverIcon} label="صيانة مفتوحة" value={stats?.open_maintenance ?? 0}  color="amber" />
              <StatCard icon={CurrencyDollarIcon}   label="إيرادات الشهر" value={`${(stats?.monthly_revenue ?? 0).toLocaleString()} ج.م`} color="sky" />
              <StatCard icon={StarIcon}             label="رضا المواطنين"  value={`${stats?.satisfaction ?? 0}%`} color="rose" />
            </div>

            {/* Zones preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-gray-900 dark:text-white">أحدث الوحدات الإدارية</h3>
                <button onClick={() => setActiveTab('zones')} className="text-xs text-blue-600 hover:underline">عرض الكل</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {zones.slice(0, 6).map(z => (
                  <ZoneCard key={z.id} zone={z} onClick={() => setActiveTab('zones')} />
                ))}
                {zones.length === 0 && !loading && (
                  <div className="col-span-3 text-center py-12 text-gray-400">
                    <MapPinIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">لا توجد وحدات إدارية بعد</p>
                    <button onClick={() => setShowAdd(true)}
                      className="mt-3 bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-sm">
                      + إضافة أول وحدة
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'إدارة الشكاوى',    icon: '😞', tab: 'complaints',  color: 'bg-red-50 text-red-700 border-red-200' },
                { label: 'طلبات الصيانة',   icon: '🔧', tab: 'maintenance',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
                { label: 'التقارير الشهرية', icon: '📊', tab: 'reports',      color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { label: 'إدارة الموظفين',  icon: '👥', tab: 'staff',        color: 'bg-violet-50 text-violet-700 border-violet-200' },
              ].map(({ label, icon, tab, color }) => (
                <button key={label} onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 p-3 rounded-xl border font-bold text-sm ${color} hover:opacity-80 transition-opacity`}>
                  <span className="text-xl">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Zones Tab ────────────────────────────────────────── */}
        {activeTab === 'zones' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-40">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="ابحث باسم الحي أو المركز..."
                  className="w-full pr-9 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 outline-none" />
              </div>
              {['all','district','markaz','city'].map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    filterType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                  }`}>
                  {t === 'all' ? 'الكل' : t === 'district' ? '🏘️ أحياء' : t === 'markaz' ? '🏛️ مراكز' : '🏙️ مدن'}
                </button>
              ))}
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 bg-blue-700 text-white font-black px-4 py-2 rounded-xl text-sm hover:bg-blue-800">
                <PlusIcon className="h-4 w-4" /> إضافة
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(z => (
                <ZoneCard key={z.id} zone={z}
                  onClick={() => handleSelectZone(z)} />
              ))}
              {filtered.length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-400">
                  <FunnelIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>لا توجد نتائج</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Financial Tab ─────────────────────────────────────── */}
        {activeTab === 'financial' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={CurrencyDollarIcon} label="إيرادات هذا الشهر"  value={`${(stats?.monthly_revenue ?? 0).toLocaleString()} ج.م`} color="emerald" />
              <StatCard icon={CurrencyDollarIcon} label="إيرادات هذا العام"  value={`${(stats?.yearly_revenue ?? 0).toLocaleString()} ج.م`}  color="blue" />
              <StatCard icon={ArrowTrendingUpIcon} label="متوسط نمو الإيرادات" value={`${stats?.revenue_growth ?? 0}%`}                        color="violet" />
              <StatCard icon={BoltIcon}            label="التحصيل المعلق"      value={`${(stats?.pending_collection ?? 0).toLocaleString()} ج.م`} color="amber" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-400">
              <DocumentTextIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-bold">التقارير المالية التفصيلية</p>
              <p className="text-sm mt-1">استيراد وتصدير البيانات المالية لكل الوحدات الإدارية</p>
              <button onClick={() => navigate('/app/finances')}
                className="mt-3 bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-sm">
                عرض التقارير المالية الكاملة
              </button>
            </div>
          </div>
        )}

        {/* ── Maintenance Tab ───────────────────────────────────── */}
        {activeTab === 'maintenance' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-400">
            <WrenchScrewdriverIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-bold">إدارة الصيانة والخدمات البلدية</p>
            <p className="text-sm mt-1">طلبات الصيانة من كل الأحياء والمراكز</p>
            <button onClick={() => navigate('/app/maintenance')}
              className="mt-3 bg-amber-600 text-white font-bold px-5 py-2 rounded-xl text-sm">
              فتح مركز الصيانة
            </button>
          </div>
        )}

        {/* ── Complaints Tab ────────────────────────────────────── */}
        {activeTab === 'complaints' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-400">
            <ExclamationTriangleIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-bold">شكاوى ومقترحات المواطنين</p>
            <p className="text-sm mt-1">شكاوى من كل الوحدات الإدارية مجمّعة في مكان واحد</p>
            <button onClick={() => navigate('/app/complaints')}
              className="mt-3 bg-red-600 text-white font-bold px-5 py-2 rounded-xl text-sm">
              عرض الشكاوى
            </button>
          </div>
        )}

        {/* ── Reports Tab ──────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div className="space-y-3">
            {[
              { label: 'تقرير شهري شامل',       icon: '📊', color: 'emerald', action: () => navigate('/app/reports') },
              { label: 'تقرير رضا المواطنين',   icon: '⭐', color: 'amber',   action: () => navigate('/app/satisfaction') },
              { label: 'تقرير الأداء التشغيلي', icon: '📈', color: 'blue',    action: () => navigate('/app/analytics') },
              { label: 'تقرير المالية والإيرادات', icon: '💰', color: 'teal', action: () => navigate('/app/finances') },
              { label: 'تصدير بيانات Excel',    icon: '📥', color: 'violet',  action: () => navigate('/app/import-export') },
            ].map(({ label, icon, action }) => (
              <button key={label} onClick={action}
                className="w-full flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 transition-colors font-bold text-gray-900 dark:text-white text-sm">
                <span className="text-2xl">{icon}</span>
                {label}
                <span className="mr-auto text-gray-400 text-xs">←</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Security Tab ─────────────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-400">
            <ShieldCheckIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-bold">لوحة الأمان والمراقبة</p>
            <p className="text-sm mt-1">بوابات الدخول وتصاريح الزوار وتقارير الأمن</p>
            <button onClick={() => navigate('/app/security-dashboard')}
              className="mt-3 bg-gray-800 text-white font-bold px-5 py-2 rounded-xl text-sm">
              فتح لوحة الأمان
            </button>
          </div>
        )}

        {/* ── Staff Tab ────────────────────────────────────────── */}
        {activeTab === 'staff' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">اختر وحدة إدارية من تبويب "الوحدات الإدارية" لإدارة موظفيها</p>
            {zones.slice(0,6).map(z => (
              <button key={z.id} onClick={() => handleSelectZone(z)}
                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 transition-colors">
                <span className="text-xl">{z.type==='district'?'🏘️':z.type==='markaz'?'🏛️':'🏙️'}</span>
                <div className="text-start">
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{z.name}</p>
                  <p className="text-xs text-gray-500">{z.type_label}</p>
                </div>
                <span className="mr-auto text-blue-600 text-xs font-bold">إدارة الموظفين ←</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Financial Tab ─────────────────────────────────────── */}
        {activeTab === 'financial' && (
          <div className="space-y-4">
            {/* Period selector */}
            <div className="flex gap-2 justify-end">
              {[['month','شهري'],['quarter','ربع سنوي'],['year','سنوي']].map(([v,l]) => (
                <button key={v} onClick={() => setFinancialPeriod(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${financialPeriod===v?'border-blue-500 bg-blue-50 text-blue-700':'border-gray-200 text-gray-600'}`}>
                  {l}
                </button>
              ))}
            </div>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={CurrencyDollarIcon} label="إجمالي الإيرادات" value={`${(financial.total_revenue||0).toLocaleString()} ج.م`} color="emerald" />
              <StatCard icon={CurrencyDollarIcon} label="إجمالي المصروفات" value={`${(financial.total_expenses||0).toLocaleString()} ج.م`} color="rose" />
              <StatCard icon={ArrowTrendingUpIcon} label="الصافي" value={`${(financial.net||0).toLocaleString()} ج.م`} color={financial.net>=0?'blue':'rose'} />
              <StatCard icon={BoltIcon} label="تحصيل معلق" value={`${(financial.pending_collection||0).toLocaleString()} ج.م`} color="amber" />
            </div>
            {/* MRR */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="font-bold text-gray-900 dark:text-white mb-1">💰 الإيرادات الشهرية المتكررة (MRR)</p>
              <p className="text-3xl font-black text-emerald-600">{(financial.mrr||0).toLocaleString()} ج.م</p>
              <p className="text-xs text-gray-500 mt-1">التقدير السنوي: {(financial.arr_estimate||0).toLocaleString()} ج.م</p>
            </div>
            {/* Zone breakdown */}
            {financial.zone_breakdown?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="font-bold text-gray-900 dark:text-white mb-3">الإيرادات حسب الوحدة الإدارية</p>
                <div className="space-y-2">
                  {financial.zone_breakdown.map((z,i) => {
                    const max = financial.zone_breakdown[0]?.revenue || 1;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{z.name}</span>
                          <span className="font-black text-emerald-600">{(z.revenue||0).toLocaleString()} ج.م</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                            style={{width:`${Math.round((z.revenue/max)*100)}%`}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Subscriptions Tab ─────────────────────────────────── */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={CheckCircleIcon} label="اشتراكات نشطة"  value={subs.active||0}  color="emerald" />
              <StatCard icon={ClockIcon}       label="فترة تجريبية"   value={subs.trial||0}   color="amber" />
              <StatCard icon={BoltIcon}        label="منتهية"          value={subs.expired||0} color="rose" />
              <StatCard icon={CurrencyDollarIcon} label="MRR" value={`${(subs.mrr||0).toLocaleString()} ج.م`} color="blue" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">كل الاشتراكات</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {(subs.subscriptions||[]).slice(0,10).map((s,i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{s.compound_name || s.compound_id}</p>
                      <p className="text-xs text-gray-500">{s.plan_name||s.plan} · {(s.monthly_amount||0).toLocaleString()} ج.م/شهر</p>
                    </div>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      s.status==='active'?'bg-emerald-100 text-emerald-700':
                      s.status==='trial'?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-500'}`}>
                      {s.status==='active'?'نشط':s.status==='trial'?'تجريبي':'منتهي'}
                    </span>
                  </div>
                ))}
                {(!subs.subscriptions||subs.subscriptions.length===0) && (
                  <div className="p-8 text-center text-gray-400 text-sm">لا توجد اشتراكات بعد</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Zone Detail Tab ───────────────────────────────────── */}
        {activeTab === 'zone_detail' && selectedZone && (
          <div className="space-y-4">
            {/* Zone header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedZone.type==='district'?'🏘️':selectedZone.type==='markaz'?'🏛️':'🏙️'}</span>
                  <div>
                    <h3 className="font-black text-lg">{selectedZone.name}</h3>
                    <p className="text-blue-200 text-xs">{selectedZone.type_label} · {selectedZone.governorate}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowInviteModal(true)}
                    className="bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded-lg text-xs border border-white/30">
                    📧 دعوة
                  </button>
                  <button onClick={() => setShowStaffModal(true)}
                    className="bg-white text-blue-700 font-bold px-3 py-1.5 rounded-lg text-xs">
                    + موظف جديد
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['الكمبوندات', selectedZone.compounds_count||0],
                  ['الوحدات', (selectedZone.units_count||0).toLocaleString()],
                  ['السكان', (selectedZone.residents_count||0).toLocaleString()],
                ].map(([l,v]) => (
                  <div key={l} className="bg-white/10 rounded-lg p-2 text-center">
                    <p className="text-lg font-black">{v}</p>
                    <p className="text-[10px] text-white/70">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Staff list */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">👥 موظفو الوحدة</h3>
                <button onClick={() => setShowStaffModal(true)}
                  className="text-xs bg-blue-600 text-white font-bold px-3 py-1 rounded-lg">+ إضافة</button>
              </div>
              {zoneStaff.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">لا يوجد موظفون — اضغط "+ إضافة" لإضافة أول موظف</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {zoneStaff.map((s,i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(s.full_name||'؟')[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{s.full_name}</p>
                        <p className="text-xs text-gray-500">{s.role_label} · {s.email}</p>
                      </div>
                      <button onClick={async () => {
                        await axios.delete(`${API}/gov/zones/${selectedZone.id}/staff/${s.id}`, tok());
                        loadZoneStaff(selectedZone.id);
                        toast.success('تم الحذف');
                      }} className="text-red-400 hover:text-red-600 text-xs">حذف</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invites */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">📧 الدعوات المرسلة</h3>
                <button onClick={() => setShowInviteModal(true)}
                  className="text-xs bg-indigo-600 text-white font-bold px-3 py-1 rounded-lg">+ دعوة جديدة</button>
              </div>
              {zoneInvites.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">لا توجد دعوات — أرسل دعوات بالإيميل أو الكود</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {zoneInvites.map((inv,i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{inv.email||'دعوة بالكود'}</p>
                        <p className="text-xs text-gray-500">كود: <strong>{inv.code}</strong> · تنتهي {inv.expires_at?.slice(0,10)}</p>
                      </div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${inv.status==='used'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>
                        {inv.status==='used'?'مُستخدمة':'بانتظار'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <AddZoneModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); load(); }}
          parentGovId={user?.compound_id}
        />
      )}

      {/* Add Staff Modal */}
      {showStaffModal && selectedZone && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowStaffModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-4 rounded-t-2xl">
              <h3 className="font-black text-white">👤 إضافة موظف — {selectedZone.name}</h3>
            </div>
            <form className="p-4 space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              const body = Object.fromEntries(fd.entries());
              try {
                const res = await axios.post(`${API}/gov/zones/${selectedZone.id}/staff`, body, tok());
                toast.success(`✅ تمت الإضافة — كلمة المرور المؤقتة: ${res.data.temp_password}`);
                setShowStaffModal(false);
                loadZoneStaff(selectedZone.id);
              } catch(err) { toast.error(err.response?.data?.detail || 'فشل الإضافة'); }
            }}>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الدور الوظيفي</label>
                <select name="staff_role" className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none">
                  {[['manager','مدير الوحدة'],['accountant','محاسب'],['admin','إداري'],['security','أمن'],['clerk','موظف']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              {[['الاسم الكامل *','full_name','text','محمد أحمد'],['البريد الإلكتروني *','email','email','name@example.com'],['اسم المستخدم','username','text','username123'],['الهاتف','phone','tel','01xxxxxxxxx']].map(([l,n,t,p]) => (
                <div key={n}>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{l}</label>
                  <input type={t} name={n} placeholder={p} required={l.includes('*')}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none" />
                </div>
              ))}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-xl p-2 text-xs text-blue-700 dark:text-blue-300">
                📧 سيتم إرسال بيانات الدخول على الإيميل تلقائياً
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-700 text-white font-black py-2.5 rounded-xl text-sm hover:bg-blue-800">إضافة وإرسال إيميل</button>
                <button type="button" onClick={() => setShowStaffModal(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && selectedZone && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="bg-gradient-to-r from-indigo-700 to-violet-700 p-4 rounded-t-2xl">
              <h3 className="font-black text-white">📧 إرسال دعوة — {selectedZone.name}</h3>
            </div>
            <form className="p-4 space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              const body = Object.fromEntries(fd.entries());
              try {
                const res = await axios.post(`${API}/gov/zones/${selectedZone.id}/invite`, body, tok());
                const code = res.data.code;
                const link = res.data.reg_link;
                toast.success(`✅ الدعوة أُرسلت — الكود: ${code}`);
                setShowInviteModal(false);
                loadZoneStaff(selectedZone.id);
                // Copy code to clipboard
                navigator.clipboard.writeText(code).catch(() => {});
              } catch(err) { toast.error(err.response?.data?.detail || 'فشل الإرسال'); }
            }}>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">طريقة الدعوة</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['email','📧 إيميل'],['code','🔑 كود فقط'],['both','📧 + كود']].map(([v,l]) => (
                    <label key={v} className="flex items-center gap-1 p-2 border border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 text-xs font-bold">
                      <input type="radio" name="method" value={v} defaultChecked={v==='both'} className="accent-indigo-600" /> {l}
                    </label>
                  ))}
                </div>
              </div>
              {[['الاسم (اختياري)','name','text','اسم المدعو'],['البريد الإلكتروني','email','email','name@example.com']].map(([l,n,t,p]) => (
                <div key={n}>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{l}</label>
                  <input type={t} name={n} placeholder={p}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الدور في الوحدة</label>
                <select name="role" className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none">
                  {[['resident','مقيم'],['admin','مدير'],['staff','موظف']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-indigo-700 text-white font-black py-2.5 rounded-xl text-sm hover:bg-indigo-800">إرسال الدعوة</button>
                <button type="button" onClick={() => setShowInviteModal(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
