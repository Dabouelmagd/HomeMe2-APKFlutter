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

const API = process.env.REACT_APP_BACKEND_URL;

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
  }, [searchQuery, residents]);

  const loadResidentsData = async () => {
    try {
      setLoading(true);
      // Get all family members from all units
      const response = await axios.get(`${API}/family-members`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data && response.data.family_members) {
        setResidents(response.data.family_members);
      }
    } catch (error) {
      console.error('Failed to load residents:', error);
      toast.error('فشل في تحميل قائمة السكان');
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

  const filterResidents = () => {
    if (!searchQuery.trim()) {
      setFilteredResidents(residents);
      return;
    }

    const filtered = residents.filter(resident =>
      resident.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resident.phone?.includes(searchQuery) ||
      resident.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resident.unit_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
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

      toast.success('تم إضافة المقيم بنجاح!');
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
      toast.error('فشل في إضافة المقيم');
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
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">قائمة السكان</h1>
                <p className="text-sm text-gray-500">إدارة وعرض جميع سكان المجمع</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowAddResident(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <UserPlusIcon className="h-5 w-5" />
              <span>إضافة مقيم جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث عن مقيم (الاسم، الهاتف، الإيميل، رقم الوحدة)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">جميع الوحدات</option>
            {units.map(unit => (
              <option key={unit.id} value={unit.id}>{unit.unit_number}</option>
            ))}
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">إجمالي السكان</p>
                <p className="text-2xl font-bold text-gray-900">{residents.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <HomeIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">وحدات مأهولة</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(residents.map(r => r.unit_id)).size}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <UserGroupIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">أرباب الأسر</p>
                <p className="text-2xl font-bold text-gray-900">
                  {residents.filter(r => r.relationship === 'head').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100">
                <MagnifyingGlassIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">نتائج البحث</p>
                <p className="text-2xl font-bold text-gray-900">{filteredResidents.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Residents List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">قائمة السكان</h2>
          </div>
          
          {filteredResidents.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد نتائج</h3>
              <p className="text-gray-500">لم يتم العثور على أي سكان يطابقون البحث</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المقيم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الوحدة السكنية
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      معلومات التواصل
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      العلاقة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      العمر
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredResidents.map((resident) => (
                    <tr key={resident.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {resident.name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900">
                              {resident.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {resident.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <HomeIcon className="h-4 w-4 text-gray-400 ml-2" />
                          <span className="text-sm text-gray-900">
                            {resident.unit_number || 'غير محدد'}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {resident.phone && (
                            <div className="flex items-center text-sm text-gray-900">
                              <PhoneIcon className="h-4 w-4 text-gray-400 ml-2" />
                              {resident.phone}
                            </div>
                          )}
                          {resident.email && (
                            <div className="flex items-center text-sm text-gray-500">
                              <EnvelopeIcon className="h-4 w-4 text-gray-400 ml-2" />
                              {resident.email}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          resident.relationship === 'head' ? 'bg-blue-100 text-blue-800' :
                          resident.relationship === 'spouse' ? 'bg-green-100 text-green-800' :
                          resident.relationship === 'child' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {resident.relationship === 'head' ? 'رب الأسرة' :
                           resident.relationship === 'spouse' ? 'الزوج/ة' :
                           resident.relationship === 'child' ? 'طفل' : 'أخرى'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {resident.age || '-'}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-900">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Resident Modal */}
      {showAddResident && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">إضافة مقيم جديد</h3>
            </div>
            
            <form onSubmit={handleAddResident} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الاسم الكامل
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
                  رقم الهاتف
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
                  البريد الإلكتروني
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
                  الوحدة السكنية
                </label>
                <select
                  required
                  value={newResident.unit_id}
                  onChange={(e) => setNewResident({...newResident, unit_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">اختر الوحدة</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>{unit.unit_number}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  العلاقة بالأسرة
                </label>
                <select
                  value={newResident.relationship}
                  onChange={(e) => setNewResident({...newResident, relationship: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="head">رب الأسرة</option>
                  <option value="spouse">الزوج/ة</option>
                  <option value="child">طفل</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  العمر
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
                  إضافة المقيم
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddResident(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  إلغاء
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