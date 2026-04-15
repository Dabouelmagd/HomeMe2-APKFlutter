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
                onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
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
                    </div>

                    {/* Actions */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{t('cs_actions', 'إجراءات')}</h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => handleAction(company.id, 'renew', { months: 12 })}
                          className="w-full flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors"
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                          {t('cs_renew_year', 'تجديد لسنة')}
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleAction(company.id, 'renew', { months: 6 })}
                            className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200"
                          >
                            {t('cs_renew_6m', 'تجديد 6 شهور')}
                          </button>
                          <button
                            onClick={() => handleAction(company.id, 'renew', { months: 3 })}
                            className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200"
                          >
                            {t('cs_renew_3m', 'تجديد 3 شهور')}
                          </button>
                        </div>

                        {company.is_active ? (
                          <button
                            onClick={() => { if (window.confirm(t('cs_confirm_suspend', 'هل أنت متأكد من إيقاف الاشتراك؟'))) handleAction(company.id, 'suspend'); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-200 transition-colors"
                          >
                            <NoSymbolIcon className="w-4 h-4" />
                            {t('cs_suspend', 'إيقاف الاشتراك')}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(company.id, 'activate')}
                            className="w-full flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                            {t('cs_activate', 'تفعيل الاشتراك')}
                          </button>
                        )}

                        {/* Change Plan */}
                        <div className="pt-2 border-t border-gray-200">
                          <label className="block text-xs text-gray-500 mb-1">{t('cs_change_plan', 'تغيير الخطة')}</label>
                          <select
                            value={company.plan}
                            onChange={e => handleAction(company.id, 'change_plan', { plan: e.target.value })}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          >
                            <option value="company_startup">{planLabels.company_startup}</option>
                            <option value="company_business">{planLabels.company_business}</option>
                            <option value="company_enterprise">{planLabels.company_enterprise}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanySubscriptions;
