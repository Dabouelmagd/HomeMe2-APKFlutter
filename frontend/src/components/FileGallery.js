import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import {
  PhotoIcon,
  VideoCameraIcon,
  SpeakerWaveIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowDownTrayIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FileGallery = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedType, setSelectedType] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('uploaded_at');

  useEffect(() => {
    loadFiles();
    loadStats();
  }, [selectedType, dateFilter, sortBy]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const filters = {
        file_types: selectedType === 'all' ? undefined : [selectedType],
        sort_by: sortBy,
        sort_order: 'desc',
        limit: 100
      };

      const response = await axios.post(`${API}/gallery/files`, filters);
      setFiles(response.data.results.files || []);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API}/gallery/stats`);
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const downloadFile = (file) => {
    const link = document.createElement('a');
    link.href = `${BACKEND_URL}${file.file_url}`;
    link.download = file.original_filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (fileType) => {
    const iconClass = "h-6 w-6";
    switch (fileType) {
      case 'image': return <PhotoIcon className={`${iconClass} text-blue-500`} />;
      case 'video': return <VideoCameraIcon className={`${iconClass} text-purple-500`} />;
      case 'audio':
      case 'voice': return <SpeakerWaveIcon className={`${iconClass} text-green-500`} />;
      default: return <DocumentIcon className={`${iconClass} text-gray-500`} />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const fileTypeCategories = [
    { value: 'all', label: t('gallery.allFiles'), count: stats.total_files || 0 },
    { value: 'image', label: t('gallery.images'), count: stats.by_type?.image?.count || 0 },
    { value: 'video', label: t('gallery.videos'), count: stats.by_type?.video?.count || 0 },
    { value: 'voice', label: t('gallery.voice'), count: stats.by_type?.voice?.count || 0 },
    { value: 'audio', label: t('gallery.audio'), count: stats.by_type?.audio?.count || 0 },
    { value: 'document', label: t('gallery.documents'), count: stats.by_type?.document?.count || 0 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{t('gallery.title')}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t('gallery.description')}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {fileTypeCategories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedType(category.value)}
              className={`p-4 rounded-lg text-center transition-colors ${
                selectedType === category.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="text-2xl font-bold">{category.count}</div>
              <div className="text-sm">{category.label}</div>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="uploaded_at">{t('gallery.newestFirst')}</option>
              <option value="file_size">{t('gallery.largestFirst')}</option>
              <option value="filename">{t('gallery.nameAZ')}</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* File Grid/List */}
        {files.length === 0 ? (
          <div className="text-center py-12">
            <PhotoIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg">{t('gallery.noFilesFound')}</p>
            <p className="text-gray-400 text-sm">{t('gallery.filesSharedInChats')}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {files.map((file, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {file.file_type === 'image' && (
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={file.thumbnail_url ? `${BACKEND_URL}${file.thumbnail_url}` : `${BACKEND_URL}${file.file_url}`}
                      alt={file.original_filename}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => window.open(`${BACKEND_URL}${file.file_url}`, '_blank')}
                    />
                  </div>
                )}

                {file.file_type === 'video' && (
                  <div className="aspect-square bg-gray-900 flex items-center justify-center">
                    <VideoCameraIcon className="h-12 w-12 text-white" />
                  </div>
                )}

                {(file.file_type === 'audio' || file.file_type === 'voice') && (
                  <div className="aspect-square bg-green-100 flex items-center justify-center">
                    <SpeakerWaveIcon className="h-12 w-12 text-green-600" />
                  </div>
                )}

                {file.file_type === 'document' && (
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <DocumentIcon className="h-12 w-12 text-gray-600" />
                  </div>
                )}

                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                    {file.original_filename}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">
                    {formatFileSize(file.file_size)} • {formatDate(file.uploaded_at)}
                  </p>
                  <p className="text-xs text-gray-400 truncate mb-2">
                    {t('gallery.from')}: {file.sender?.full_name}
                  </p>
                  <button
                    onClick={() => downloadFile(file)}
                    className="w-full flex items-center justify-center space-x-1 py-1 px-2 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"
                  >
                    <ArrowDownTrayIcon className="h-3 w-3" />
                    <span>{t('gallery.download')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {files.map((file, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getFileIcon(file.file_type)}
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                              {file.original_filename}
                            </div>
                            <div className="text-sm text-gray-500">{file.file_type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatFileSize(file.file_size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {file.sender?.full_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(file.uploaded_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => downloadFile(file)}
                          className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          <span>Download</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileGallery;