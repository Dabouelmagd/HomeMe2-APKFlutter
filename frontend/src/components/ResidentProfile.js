import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  UserIcon,
  HomeIcon,
  PhoneIcon,
  EnvelopeIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentCheckIcon,
  CreditCardIcon,
  UserGroupIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CalendarIcon,
  EyeIcon,
  ArrowLeftIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ResidentProfile = () => {
  const { residentId } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('desc');
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [residentId, sortOrder]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/residents/${residentId}/profile?sort_order=${sortOrder}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(t('failed_load_profile', 'فشل في تحميل الملف الشخصي'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await axios.get(`${API}/residents/${residentId}/export-pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `resident_${data?.resident?.full_name || 'report'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('pdf_exported', 'تم تصدير التقرير بنجاح'));
    } catch (error) {
      toast.error(t('failed_export_pdf', 'فشل في تصدير التقرير'));
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr?.toString()?.slice(0, 10) || '-' : d.toLocaleDateString('ar-EG');
  };

  const statusColor = (status) => {
    const map = {
      pending: 'bg-amber-100 text-amber-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      checked_in: 'bg-blue-100 text-blue-700',
      checked_out: 'bg-gray-100 text-gray-700',
      confirmed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">{t('resident_not_found', 'لم يتم العثور على المقيم')}</p>
      </div>
    );
  }

  const { resident, family_members, extra_family_members, maintenance_requests, service_bookings, invoices, visitors, activities, summary } = data;
  const allFamilyMembers = [...(family_members || []), ...(extra_family_members || [])];

  const tabs = [
    { id: 'overview', label: t('overview', 'نظرة عامة'), icon: EyeIcon },
    { id: 'family', label: t('family', 'العائلة'), icon: UserGroupIcon, count: summary?.total_family_members },
    { id: 'maintenance', label: t('maintenance', 'الصيانة'), icon: WrenchScrewdriverIcon, count: summary?.total_maintenance },
    { id: 'bookings', label: t('bookings', 'الحجوزات'), icon: ClipboardDocumentCheckIcon, count: summary?.total_bookings },
    { id: 'financial', label: t('financial', 'المالية'), icon: CreditCardIcon, count: summary?.total_invoices },
    { id: 'visitors', label: t('visitors', 'الزوار'), icon: UserIcon, count: summary?.total_visitors },
    { id: 'activities', label: t('activities', 'النشاطات'), icon: DocumentTextIcon, count: summary?.total_activities },
  ];

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white" data-testid="resident-profile">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="h-5 w-5" />
            <span>{t('back', 'رجوع')}</span>
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              data-testid="sort-toggle"
            >
              {sortOrder === 'desc' ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
              {sortOrder === 'desc' ? t('newest_first', 'الأحدث أولاً') : t('oldest_first', 'الأقدم أولاً')}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              data-testid="print-btn"
            >
              <PrinterIcon className="h-4 w-4" />
              {t('print', 'طباعة')}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
              data-testid="export-pdf-btn"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {exporting ? t('exporting', 'جاري التصدير...') : t('export_pdf', 'تصدير PDF')}
            </button>
          </div>
        </div>

        {/* Resident Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
              {resident?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{resident?.full_name}</h1>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1"><HomeIcon className="h-4 w-4" /> {t('unit', 'الوحدة')}: {resident?.unit_number}</span>
                {resident?.email && <span className="flex items-center gap-1"><EnvelopeIcon className="h-4 w-4" /> {resident.email}</span>}
                {resident?.phone && <span className="flex items-center gap-1"><PhoneIcon className="h-4 w-4" /> {resident.phone}</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xl font-bold text-blue-700">{summary?.total_family_members || 0}</p>
                <p className="text-xs text-blue-600">{t('family_members', 'أفراد العائلة')}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xl font-bold text-amber-700">{summary?.open_maintenance || 0}</p>
                <p className="text-xs text-amber-600">{t('open_maintenance', 'صيانة مفتوحة')}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xl font-bold text-green-700">{summary?.total_invoices || 0}</p>
                <p className="text-xs text-green-600">{t('invoices', 'الفواتير')}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-xl font-bold text-purple-700">{summary?.total_visitors || 0}</p>
                <p className="text-xs text-purple-600">{t('visitors', 'الزوار')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto mb-6 print:hidden" data-testid="profile-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              <h3 className="text-lg font-bold text-gray-900">{t('personal_info', 'المعلومات الشخصية')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  [t('full_name', 'الاسم'), resident?.full_name],
                  [t('username', 'اسم المستخدم'), resident?.username],
                  [t('email', 'البريد'), resident?.email],
                  [t('phone', 'الهاتف'), resident?.phone],
                  [t('unit_number', 'رقم الوحدة'), resident?.unit_number],
                  [t('role', 'الدور'), resident?.role],
                  [t('created_date', 'تاريخ الإنشاء'), formatDate(resident?.created_at)],
                ].map(([label, value], i) => (
                  <div key={i} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">{label}</span>
                    <span className="text-sm font-semibold text-gray-900">{value || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Family Members */}
          {activeTab === 'family' && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('family_members', 'أفراد العائلة')} ({allFamilyMembers.length})</h3>
              {allFamilyMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allFamilyMembers.map((member, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{member.full_name}</p>
                        <p className="text-sm text-gray-500">{member.relationship || member.role || '-'}</p>
                        {member.phone && <p className="text-xs text-gray-400">{member.phone}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">{t('no_family_members', 'لا يوجد أفراد عائلة')}</p>
              )}
            </div>
          )}

          {/* Maintenance */}
          {activeTab === 'maintenance' && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('maintenance_requests', 'طلبات الصيانة')} ({maintenance_requests?.length || 0})</h3>
              {maintenance_requests?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600">
                        <th className="p-3 text-right font-medium">{t('title', 'العنوان')}</th>
                        <th className="p-3 text-right font-medium">{t('category', 'التصنيف')}</th>
                        <th className="p-3 text-right font-medium">{t('priority', 'الأولوية')}</th>
                        <th className="p-3 text-right font-medium">{t('status', 'الحالة')}</th>
                        <th className="p-3 text-right font-medium">{t('date', 'التاريخ')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {maintenance_requests.map((m, i) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{m.title}</td>
                          <td className="p-3 text-gray-600">{t(m.category, m.category)}</td>
                          <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(m.priority)}`}>{t(m.priority, m.priority)}</span></td>
                          <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(m.status)}`}>{t(m.status, m.status)}</span></td>
                          <td className="p-3 text-gray-500">{formatDate(m.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">{t('no_maintenance_requests', 'لا توجد طلبات صيانة')}</p>
              )}
            </div>
          )}

          {/* Service Bookings */}
          {activeTab === 'bookings' && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('service_bookings', 'حجوزات الخدمات')} ({service_bookings?.length || 0})</h3>
              {service_bookings?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600">
                        <th className="p-3 text-right font-medium">{t('service', 'الخدمة')}</th>
                        <th className="p-3 text-right font-medium">{t('status', 'الحالة')}</th>
                        <th className="p-3 text-right font-medium">{t('priority', 'الأولوية')}</th>
                        <th className="p-3 text-right font-medium">{t('date', 'التاريخ')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {service_bookings.map((b, i) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{b.service_type || b.description || '-'}</td>
                          <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(b.status)}`}>{t(b.status, b.status)}</span></td>
                          <td className="p-3 text-gray-600">{t(b.priority, b.priority || '-')}</td>
                          <td className="p-3 text-gray-500">{formatDate(b.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">{t('no_bookings', 'لا توجد حجوزات')}</p>
              )}
            </div>
          )}

          {/* Financial */}
          {activeTab === 'financial' && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('financial_obligations', 'الالتزامات المالية')} ({invoices?.length || 0})</h3>
              {invoices?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600">
                        <th className="p-3 text-right font-medium">{t('description', 'الوصف')}</th>
                        <th className="p-3 text-right font-medium">{t('amount', 'المبلغ')}</th>
                        <th className="p-3 text-right font-medium">{t('status', 'الحالة')}</th>
                        <th className="p-3 text-right font-medium">{t('due_date', 'تاريخ الاستحقاق')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv, i) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{inv.description || '-'}</td>
                          <td className="p-3 text-gray-600">{inv.amount || '0'}</td>
                          <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(inv.status)}`}>{t(inv.status, inv.status)}</span></td>
                          <td className="p-3 text-gray-500">{formatDate(inv.due_date || inv.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">{t('no_invoices', 'لا توجد فواتير')}</p>
              )}
            </div>
          )}

          {/* Visitors */}
          {activeTab === 'visitors' && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('visitors', 'الزوار')} ({visitors?.length || 0})</h3>
              {visitors?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600">
                        <th className="p-3 text-right font-medium">{t('visitor_name', 'اسم الزائر')}</th>
                        <th className="p-3 text-right font-medium">{t('visit_purpose', 'الغرض')}</th>
                        <th className="p-3 text-right font-medium">{t('status', 'الحالة')}</th>
                        <th className="p-3 text-right font-medium">{t('visit_date', 'تاريخ الزيارة')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitors.map((v, i) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{v.visitor_name || '-'}</td>
                          <td className="p-3 text-gray-600">{v.purpose || v.visit_purpose || '-'}</td>
                          <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(v.status)}`}>{t(v.status, v.status)}</span></td>
                          <td className="p-3 text-gray-500">{formatDate(v.visit_date || v.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">{t('no_visitors', 'لا يوجد زوار')}</p>
              )}
            </div>
          )}

          {/* Activities */}
          {activeTab === 'activities' && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('unit_activities', 'نشاطات الوحدة')} ({activities?.length || 0})</h3>
              {activities?.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((act, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                        <DocumentTextIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{act.details || act.action}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(act.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">{t('no_activities', 'لا توجد نشاطات')}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResidentProfile;
