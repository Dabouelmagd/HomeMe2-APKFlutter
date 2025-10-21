import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
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
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ResidentsList = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
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
      const response = await axios.get(`${API}/family-members`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data && response.data.family_members) {
        setResidents(response.data.family_members);
      }
    } catch (error) {
      console.error('Failed to load residents:', error);
      // Keep test data if API fails
    } finally {
      setLoading(false);
    }
  };

  const filterResidents = () => {
    let filtered = [...residents];
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(resident =>
        resident.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resident.phone?.includes(searchQuery) ||
        resident.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resident.unit_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
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
                    {t('residents_list')}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {t('view_all_residential')}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => window.location.href = '/app/add-family-member'}
                className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl flex items-center space-x-3 rtl:space-x-reverse transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <UserPlusIcon className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                <span className="font-semibold text-lg">{t('add_resident_family')}</span>
              </button>
            </div>
            
            {/* Subtitle Banner */}
            <div className="mt-6 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200 rounded-xl p-4">
              <p className="text-blue-800 text-center font-medium">
                {t('create_new_resident')}
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
              <option value="">{t('all_units', 'جميع الوحدات')}</option>
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
              <span className="font-medium">{t('use_add_resident_tip', 'Use "Add Resident + Family" to set up complete family profiles with photos')}</span>
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
  );
};

export default ResidentsList;
