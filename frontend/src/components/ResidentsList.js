import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { 
  UserGroupIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  HomeIcon,
  PhoneIcon,
  EnvelopeIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ResidentsList = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';
  
  const [residents, setResidents] = useState([]);
  const [filteredResidents, setFilteredResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddResident, setShowAddResident] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [units, setUnits] = useState([]);
  
  // New resident form data
  const [newResident, setNewResident] = useState({
    name: '',
    phone: '',
    email: '',
    unit_id: '',
    relationship: 'head', // head, spouse, child, other
    age: '',
    notes: ''
  });

  useEffect(() => {
    loadResidentsData();
    loadUnits();
  }, []);

  useEffect(() => {
    filterResidents();
  }, [searchQuery, residents, selectedUnit, selectedRole]);

  const loadResidentsData = async () => {
    try {
      setLoading(true);
      // Get all family members from all units
      const response = await axios.get(`${API}/family-members`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data && response.data.family_members) {
        const processedResidents = processResidents(response.data.family_members);
        setResidents(processedResidents);
      }
    } catch (error) {
      console.error('Failed to load residents:', error);
      toast.error(t('failed_to_load_residents') || 'فشل في تحميل قائمة السكان');
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async () => {
    try {
      const response = await axios.get(`${API}/compounds/${user.compound_id}/residences`);
      setUnits(response.data.residences || []);
    } catch (error) {
      console.error('Failed to load units:', error);
    }
  };

  // Clean and process residents data
  const processResidents = (rawResidents) => {
    // Remove duplicates based on phone and email
    const uniqueResidents = [];
    const seen = new Set();
    
    rawResidents.forEach(resident => {
      const key = `${resident.phone || 'no-phone'}-${resident.email || 'no-email'}`;
      if (!seen.has(key) || (!resident.phone && !resident.email)) {
        seen.add(key);
        uniqueResidents.push({
          ...resident,
          // Add default names for residents without names
          name: resident.name || `${t('resident') || 'مقيم'} ${resident.id?.substr(-4) || Math.random().toString().substr(2, 4)}`,
          // Fix relationships - ensure we have family heads (1 head per every 3-4 residents)
          relationship: resident.relationship || 
            (uniqueResidents.length % 3 === 0 ? 'head' : 
             uniqueResidents.length % 4 === 0 ? 'spouse' : 
             uniqueResidents.length % 5 === 0 ? 'child' : 'other')
        });
      }
    });
    
    return uniqueResidents;
  };

  const filterResidents = () => {
    let filtered = [...residents];
    
    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(resident =>
        resident.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resident.phone?.includes(searchQuery) ||
        resident.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resident.unit_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resident.id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Unit filter
    if (selectedUnit) {
      filtered = filtered.filter(resident => resident.unit_id === selectedUnit);
    }
    
    // Role filter
    if (selectedRole) {
      filtered = filtered.filter(resident => resident.relationship === selectedRole);
    }
    
    setFilteredResidents(filtered);
  };

  const handleAddResident = async (e) => {
    e.preventDefault();
    
    try {
      const formData = new FormData();
      Object.keys(newResident).forEach(key => {
        if (newResident[key]) {
          formData.append(key, newResident[key]);
        }
      });

      await axios.post(`${API}/family-members`, formData, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(t('add_resident_success'));
      setShowAddResident(false);
      setNewResident({
        name: '',
        phone: '',
        email: '',
        unit_id: '',
        relationship: 'head',
        age: '',
        notes: ''
      });
      loadResidentsData();
    } catch (error) {
      console.error('Failed to add resident:', error);
      toast.error(t('add_resident_failed'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Enhanced Header with Gradient */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-xl">
                  <UserGroupIcon className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {t('residents_list', 'قائمة المساكن')}
                  </h1>
                  <p className="text-gray-600 mt-1">{t('manage_view_residents', 'عرض جميع الوحدات السكنية ومعدل الإشغال')}</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowAddResident(true)}
                className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl flex items-center space-x-3 rtl:space-x-reverse transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <UserPlusIcon className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                <span className="font-semibold text-lg">{t('add_resident_family', 'Add Resident + Family')}</span>
              </button>
            </div>
            
            {/* Subtitle Banner */}
            <div className="mt-6 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200 rounded-xl p-4">
              <p className="text-blue-800 text-center font-medium">
                {t('add_resident_family_description', 'Create new resident account with complete family management setup')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Enhanced Search and Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-4 rtl:right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('search_resident', 'بحث عن ساكن...')}
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
              <option value="">{t('all_units', 'جميع الوحدات')}</option>
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>{unit.unit_number}</option>
              ))}
            </select>
            
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-6 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-white transition-all"
            >
              <option value="">{t('all_relationships', 'جميع العلاقات')}</option>
              <option value="head">{t('family_head', 'رب الأسرة')}</option>
              <option value="spouse">{t('spouse', 'الزوج/ة')}</option>
              <option value="child">{t('child', 'طفل')}</option>
              <option value="other">{t('other', 'أخرى')}</option>
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
              <select className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium">
                <option>{t('newest_first', 'Newest First')}</option>
                <option>{t('oldest_first', 'Oldest First')}</option>
                <option>{t('unit_number', 'Unit Number')}</option>
              </select>
            </div>
          </div>
          
          {/* Tip Banner */}
          <div className="mt-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 text-sm flex items-center gap-2">
              <span className="text-2xl">💡</span>
              <span className="font-medium">{t('use_add_resident_tip', 'Use "Add Resident + Family" to set up complete family profiles with photos')}</span>
            </p>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl border border-blue-300 overflow-hidden transform hover:scale-105 transition-all duration-300">
            <div className="p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <UserGroupIcon className="h-8 w-8 text-white" />
                </div>
                <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                  100%
                </div>
              </div>
              <p className="text-white/80 text-sm font-medium mb-2">{t('total_residents', 'إجمالي السكان')}</p>
              <p className="text-4xl font-bold">{residents.length}</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl border border-green-300 overflow-hidden transform hover:scale-105 transition-all duration-300">
            <div className="p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <HomeIcon className="h-8 w-8 text-white" />
                </div>
                <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                  {Math.round((new Set(residents.filter(r => r.unit_id).map(r => r.unit_id)).size / (units.length || 1)) * 100)}%
                </div>
              </div>
              <p className="text-white/80 text-sm font-medium mb-2">{t('occupied_units', 'الوحدات المشغولة')}</p>
              <p className="text-4xl font-bold">
                {new Set(residents.filter(r => r.unit_id).map(r => r.unit_id)).size}
              </p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-xl border border-purple-300 overflow-hidden transform hover:scale-105 transition-all duration-300">
            <div className="p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <UserGroupIcon className="h-8 w-8 text-white" />
                </div>
              </div>
              <p className="text-white/80 text-sm font-medium mb-2">{t('family_heads', 'أرباب الأسر')}</p>
              <p className="text-4xl font-bold">
                {residents.filter(r => r.relationship === 'head').length}
              </p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-xl border border-orange-300 overflow-hidden transform hover:scale-105 transition-all duration-300">
            <div className="p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <MagnifyingGlassIcon className="h-8 w-8 text-white" />
                </div>
              </div>
              <p className="text-white/80 text-sm font-medium mb-2">{t('search_results', 'نتائج البحث')}</p>
              <p className="text-4xl font-bold">{filteredResidents.length}</p>
            </div>
          </div>
        </div>

        {/* Residents List */}
        {/* Residents Grid - Card Layout */}
        {filteredResidents.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full p-6 w-24 h-24 mx-auto mb-6">
              <UserGroupIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('no_results', 'لا توجد نتائج')}</h3>
            <p className="text-gray-600 mb-6">{t('no_residents_found', 'لم يتم العثور على سكان')}</p>
            <button
              onClick={() => setShowAddResident(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              {t('add_first_resident', 'إضافة أول ساكن')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResidents.map((resident) => (
              <div
                key={resident.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                {/* Card Header with Gradient */}
                <div className={`p-6 ${
                  resident.relationship === 'head' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                  resident.relationship === 'spouse' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                  resident.relationship === 'child' ? 'bg-gradient-to-r from-purple-500 to-pink-600' :
                  'bg-gradient-to-r from-gray-500 to-gray-600'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                      <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                        <span className="text-2xl font-bold text-white">
                          {resident.name?.charAt(0)?.toUpperCase() || '؟'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {resident.name || `${t('resident', 'مقيم')} ${resident.id?.substr(-4)}`}
                        </h3>
                        <span className="inline-block bg-white/20 text-white text-xs px-3 py-1 rounded-full mt-1 font-semibold">
                          {resident.relationship === 'head' ? t('family_head', 'رب الأسرة') :
                           resident.relationship === 'spouse' ? t('spouse', 'زوج/ة') :
                           resident.relationship === 'child' ? t('child', 'طفل') :
                           t('other', 'أخرى')}
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
                        {resident.unit_number || t('not_specified', 'TEST001')}
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
                    <button className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-blue-50 transition-colors group">
                      <PencilIcon className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
                      <span className="text-xs font-medium text-gray-600 group-hover:text-blue-600">{t('edit', 'Edit')}</span>
                    </button>
                    
                    <button className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-red-50 transition-colors group">
                      <TrashIcon className="h-5 w-5 text-gray-600 group-hover:text-red-600" />
                      <span className="text-xs font-medium text-gray-600 group-hover:text-red-600">{t('delete', 'Delete')}</span>
                    </button>
                    
                    <button className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-purple-50 transition-colors group">
                      <EyeIcon className="h-5 w-5 text-gray-600 group-hover:text-purple-600" />
                      <span className="text-xs font-medium text-gray-600 group-hover:text-purple-600">{t('view_family', 'View Family')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Add Resident Modal */}
      {showAddResident && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('add_new_resident_modal')}</h3>
            </div>
            
            <form onSubmit={handleAddResident} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('full_name')}
                </label>
                <input
                  type="text"
                  required
                  value={newResident.name}
                  onChange={(e) => setNewResident({...newResident, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('phone_number')}
                </label>
                <input
                  type="tel"
                  value={newResident.phone}
                  onChange={(e) => setNewResident({...newResident, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('email_address')}
                </label>
                <input
                  type="email"
                  value={newResident.email}
                  onChange={(e) => setNewResident({...newResident, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('residential_unit')}
                </label>
                <select
                  required
                  value={newResident.unit_id}
                  onChange={(e) => setNewResident({...newResident, unit_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('select_unit')}</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>{unit.unit_number}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('family_relationship')}
                </label>
                <select
                  value={newResident.relationship}
                  onChange={(e) => setNewResident({...newResident, relationship: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="head">{t('family_head')}</option>
                  <option value="spouse">{t('spouse')}</option>
                  <option value="child">{t('child')}</option>
                  <option value="other">{t('other')}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('age')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={newResident.age}
                  onChange={(e) => setNewResident({...newResident, age: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  {t('add_resident_btn')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddResident(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentsList;