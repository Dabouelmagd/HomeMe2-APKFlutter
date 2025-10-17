import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserGroupIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ResidentsList = () => {
  const { t, i18n } = useTranslation();
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/residents`);
      setResidents(response.data);
    } catch (error) {
      console.error('Error fetching residents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResidents = residents.filter(resident =>
    resident.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.phone?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
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
                    {t('residents_list', 'Residents List')}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {t('manage_residents_subtitle', 'Manage and view all compound residents')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('search_residents', 'Search residents...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Residents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResidents.length > 0 ? (
            filteredResidents.map((resident) => (
              <div key={resident.id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center space-x-4 rtl:space-x-reverse mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {resident.full_name?.charAt(0)?.toUpperCase() || 'R'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{resident.full_name}</h3>
                    <p className="text-sm text-gray-500">Unit {resident.unit_number}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {resident.email && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Email:</span> {resident.email}
                    </p>
                  )}
                  {resident.phone && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Phone:</span> {resident.phone}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Role:</span> {resident.role || 'Resident'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t('no_residents_found', 'No residents found')}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {t('no_residents_description', 'No residents match your search criteria.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResidentsList;