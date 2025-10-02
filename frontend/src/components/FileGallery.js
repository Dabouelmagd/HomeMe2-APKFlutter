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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-6"></div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('common.loading')}</h3>
          <p className="text-gray-500">{t('gallery.loadingFiles')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header Section */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-4 rounded-2xl shadow-xl">
                <PhotoIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
              {t('gallery.title')}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {t('gallery.description')}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Stats Overview */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t('gallery.fileTypes')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {fileTypeCategories.map((category, index) => {
              const gradients = [
                'from-blue-500 to-cyan-500',
                'from-purple-500 to-pink-500', 
                'from-green-500 to-teal-500',
                'from-orange-500 to-red-500',
                'from-indigo-500 to-purple-500',
                'from-gray-500 to-slate-500'
              ];
              return (
                <button
                  key={category.value}
                  onClick={() => setSelectedType(category.value)}
                  className={`group p-6 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 hover:shadow-2xl ${
                    selectedType === category.value
                      ? `bg-gradient-to-br ${gradients[index % gradients.length]} text-white shadow-xl`
                      : 'bg-white text-gray-700 hover:bg-gray-50 shadow-lg border border-gray-100'
                  }`}
                >
                  <div className="text-3xl font-bold mb-2">{category.count}</div>
                  <div className="text-sm font-medium">{category.label}</div>
                  {selectedType === category.value && (
                    <div className="mt-2 w-8 h-1 bg-white/30 rounded-full mx-auto"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Enhanced Controls */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Sort Controls */}
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <FunnelIcon className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{t('gallery.sortBy')}:</span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200"
              >
                <option value="uploaded_at">{t('gallery.newestFirst')}</option>
                <option value="file_size">{t('gallery.largestFirst')}</option>
                <option value="filename">{t('gallery.nameAZ')}</option>
              </select>
            </div>

            {/* View Mode Controls */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="text-sm font-medium text-gray-700">{t('gallery.view')}:</span>
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === 'grid' 
                      ? 'bg-white text-purple-600 shadow-md' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Squares2X2Icon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  {t('gallery.grid')}
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-white text-purple-600 shadow-md' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <ListBulletIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  {t('gallery.list')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced File Grid/List */}
        {files.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-w-2xl mx-auto">
            {/* Empty State Header */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-8 text-center">
              <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <PhotoIcon className="h-12 w-12 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('gallery.noFilesFound')}</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                {t('gallery.filesSharedInChats')}
              </p>
            </div>
            
            {/* Empty State Suggestion */}
            <div className="p-8 text-center bg-gray-50">
              <p className="text-gray-500 mb-4">{t('gallery.startSharingFiles')}</p>
              <div className="flex justify-center space-x-4 rtl:space-x-reverse text-sm text-gray-400">
                <span>📸 {t('gallery.images')}</span>
                <span>🎥 {t('gallery.videos')}</span>
                <span>📄 {t('gallery.documents')}</span>
                <span>🎵 {t('gallery.audio')}</span>
              </div>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {files.map((file, index) => (
              <div
                key={index}
                className="group bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300"
              >
                {/* File Preview */}
                {file.file_type === 'image' && (
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                    <img
                      src={file.thumbnail_url ? `${BACKEND_URL}${file.thumbnail_url}` : `${BACKEND_URL}${file.file_url}`}
                      alt={file.original_filename}
                      className="w-full h-full object-cover cursor-pointer group-hover:scale-110 transition-transform duration-300"
                      onClick={() => window.open(`${BACKEND_URL}${file.file_url}`, '_blank')}
                    />
                    <div className="absolute top-3 right-3 bg-black/20 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PhotoIcon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}

                {file.file_type === 'video' && (
                  <div className="aspect-square bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center relative">
                    <VideoCameraIcon className="h-16 w-16 text-white opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
                        <span className="text-white text-xs font-medium">{t('gallery.video')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {(file.file_type === 'audio' || file.file_type === 'voice') && (
                  <div className="aspect-square bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center relative">
                    <SpeakerWaveIcon className="h-16 w-16 text-green-600" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="bg-green-500/20 backdrop-blur-sm rounded-lg px-3 py-1">
                        <span className="text-green-800 text-xs font-medium">
                          {file.file_type === 'voice' ? t('gallery.voice') : t('gallery.audio')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {file.file_type === 'document' && (
                  <div className="aspect-square bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center relative">
                    <DocumentIcon className="h-16 w-16 text-blue-600" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg px-3 py-1">
                        <span className="text-blue-800 text-xs font-medium">{t('gallery.document')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* File Information */}
                <div className="p-4">
                  <h3 className="text-sm font-bold text-gray-900 truncate mb-2">
                    {file.original_filename}
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center space-x-1 rtl:space-x-reverse">
                        <span>📏</span>
                        <span>{formatFileSize(file.file_size)}</span>
                      </span>
                      <span className="flex items-center space-x-1 rtl:space-x-reverse">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{formatDate(file.uploaded_at)}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-400">
                      <span className="truncate">
                        👤 {file.sender?.full_name || t('gallery.unknown')}
                      </span>
                    </div>
                  </div>
                  
                  {/* Download Button */}
                  <button
                    onClick={() => downloadFile(file)}
                    className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse py-2 px-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl text-xs font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('gallery.file')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('gallery.size')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('gallery.sender')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('gallery.date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('gallery.actions')}</th>
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
                          <span>{t('gallery.download')}</span>
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