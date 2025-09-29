import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CalendarIcon,
  TagIcon,
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

const Newsletter = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState(null);
  const [selectedNewsletter, setSelectedNewsletter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'events', label: 'Events' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'community', label: 'Community' },
    { value: 'announcements', label: 'Announcements' },
    { value: 'safety', label: 'Safety' }
  ];

  const statuses = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' }
  ];

  useEffect(() => {
    fetchNewsletters();
  }, [currentPage, filterCategory, filterStatus]);

  const fetchNewsletters = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage,
        page_size: 10,
        ...(filterCategory && { category: filterCategory }),
        ...(filterStatus && { status: filterStatus })
      });

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/newsletters?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNewsletters(data.newsletters || []);
        setTotalPages(data.total_pages || 1);
      } else {
        setError('Failed to load newsletters');
      }
    } catch (error) {
      console.error('Error fetching newsletters:', error);
      setError('Failed to load newsletters');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewsletter = () => {
    setEditingNewsletter(null);
    setShowCreateModal(true);
  };

  const handleEditNewsletter = (newsletter) => {
    setEditingNewsletter(newsletter);
    setShowCreateModal(true);
  };

  const handleDeleteNewsletter = async (newsletterId) => {
    if (!window.confirm('Are you sure you want to delete this newsletter?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/newsletters/${newsletterId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchNewsletters();
      } else {
        setError('Failed to delete newsletter');
      }
    } catch (error) {
      console.error('Error deleting newsletter:', error);
      setError('Failed to delete newsletter');
    }
  };

  const handleViewNewsletter = (newsletter) => {
    setSelectedNewsletter(newsletter);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      general: 'bg-gray-100 text-gray-800',
      events: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      community: 'bg-green-100 text-green-800',
      announcements: 'bg-purple-100 text-purple-800',
      safety: 'bg-red-100 text-red-800'
    };
    return colors[category] || colors.general;
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.draft;
  };

  if (selectedNewsletter) {
    return (
      <NewsletterDetail 
        newsletter={selectedNewsletter} 
        onBack={() => setSelectedNewsletter(null)}
        onEdit={() => handleEditNewsletter(selectedNewsletter)}
        onDelete={() => handleDeleteNewsletter(selectedNewsletter.id)}
        canEdit={user?.role === 'admin'}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 text-center">{t('community_newsletter')}</h1>
              <p className="text-gray-600 mt-2">Stay updated with community news and announcements</p>
            </div>
            {user?.role === 'admin' && (
              <button
                onClick={handleCreateNewsletter}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Create Newsletter</span>
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search newsletters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            {/* Status Filter (Admin only) */}
            {user?.role === 'admin' && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                {statuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Newsletter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {newsletters.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500 text-lg">No newsletters found</p>
                  {user?.role === 'admin' && (
                    <button
                      onClick={handleCreateNewsletter}
                      className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Create Your First Newsletter
                    </button>
                  )}
                </div>
              ) : (
                newsletters.map((newsletter) => (
                  <div key={newsletter.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                    {/* Featured Image */}
                    {newsletter.featured_image && (
                      <img
                        src={newsletter.featured_image}
                        alt={newsletter.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(newsletter.category)}`}>
                            {newsletter.category}
                          </span>
                          {user?.role === 'admin' && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(newsletter.status)}`}>
                              {newsletter.status}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-2 line-clamp-2">
                        {newsletter.title}
                      </h3>

                      {/* Summary */}
                      {newsletter.summary && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {newsletter.summary}
                        </p>
                      )}

                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center space-x-1">
                          <UserIcon className="h-4 w-4" />
                          <span>{newsletter.author_name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{formatDate(newsletter.created_date)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => handleViewNewsletter(newsletter)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center space-x-1"
                        >
                          <EyeIcon className="h-4 w-4" />
                          <span>Read More</span>
                        </button>

                        {user?.role === 'admin' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditNewsletter(newsletter)}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteNewsletter(newsletter.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Views Count */}
                      {newsletter.views_count > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-500">
                            {newsletter.views_count} view{newsletter.views_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center">
                <div className="flex space-x-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <NewsletterCreateEdit
            newsletter={editingNewsletter}
            onSave={() => {
              setShowCreateModal(false);
              fetchNewsletters();
            }}
            onCancel={() => setShowCreateModal(false)}
          />
        )}
      </div>
    </div>
  );
};

// Newsletter Detail Component
const NewsletterDetail = ({ newsletter, onBack, onEdit, onDelete, canEdit }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      general: 'bg-gray-100 text-gray-800',
      events: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      community: 'bg-green-100 text-green-800',
      announcements: 'bg-purple-100 text-purple-800',
      safety: 'bg-red-100 text-red-800'
    };
    return colors[category] || colors.general;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-6 text-blue-600 hover:text-blue-800 flex items-center space-x-2"
        >
          <span>←</span>
          <span>Back to Newsletter</span>
        </button>

        {/* Newsletter Content */}
        <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Featured Image */}
          {newsletter.featured_image && (
            <img
              src={newsletter.featured_image}
              alt={newsletter.title}
              className="w-full h-64 object-cover"
            />
          )}

          <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(newsletter.category)}`}>
                    {newsletter.category}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {formatDate(newsletter.published_date || newsletter.created_date)}
                  </span>
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {newsletter.title}
                </h1>

                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <UserIcon className="h-4 w-4" />
                    <span>By {newsletter.author_name}</span>
                  </div>
                  {newsletter.views_count > 0 && (
                    <div className="flex items-center space-x-1">
                      <EyeIcon className="h-4 w-4" />
                      <span>{newsletter.views_count} views</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {canEdit && (
                <div className="flex space-x-3">
                  <button
                    onClick={onEdit}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={onDelete}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>

            {/* Summary */}
            {newsletter.summary && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
                <p className="text-blue-900 font-medium">{newsletter.summary}</p>
              </div>
            )}

            {/* Content */}
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: newsletter.content }}
            />

            {/* Footer */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Published on {formatDate(newsletter.published_date || newsletter.created_date)}
                {newsletter.updated_date && newsletter.updated_date !== newsletter.created_date && (
                  <span> • Last updated {formatDate(newsletter.updated_date)}</span>
                )}
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

// Newsletter Create/Edit Component
const NewsletterCreateEdit = ({ newsletter, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: newsletter?.title || '',
    content: newsletter?.content || '',
    summary: newsletter?.summary || '',
    category: newsletter?.category || 'general',
    featured_image: newsletter?.featured_image || '',
    status: newsletter?.status || 'draft'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'events', label: 'Events' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'community', label: 'Community' },
    { value: 'announcements', label: 'Announcements' },
    { value: 'safety', label: 'Safety' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const url = newsletter 
        ? `${process.env.REACT_APP_BACKEND_URL}/api/newsletters/${newsletter.id}`
        : `${process.env.REACT_APP_BACKEND_URL}/api/newsletters`;
      
      const method = newsletter ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSave();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to save newsletter');
      }
    } catch (error) {
      console.error('Error saving newsletter:', error);
      setError('Failed to save newsletter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
            {newsletter ? 'Edit Newsletter' : 'Create Newsletter'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter newsletter title..."
                required
              />
            </div>

            {/* Category and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Summary (Optional)
              </label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief summary of the newsletter..."
              />
            </div>

            {/* Featured Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Featured Image URL (Optional)
              </label>
              <input
                type="url"
                value={formData.featured_image}
                onChange={(e) => setFormData(prev => ({ ...prev, featured_image: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Write your newsletter content here... (HTML is supported)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                You can use HTML formatting for rich content.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (newsletter ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Newsletter;