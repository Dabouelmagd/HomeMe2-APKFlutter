import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  NoSymbolIcon,
  HomeModernIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  FunnelIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const CompanySubscriptions = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [actionModal, setActionModal] = useState(null); // {companyId, type}
  const [modalValue, setModalValue] = useState('');
  const [modalNote, setModalNote] = useState('');
  const [companyAds, setCompanyAds] = useState([]);

  const fetchCompanyAds = async (compoundIds) => {
    if (!compoundIds || compoundIds.length === 0) { setCompanyAds([]); return; }
    try {
      const res = await axios.get(`${API}/ads/by-compounds`, {
        ...getHeaders(), params: { compound_ids: compoundIds.join(',') }
      });
      setCompanyAds(res.data.ads || []);
    } catch { setCompanyAds([]); }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/owner/company-subscriptions`, {
        ...getHeaders(),
        params: { search, status_filter: statusFilter }
      });
      setCompanies(res.data.companies || []);
      setStats(res.data.stats || {});
    } catch {
      toast.error(t('cs_load_failed', 'فشل تحميل البيانات'));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (companyId, action, extra = {}) => {
    try {
      await axios.put(`${API}/owner/company-subscriptions/${companyId}`, { action, ...extra }, getHeaders());
      toast.success(t('cs_action_success', 'تم التنفيذ بنجاح'));
      fetchData();
    } catch {
      toast.error(t('cs_action_failed', 'فشل في تنفيذ الإجراء'));
    }
  };

  const planLabels = {
    starter: t('sp_free', 'مجاني'),
    basic: t('sp_basic', 'أساسي'),
    pro: t('sp_pro', 'احترافي'),
    premium: t('sp_premium', 'متقدم'),
    company_startup: t('sp_co_startup', 'شركة ناشئة'),
    company_business: t('sp_co_business', 'شركة متوسطة'),
    company_enterprise: t('sp_co_enterprise', 'شركة كبرى'),
  };

  const planColors = {
    starter: 'bg-gray-100 text-gray-700',
    basic: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
    premium: 'bg-amber-100 text-amber-700',
    company_startup: 'bg-teal-100 text-teal-700',
    company_business: 'bg-indigo-100 text-indigo-700',
    company_enterprise: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'} data-testid="company-subscriptions">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('cs_title', 'اشتراكات شركات الإدارة')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('cs_subtitle', 'إدارة اشتراكات شركات إدارة المجمعات السكنية')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">{t('cs_total_companies', 'إجمالي الشركات')}</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total_companies || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">{t('cs_active_subs', 'اشتراكات نشطة')}</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.active || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <XCircleIcon className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm text-gray-500">{t('cs_expired_subs', 'اشتراكات منتهية')}</span>
          </div>
          <p className="text-3xl font-bold text-red-600">{stats.expired || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <CurrencyDollarIcon className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-gray-500">{t('cs_monthly_revenue', 'الإيرادات الشهرية')}</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(stats.total_monthly_revenue || 0).toLocaleString()} <span className="text-sm text-gray-400">{t('sm_egp', 'ج.م')}</span></p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <MagnifyingGlassIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('cs_search', 'بحث بالاسم أو الكود أو البريد...')}
            className="w-full border border-gray-200 rounded-lg ps-10 pe-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            data-testid="cs-search"
          />
        </div>
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
          {[
            { id: 'all', label: t('cs_all', 'الكل') },
            { id: 'active', label: t('cs_active', 'نشطة') },
            { id: 'expired', label: t('cs_expired', 'منتهية') },
          ].map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === f.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Companies List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BuildingOfficeIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg">{t('cs_no_companies', 'لا توجد شركات مسجلة')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {companies.map(company => (
            <div key={company.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Company Header */}
              <div
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => {
                  const isExpanding = expandedCompany !== company.id;
                  setExpandedCompany(isExpanding ? company.id : null);
                  if (isExpanding && company.compounds?.length > 0) {
                    fetchCompanyAds(company.compounds.map(c => c.id));
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${company.is_active ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gray-400'}`}>
                    <BuildingOfficeIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{company.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${company.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {company.is_active ? t('cs_active', 'نشطة') : t('cs_expired', 'منتهية')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planColors[company.plan] || 'bg-gray-100 text-gray-700'}`}>
                        {planLabels[company.plan] || company.plan}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {company.company_code && <span className="me-3">{company.company_code}</span>}
                      {company.contact_email && <span>{company.contact_email}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Quick Stats */}
                  <div className="hidden sm:flex items-center gap-5 text-center">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{company.total_compounds}</p>
                      <p className="text-[10px] text-gray-500">{t('cs_compounds', 'كمبوند')}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{company.total_residents}</p>
                      <p className="text-[10px] text-gray-500">{t('cs_residents', 'ساكن')}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{company.total_families}</p>
                      <p className="text-[10px] text-gray-500">{t('as_families', 'أسرة')}</p>
                    </div>
                  </div>
                  {expandedCompany === company.id ? <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedCompany === company.id && (
                <div className="border-t border-gray-100 px-6 py-5 bg-gray-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Company Details */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{t('cs_company_details', 'تفاصيل الشركة')}</h4>
                      <div className="space-y-2 text-sm">
                        {company.contact_email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <EnvelopeIcon className="w-4 h-4" />
                            <span>{company.contact_email}</span>
                          </div>
                        )}
                        {company.contact_phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <PhoneIcon className="w-4 h-4" />
                            <span>{company.contact_phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600">
                          <CalendarIcon className="w-4 h-4" />
                          <span>{t('od_created', 'تاريخ الإنشاء')}: {company.created_at ? new Date(company.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US') : '-'}</span>
                        </div>
                        {company.subscription_end && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{t('cs_sub_ends', 'ينتهي في')}: {new Date(company.subscription_end).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</span>
                          </div>
                        )}
                      </div>

                      {/* Compounds List */}
                      {company.compounds && company.compounds.length > 0 && (
                        <div className="mt-4">
                          <h5 className="font-medium text-gray-800 mb-2 text-sm">{t('cs_compounds_list', 'المجمعات السكنية التابعة')}</h5>
                          <div className="space-y-1">
                            {company.compounds.map((c, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm bg-white rounded-lg px-3 py-2 border border-gray-100">
                                <HomeModernIcon className="w-4 h-4 text-blue-500" />
                                <span className="text-gray-700">{c.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Send Offer / Gift */}
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <h5 className="font-medium text-gray-800 mb-2 text-sm">{t('cs_send_offer', 'إرسال عرض أو هدية')}</h5>
                        <div className="space-y-2">
                          <input id={`offer-msg-${company.id}`} placeholder={t('cs_offer_text', 'نص العرض أو الهدية...')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                          <div className="flex gap-2">
                            <button onClick={async () => {
                              const msg = document.getElementById(`offer-msg-${company.id}`)?.value;
                              if (!msg) return toast.error(t('cs_enter_offer', 'أدخل نص العرض'));
                              try {
                                await axios.post(`${API}/notifications/send-custom-email`, {
                                  to_email: company.contact_email,
                                  subject: `عرض خاص - HomeMe`,
                                  message: msg,
                                }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                                toast.success(t('cs_offer_sent', 'تم إرسال العرض'));
                                document.getElementById(`offer-msg-${company.id}`).value = '';
                              } catch { toast.error(t('sa_failed', 'فشل')); }
                            }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-500">
                              <EnvelopeIcon className="w-3.5 h-3.5" />
                              {t('cs_send_email_offer', 'إرسال بالإيميل')}
                            </button>
                            <button onClick={() => { setActionModal({ companyId: company.id, type: 'add_ad', companyName: company.name, compoundIds: (company.compounds || []).map(c => c.id) }); setModalValue(''); setModalNote(''); }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 border border-amber-200">
                              {t('cs_add_ad', 'إضافة إعلان للشركة')}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Company Ads Management */}
                      {companyAds.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <h5 className="font-medium text-gray-800 mb-2 text-sm">{t('cs_company_ads', 'إعلانات الشركة')} ({companyAds.length})</h5>
                          <div className="space-y-2">
                            {companyAds.map(ad => {
                              const posLabels = { banner: t('sa_pos_banner','بانر'), sidebar: t('sa_pos_sidebar','جانبي'), inline: t('sa_pos_inline','داخلي'), dashboard: t('sa_pos_dashboard','لوحة التحكم') };
                              return (
                                <div key={ad.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-gray-900 text-xs">{ad.title}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${ad.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                          {ad.is_active ? t('sp_active','نشط') : t('sp_inactive','معطل')}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-100 text-blue-600">{posLabels[ad.position] || ad.position}</span>
                                        {ad.dimensions && <span className="px-1.5 py-0.5 rounded text-[9px] bg-gray-100 text-gray-600">{ad.dimensions}</span>}
                                        {ad.image_url && <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-100 text-indigo-600">{t('cs_ad_image', 'صورة')}</span>}
                                        {ad.image_url && ad.image_url.match(/\.(mp4|mov|webm)$/i) && <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-100 text-rose-600">{t('cs_ad_video', 'فيديو')}</span>}
                                      </div>
                                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400 flex-wrap">
                                        {ad.is_gift ? (
                                          <span className="text-pink-500 font-medium">{t('ad_gift', 'هدية')}</span>
                                        ) : ad.ad_value > 0 ? (
                                          <span className="text-emerald-600 font-medium">{ad.ad_value.toLocaleString()} {t('sm_egp', 'ج.م')}</span>
                                        ) : null}
                                        {ad.start_date && <span>{t('ad_start_date', 'بداية')}: {ad.start_date}</span>}
                                        {ad.end_date && <span>{t('ad_end_date', 'نهاية')}: {ad.end_date}</span>}
                                        <span>{t('ad_views', 'مشاهدات')}: {ad.views || 0}</span>
                                        <span>{t('ad_clicks', 'نقرات')}: {ad.clicks || 0}</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                      <button onClick={async () => {
                                        try { await axios.put(`${API}/ads/${ad.id}/toggle`, {}, getHeaders()); toast.success(t('sa_updated', 'تم')); fetchCompanyAds((company.compounds || []).map(c => c.id)); } catch { toast.error(t('sa_failed', 'فشل')); }
                                      }} className={`px-2 py-1 text-[10px] rounded ${ad.is_active ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                        {ad.is_active ? t('sp_deactivate','إيقاف') : t('sp_activate','تفعيل')}
                                      </button>
                                      <button onClick={async () => {
                                        if (!window.confirm(t('sa_confirm_delete', 'هل أنت متأكد؟'))) return;
                                        try { await axios.delete(`${API}/ads/${ad.id}`, getHeaders()); toast.success(t('sa_deleted', 'تم الحذف')); fetchCompanyAds((company.compounds || []).map(c => c.id)); } catch { toast.error(t('sa_failed', 'فشل')); }
                                      }} className="px-2 py-1 text-[10px] bg-red-100 text-red-600 rounded">
                                        {t('sa_delete', 'حذف')}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{t('cs_actions', 'إجراءات')}</h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => handleAction(company.id, 'renew', { months: 12 })}
                          className="w-full flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors"
                          data-testid={`renew-year-${company.id}`}
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                          {t('cs_renew_year', 'تجديد لسنة')}
                        </button>

                        <div className="grid grid-cols-3 gap-2">
                          <button onClick={() => handleAction(company.id, 'renew', { months: 6 })}
                            className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200">
                            {t('cs_renew_6m', 'تجديد 6 شهور')}
                          </button>
                          <button onClick={() => handleAction(company.id, 'renew', { months: 3 })}
                            className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200">
                            {t('cs_renew_3m', 'تجديد 3 شهور')}
                          </button>
                          <button onClick={() => { setActionModal({ companyId: company.id, type: 'extend' }); setModalValue('30'); setModalNote(''); }}
                            className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200">
                            {t('cs_custom_extend', 'تمديد مخصص')}
                          </button>
                        </div>

                        {/* Apply Coupon */}
                        <button onClick={() => { setActionModal({ companyId: company.id, type: 'coupon' }); setModalValue(''); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 bg-pink-50 text-pink-700 rounded-lg text-sm font-medium hover:bg-pink-100 border border-pink-200 transition-colors"
                          data-testid={`apply-coupon-${company.id}`}>
                          <TicketIcon className="w-4 h-4" />
                          {t('cs_apply_coupon', 'تطبيق كوبون خصم')}
                        </button>

                        {/* Update Price */}
                        <button onClick={() => { setActionModal({ companyId: company.id, type: 'price' }); setModalValue(String(company.plan_price || 0)); setModalNote(''); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 border border-amber-200 transition-colors"
                          data-testid={`update-price-${company.id}`}>
                          <CurrencyDollarIcon className="w-4 h-4" />
                          {t('cs_update_price', 'تعديل السعر')}
                          <span className="ms-auto text-xs text-amber-500">{(company.plan_price || 0).toLocaleString()} {t('sm_egp', 'ج.م')}</span>
                        </button>

                        {company.is_active ? (
                          <button
                            onClick={() => { if (window.confirm(t('cs_confirm_suspend', 'هل أنت متأكد من إيقاف الاشتراك؟'))) handleAction(company.id, 'suspend'); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-200 transition-colors"
                          >
                            <NoSymbolIcon className="w-4 h-4" />
                            {t('cs_suspend', 'إيقاف الاشتراك')}
                          </button>
                        ) : (
                          <button onClick={() => handleAction(company.id, 'activate')}
                            className="w-full flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100 border border-emerald-200 transition-colors">
                            <CheckCircleIcon className="w-4 h-4" />
                            {t('cs_activate', 'تفعيل الاشتراك')}
                          </button>
                        )}

                        {/* Change Plan */}
                        <div className="pt-2 border-t border-gray-200">
                          <label className="block text-xs text-gray-500 mb-1">{t('cs_change_plan', 'تغيير الخطة')}</label>
                          <select value={company.plan}
                            onChange={e => handleAction(company.id, 'change_plan', { plan: e.target.value })}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                            <option value="company_startup">{planLabels.company_startup}</option>
                            <option value="company_business">{planLabels.company_business}</option>
                            <option value="company_enterprise">{planLabels.company_enterprise}</option>
                          </select>
                        </div>

                        {/* Applied Coupon Info */}
                        {company.applied_coupon && (
                          <div className="mt-1 px-3 py-2 bg-pink-50 rounded-lg text-xs text-pink-600 flex items-center gap-1">
                            <TicketIcon className="w-3 h-3" />
                            {t('cs_coupon_applied', 'كوبون مطبّق')}: <strong>{company.applied_coupon}</strong>
                            {company.discount_desc && <span className="text-pink-400 ms-1">({company.discount_desc})</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setActionModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl" dir={isRTL ? 'rtl' : 'ltr'} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">
              {actionModal.type === 'coupon' && t('cs_apply_coupon', 'تطبيق كوبون خصم')}
              {actionModal.type === 'price' && t('cs_update_price', 'تعديل السعر')}
              {actionModal.type === 'extend' && t('cs_custom_extend', 'تمديد مخصص')}
              {actionModal.type === 'add_ad' && `${t('cs_add_ad', 'إضافة إعلان')} - ${actionModal.companyName || ''}`}
            </h3>

            {actionModal.type === 'coupon' && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('cs_coupon_code', 'كود الكوبون')}</label>
                <input value={modalValue} onChange={e => setModalValue(e.target.value.toUpperCase())}
                  placeholder="WELCOME20" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none uppercase"
                  data-testid="modal-coupon-input" />
              </div>
            )}

            {actionModal.type === 'price' && (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('cs_new_price', 'السعر الجديد (ج.م)')}</label>
                  <input type="number" min="0" value={modalValue} onChange={e => setModalValue(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    data-testid="modal-price-input" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('cs_note', 'ملاحظة (اختياري)')}</label>
                  <input value={modalNote} onChange={e => setModalNote(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
              </>
            )}

            {actionModal.type === 'extend' && (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('cs_days_count', 'عدد الأيام')}</label>
                  <input type="number" min="1" value={modalValue} onChange={e => setModalValue(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    data-testid="modal-days-input" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('cs_note', 'ملاحظة (اختياري)')}</label>
                  <input value={modalNote} onChange={e => setModalNote(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
              </>
            )}

            {actionModal.type === 'add_ad' && (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('sa_title', 'عنوان الإعلان')}</label>
                  <input value={modalValue} onChange={e => setModalValue(e.target.value)} placeholder={t('cs_ad_title_ph', 'عرض خاص لشركة...')}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('sa_description', 'الوصف')}</label>
                  <textarea value={modalNote} onChange={e => setModalNote(e.target.value)} rows="2"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none resize-none" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">{t('sa_position', 'الموقع')}</label>
                    <select id="ad-position" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
                      <option value="dashboard">{t('sa_pos_dashboard', 'لوحة التحكم')}</option>
                      <option value="banner">{t('sa_pos_banner', 'بانر')}</option>
                      <option value="inline">{t('sa_pos_inline', 'داخلي')}</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <input type="checkbox" id="ad-gift" className="w-3.5 h-3.5" />
                      {t('ad_is_gift', 'هدية مجانية')}
                    </label>
                    <input type="number" id="ad-value" min="0" defaultValue="0" placeholder={t('ad_value', 'القيمة')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={async () => {
                if (actionModal.type === 'coupon') handleAction(actionModal.companyId, 'apply_coupon', { coupon_code: modalValue });
                if (actionModal.type === 'price') handleAction(actionModal.companyId, 'update_price', { price: parseFloat(modalValue), note: modalNote });
                if (actionModal.type === 'extend') handleAction(actionModal.companyId, 'extend', { days: parseInt(modalValue), note: modalNote });
                if (actionModal.type === 'add_ad') {
                  try {
                    await axios.post(`${API}/ads`, {
                      title: modalValue,
                      description: modalNote,
                      position: document.getElementById('ad-position')?.value || 'dashboard',
                      is_gift: document.getElementById('ad-gift')?.checked || false,
                      ad_value: parseFloat(document.getElementById('ad-value')?.value) || 0,
                      target_compounds: actionModal.compoundIds || [],
                    }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                    toast.success(t('cs_ad_created', 'تم إنشاء الإعلان'));
                  } catch { toast.error(t('sa_failed', 'فشل')); }
                }
                setActionModal(null);
              }}
                disabled={!modalValue.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-40 transition-colors"
                data-testid="modal-confirm">{t('cs_confirm', 'تأكيد')}</button>
              <button onClick={() => setActionModal(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">{t('cs_cancel', 'إلغاء')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySubscriptions;
