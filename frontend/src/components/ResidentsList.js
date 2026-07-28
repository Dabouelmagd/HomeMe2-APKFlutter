import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  UserGroupIcon, 
  MagnifyingGlassIcon,
  HomeIcon,
  PhoneIcon,
  EnvelopeIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import CreateResidentModal from './CreateResidentModal';
import BulkImportResidentsModal from './BulkImportResidentsModal';
import EditResidentModal from './EditResidentModal';
import PageHeader from './shared/PageHeader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ResidentsList = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  
  const [residents, setResidents] = useState([
    // Test data
    {
      id: '1',
      name: 'Test User',
      email: 'test@homeme.com',
      phone: '+1234567891',
      unit_number: 'TEST001',
      unit_id: 'test-unit-1',
      relationship: 'head',
      active: true
    }
  ]);
  
  const [filteredResidents, setFilteredResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editResident, setEditResident] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [units] = useState([{ id: 'test-unit-1', unit_number: 'TEST001' }]);

  useEffect(() => {
    loadResidentsData();
  }, []);

  useEffect(() => {
    filterResidents();
  }, [searchQuery, residents, selectedUnit, sortOrder]);

  const loadResidentsData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data && response.data.users) {
        // Normalize: map users fields to resident fields
        const mapped = response.data.users.map(u => ({
          ...u,
          name: u.full_name || u.username || '',
          id: u.id,
        }));
        setResidents(mapped);
      }
    } catch (error) {
      console.error('Failed to load residents:', error);
      // Try fallback
      try {
        const fallback = await axios.get(`${API}/family-members`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (fallback.data?.family_members) {
          setResidents(fallback.data.family_members);
        }
      } catch (e2) {
        console.error('Fallback also failed:', e2);
      }
    } finally {
      setLoading(false);
    }
  };

  const filterResidents = () => {
    let filtered = [...residents];
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(resident => {
        const name = (resident.full_name || resident.name || '').toLowerCase();
        const q = searchQuery.toLowerCase();
        return name.includes(q) ||
          resident.username?.toLowerCase().includes(q) ||
          resident.phone?.includes(searchQuery) ||
          resident.email?.toLowerCase().includes(q) ||
          resident.unit_number?.toLowerCase().includes(q);
      });
    }
    
    if (selectedUnit) {
      filtered = filtered.filter(resident => resident.unit_id === selectedUnit);
    }
    
    // Sort
    if (sortOrder === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortOrder === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (sortOrder === 'unit_number') {
      filtered.sort((a, b) => (a.unit_number || '').localeCompare(b.unit_number || ''));
    }
    
    setFilteredResidents(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'} data-testid="residents-list-page">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          theme="blue"
          icon={UserGroupIcon}
          badge={t('residents_management', 'إدارة السكان')}
          title={t('residents_list')}
          subtitle={t('view_all_residential')}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowBulkImport(true)}
                data-testid="open-bulk-import-modal"
                className="bg-white border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all text-sm font-bold"
                title={t('bulk_import_residents_hint', 'استيراد مئات السكان من ملف Excel/CSV دفعة واحدة')}
              >
                <ArrowUpTrayIcon className="h-5 w-5" />
                <span>{t('bulk_import_residents', 'استيراد CSV / Excel')}</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                data-testid="open-create-resident-modal"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl text-sm font-bold"
              >
                <UserPlusIcon className="h-5 w-5" />
                <span>{t('add_resident_family', 'إضافة ساكن جديد')}</span>
              </button>
            </div>
          }
          testId="residents-page-header"
        />
        {/* 💡 Onboarding tip — surface the bulk-import feature for admins
            who haven't discovered it. Dismissible & per-user persistent. */}
        {(() => {
          const dismissed = (() => { try { return localStorage.getItem('residents_tip_csv_dismissed') === '1'; } catch { return false; } })();
          if (dismissed) return null;
          return (
            <div className="mb-6 rounded-xl border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 flex items-start gap-3" data-testid="bulk-import-tip-card">
              <div className="text-2xl">💡</div>
              <div className="flex-1">
                <h3 className="font-bold text-emerald-900 text-sm mb-1">
                  {t('csv_tip_title', 'هل عندك ملف Excel للسكان؟')}
                </h3>
                <p className="text-xs text-emerald-700 mb-2">
                  {t('csv_tip_desc', 'استخدمي زرّ "استيراد CSV / Excel" أعلى الصفحة لإضافة مئات السكان دفعة واحدة بدلاً من إدخال كل واحد يدوياً. النظام يتحقق تلقائياً من التكرارات ويرسل بيانات الدخول لكل ساكن.')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBulkImport(true)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                    data-testid="bulk-import-tip-try"
                  >
                    {t('csv_tip_try', 'جرّب الاستيراد دلوقتي ←')}
                  </button>
                  <button
                    onClick={() => { try { localStorage.setItem('residents_tip_csv_dismissed', '1'); } catch {} window.location.reload(); }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                    data-testid="bulk-import-tip-dismiss"
                  >
                    {t('csv_tip_dismiss', 'فهمت، تخطي')}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
        {/* Enhanced Search and Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-4 rtl:right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('search_resident')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 rtl:pr-12 pr-4 rtl:pl-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="px-6 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-white transition-all"
            >
              <option value="">{t('all_units')}</option>
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>{unit.unit_number}</option>
              ))}
            </select>
          </div>
          
          {/* Sort Options */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">{t('total_units', 'Total Units')}:</span>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-md">
                {residents.length}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">{t('sort_by', 'Sort by')}:</span>
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              >
                <option value="newest">{t('newest_first', 'Newest First')}</option>
                <option value="oldest">{t('oldest_first', 'Oldest First')}</option>
                <option value="unit_number">{t('unit_number', 'Unit Number')}</option>
              </select>
            </div>
          </div>
          
          {/* Tip Banner */}
          <div className="mt-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 text-sm flex items-center gap-2">
              <span className="text-2xl">💡</span>
              <span className="font-medium">{t('use_add_resident_tip')}</span>
            </p>
          </div>
        </div>

        {/* Residents Grid - Card Layout */}
        {filteredResidents.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full p-6 w-24 h-24 mx-auto mb-6">
              <UserGroupIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('no_results', 'لا توجد نتائج')}</h3>
            <p className="text-gray-600 mb-6">{t('no_residents_found', 'لم يتم العثور على سكان')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResidents.map((resident) => (
              <div
                key={resident.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                {/* Card Header with Gradient */}
                <div className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                      <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                        <span className="text-2xl font-bold text-white">
                          {resident.name?.charAt(0)?.toUpperCase() || '؟'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {resident.name || `${t('resident', 'مقيم')}`}
                        </h3>
                        <span className="inline-block bg-white/20 text-white text-xs px-3 py-1 rounded-full mt-1 font-semibold">
                          {t('family_head', 'رب الأسرة')}
                        </span>
                      </div>
                    </div>
                    <span className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-full font-bold">
                      {t('active', 'Active')}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4">
                  {/* Unit Info */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <HomeIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-medium">{t('unit', 'Unit')}</p>
                      <p className="text-sm font-bold text-gray-900">
                        {resident.unit_number || 'TEST001'}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  {resident.email && (
                    <div className="flex items-center gap-3">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-700">{resident.email}</span>
                    </div>
                  )}
                  
                  {resident.phone && (
                    <div className="flex items-center gap-3">
                      <PhoneIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-700">{resident.phone}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200">
                    <button 
                      onClick={() => navigate(`/app/residents/${resident.id}`)}
                      className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-blue-50 transition-colors group"
                      data-testid={`view-profile-${resident.id}`}
                    >
                      <EyeIcon className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
                      <span className="text-xs font-medium text-gray-600 group-hover:text-blue-600">{t('view_profile', 'عرض الملف')}</span>
                    </button>
                    
                    <button
                      onClick={() => setEditResident(resident)}
                      className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-green-50 transition-colors group">
                      <PencilIcon className="h-5 w-5 text-gray-600 group-hover:text-green-600" />
                      <span className="text-xs font-medium text-gray-600 group-hover:text-green-600">{t('edit', 'تعديل')}</span>
                    </button>
                    
                    <button
                      onClick={() => setDeleteConfirm(resident)}
                      className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-red-50 transition-colors group">
                      <TrashIcon className="h-5 w-5 text-gray-600 group-hover:text-red-600" />
                      <span className="text-xs font-medium text-gray-600 group-hover:text-red-600">{t('delete', 'حذف')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateResidentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); window.location.reload(); }}
        />
      )}
      {showBulkImport && (
        <BulkImportResidentsModal
          onClose={() => setShowBulkImport(false)}
          onImported={() => { setShowBulkImport(false); window.location.reload(); }}
        />
      )}

      {editResident && (
        <EditResidentModal
          resident={editResident}
          onClose={() => setEditResident(null)}
          onUpdated={() => { setEditResident(null); window.location.reload(); }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrashIcon className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">تأكيد الحذف</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                هل تريد حذف <strong className="text-gray-800 dark:text-gray-200">{deleteConfirm.full_name}</strong>؟
                <br />هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors">
                {deleting ? 'جارٍ الحذف...' : 'نعم، احذف'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentsList;
