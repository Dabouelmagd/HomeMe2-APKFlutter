import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import {
  DocumentTextIcon,
  FolderIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  TagIcon,
  CalendarDaysIcon,
  UserIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

const DocumentManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    category: 'general',
    tags: '',
    access_level: 'public',
    folder_id: ''
  });

  const categories = [
    { value: 'general', label: t('documents.categories.general', 'General') },
    { value: 'financial', label: t('documents.categories.financial', 'Financial') },
    { value: 'legal', label: t('documents.categories.legal', 'Legal') },
    { value: 'maintenance', label: t('documents.categories.maintenance', 'Maintenance') },
    { value: 'governance', label: t('documents.categories.governance', 'Governance') },
    { value: 'residents', label: t('documents.categories.residents', 'Residents') },
    { value: 'contracts', label: t('documents.categories.contracts', 'Contracts') },
    { value: 'policies', label: t('documents.categories.policies', 'Policies') }
  ];

  const accessLevels = [
    { value: 'public', label: t('documents.access.public', 'All Residents') },
    { value: 'admin_only', label: t('documents.access.admin_only', 'Admin Only') },
    { value: 'family_only', label: t('documents.access.family_only', 'Family Only') },
    { value: 'residents_only', label: t('documents.access.residents_only', 'Residents Only') }
  ];

  useEffect(() => {
    fetchDocuments();
    fetchFolders();
  }, [selectedCategory, selectedFolder, searchQuery]);

  const fetchDocuments = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedFolder) params.append('folder_id', selectedFolder);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/documents?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/documents/folders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
    setLoading(false);
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    
    if (!uploadFile) {
      alert(t('documents.upload.select_file', 'Please select a file'));
      return;
    }

    try {
      // First create the document
      const documentResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...uploadData,
          tags: uploadData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        })
      });

      if (documentResponse.ok) {
        const documentResult = await documentResponse.json();
        
        // Then upload the file
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('changelog', 'Initial version');

        const uploadResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${documentResult.document_id}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        if (uploadResponse.ok) {
          setShowUploadModal(false);
          setUploadFile(null);
          setUploadData({
            title: '',
            description: '',
            category: 'general',
            tags: '',
            access_level: 'public',
            folder_id: ''
          });
          fetchDocuments();
        }
      }
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const folderData = {
      name: formData.get('name'),
      description: formData.get('description'),
      parent_folder_id: formData.get('parent_folder_id') || null,
      default_access_level: formData.get('default_access_level')
    };

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/documents/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(folderData)
      });

      if (response.ok) {
        setShowCreateFolderModal(false);
        fetchFolders();
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const handleDocumentClick = async (doc) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${doc.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedDocument(data.document);
        setShowDocumentModal(true);
      }
    } catch (error) {
      console.error('Error fetching document details:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryIcon = (category) => {
    const icons = {
      general: DocumentTextIcon,
      financial: DocumentTextIcon,
      legal: DocumentTextIcon,
      maintenance: DocumentTextIcon,
      governance: DocumentTextIcon,
      residents: DocumentTextIcon,
      contracts: DocumentTextIcon,
      policies: DocumentTextIcon
    };
    return icons[category] || DocumentTextIcon;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 text-center">
                {t('documents.title', 'Document Management')}
              </h1>
              <p className="mt-2 text-gray-600">
                {t('documents.subtitle', 'Organize and share compound documents')}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateFolderModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FolderIcon className="h-4 w-4 mr-2" />
                {t('documents.create_folder', 'New Folder')}
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                {t('documents.upload', 'Upload Document')}
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('documents.search', 'Search')}
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('documents.search_placeholder', 'Search documents...')}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('documents.category', 'Category')}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('common.all', 'All Categories')}</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('documents.folder', 'Folder')}
              </label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('common.all', 'All Folders')}</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('');
                  setSelectedFolder('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                {t('common.clear_filters', 'Clear Filters')}
              </button>
            </div>
          </div>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map(doc => {
            const CategoryIcon = getCategoryIcon(doc.category);
            const currentVersion = doc.versions?.find(v => v.version_number === doc.current_version);
            
            return (
              <div
                key={doc.id}
                onClick={() => handleDocumentClick(doc)}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <CategoryIcon className="h-8 w-8 text-blue-600 mr-3" />
                      <div>
                        <h3 className="font-medium text-gray-900 text-center line-clamp-2">{doc.title}</h3>
                        <p className="text-sm text-gray-500 capitalize">{doc.category}</p>
                      </div>
                    </div>
                    {doc.is_pinned && (
                      <div className="text-yellow-500">📌</div>
                    )}
                  </div>
                  
                  {doc.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{doc.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{t('documents.version', 'Version')} {doc.current_version}</span>
                    <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                  </div>
                  
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {doc.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                        </span>
                      ))}
                      {doc.tags.length > 3 && (
                        <span className="text-xs text-gray-500">+{doc.tags.length - 3} more</span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <EyeIcon className="h-4 w-4 mr-1" />
                      {doc.view_count} views
                    </div>
                    <div className="flex items-center">
                      <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                      {doc.download_count} downloads
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {documents.length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {t('documents.no_documents', 'No documents found')}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {t('documents.no_documents_desc', 'Get started by uploading a document.')}
            </p>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowUploadModal(false)}></div>
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-center text-center">
                  {t('documents.upload_document', 'Upload Document')}
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleUploadDocument} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('documents.file', 'File')}
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('documents.title', 'Title')}
                  </label>
                  <input
                    type="text"
                    value={uploadData.title}
                    onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('documents.description', 'Description')}
                  </label>
                  <textarea
                    value={uploadData.description}
                    onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('documents.category', 'Category')}
                  </label>
                  <select
                    value={uploadData.category}
                    onChange={(e) => setUploadData({...uploadData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('documents.access_level', 'Access Level')}
                  </label>
                  <select
                    value={uploadData.access_level}
                    onChange={(e) => setUploadData({...uploadData, access_level: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {accessLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('documents.tags', 'Tags (comma-separated)')}
                  </label>
                  <input
                    type="text"
                    value={uploadData.tags}
                    onChange={(e) => setUploadData({...uploadData, tags: e.target.value})}
                    placeholder="tag1, tag2, tag3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {t('documents.upload', 'Upload')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowCreateFolderModal(false)}></div>
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-center text-center">
                  {t('documents.create_folder', 'Create Folder')}
                </h3>
                <button
                  onClick={() => setShowCreateFolderModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreateFolder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('documents.folder_name', 'Folder Name')}
                  </label>
                  <input
                    type="text"
                    name="name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('documents.description', 'Description')}
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('documents.parent_folder', 'Parent Folder')}
                  </label>
                  <select
                    name="parent_folder_id"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('documents.root_folder', 'Root Folder')}</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('documents.default_access', 'Default Access Level')}
                  </label>
                  <select
                    name="default_access_level"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {accessLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateFolderModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {t('common.create', 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Document Details Modal */}
      {showDocumentModal && selectedDocument && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowDocumentModal(false)}></div>
            <div className="relative bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-center text-center">{selectedDocument.title}</h3>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    {t('documents.description', 'Description')}
                  </h4>
                  <p className="text-gray-600">{selectedDocument.description || t('documents.no_description', 'No description available')}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">
                      {t('documents.category', 'Category')}
                    </h4>
                    <p className="text-gray-600 capitalize">{selectedDocument.category}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">
                      {t('documents.access_level', 'Access Level')}
                    </h4>
                    <p className="text-gray-600">{selectedDocument.access_level}</p>
                  </div>
                </div>
                
                {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      {t('documents.tags', 'Tags')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDocument.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    {t('documents.versions', 'Versions')}
                  </h4>
                  <div className="space-y-2">
                    {selectedDocument.versions?.map(version => (
                      <div key={version.version_number} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="flex items-center">
                            <DocumentDuplicateIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="font-medium">Version {version.version_number}</span>
                            {version.version_number === selectedDocument.current_version && (
                              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Current</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{version.file_name}</p>
                          {version.changelog && (
                            <p className="text-sm text-gray-600 mt-1">{version.changelog}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <a
                            href={`${process.env.REACT_APP_BACKEND_URL}${version.file_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ArrowDownTrayIcon className="h-5 w-5" />
                          </a>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatFileSize(version.file_size)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;