import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { toast } from 'sonner';
import {
  BuildingOfficeIcon,
  PhotoIcon,
  UsersIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CompoundManagement = () => {
  const { user } = useAuth();
  const [compound, setCompound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCompound();
  }, []);

  const fetchCompound = async () => {
    try {
      const response = await axios.get(`${API}/compounds/${user.compound_id}`);
      setCompound(response.data);
    } catch (error) {
      toast.error('Failed to load compound data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.put(
        `${API}/compounds/${user.compound_id}/logo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setCompound(prev => ({
        ...prev,
        logo_url: response.data.logo_url
      }));

      toast.success('Logo uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Compound Management</h1>
        <p className="text-gray-600 mt-2">
          Manage your compound settings and branding
        </p>
      </div>

      {/* Compound Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start space-x-6">
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <div className="relative">
              {compound?.logo_url ? (
                <img
                  src={compound.logo_url}
                  alt="Compound Logo"
                  className="h-24 w-24 rounded-lg object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="h-24 w-24 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <PhotoIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
              
              <label htmlFor="logo-upload" className="absolute inset-0 cursor-pointer">
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <div className="absolute inset-0 rounded-lg bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <PhotoIcon className="h-6 w-6 text-white" />
                </div>
              </label>
              
              {uploading && (
                <div className="absolute inset-0 rounded-lg bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Click to upload logo
            </p>
          </div>

          {/* Compound Details */}
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {compound?.name || 'Compound Name'}
            </h2>
            <p className="text-gray-600 mb-4">
              {compound?.address || 'Compound Address'}
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Compound ID</p>
                <p className="text-lg font-semibold text-gray-900">{compound?.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Created</p>
                <p className="text-lg font-semibold text-gray-900">
                  {compound?.created_at ? new Date(compound.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Admin Management</h3>
            <p className="text-gray-600">Manage compound administrators</p>
          </div>
          <button className="btn btn-primary flex items-center space-x-2">
            <PlusIcon className="h-4 w-4" />
            <span>Add Admin</span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Primary Admin */}
          <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                <UsersIcon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
            <div className="flex-shrink-0">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Primary Admin
              </span>
            </div>
          </div>

          {/* Additional Admins */}
          {compound?.additional_admins?.length > 0 ? (
            compound.additional_admins.map((adminId, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-400 flex items-center justify-center">
                    <UsersIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Admin {index + 1}</p>
                  <p className="text-sm text-gray-600">ID: {adminId}</p>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    Admin
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No additional admins added</p>
              <p className="text-sm text-gray-400">Add more admins to help manage the compound</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Compound Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compound Name
            </label>
            <input
              type="text"
              value={compound?.name || ''}
              className="form-input"
              placeholder="Enter compound name"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <input
              type="text"
              value={compound?.address || ''}
              className="form-input"
              placeholder="Enter compound address"
              readOnly
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-end space-x-4">
            <button className="btn btn-secondary">
              Cancel
            </button>
            <button className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompoundManagement;