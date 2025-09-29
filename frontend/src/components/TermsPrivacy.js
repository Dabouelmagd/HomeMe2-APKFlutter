import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  DocumentTextIcon, 
  ShieldCheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const TermsPrivacy = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('terms');
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleBack = () => {
    window.history.back();
  };

  const termsContent = [
    {
      id: 'acceptance',
      title: t('legal.terms.acceptance.title'),
      content: t('legal.terms.acceptance.content')
    },
    {
      id: 'personal_use',
      title: t('legal.terms.personalUse.title'),
      content: t('legal.terms.personalUse.content')
    },
    {
      id: 'content',
      title: t('legal.terms.content.title'),
      content: t('legal.terms.content.content')
    },
    {
      id: 'liability',
      title: t('legal.terms.liability.title'),
      content: t('legal.terms.liability.content')
    },
    {
      id: 'modifications',
      title: t('legal.terms.modifications.title'),
      content: t('legal.terms.modifications.content')
    },
    {
      id: 'governing_law',
      title: t('legal.terms.governingLaw.title'),
      content: t('legal.terms.governingLaw.content')
    }
  ];

  const privacyContent = [
    {
      id: 'info_collection',
      title: t('legal.privacy.infoCollection.title'),
      content: t('legal.privacy.infoCollection.content')
    },
    {
      id: 'info_use',
      title: t('legal.privacy.infoUse.title'),
      content: t('legal.privacy.infoUse.content')
    },
    {
      id: 'info_protection',
      title: t('legal.privacy.infoProtection.title'),
      content: t('legal.privacy.infoProtection.content')
    },
    {
      id: 'info_sharing',
      title: t('legal.privacy.infoSharing.title'),
      content: t('legal.privacy.infoSharing.content')
    },
    {
      id: 'user_rights',
      title: t('legal.privacy.userRights.title'),
      content: t('legal.privacy.userRights.content')
    },
    {
      id: 'policy_changes',
      title: t('legal.privacy.policyChanges.title'),
      content: t('legal.privacy.policyChanges.content')
    },
    {
      id: 'applicable_laws',
      title: t('legal.privacy.applicableLaws.title'),
      content: t('legal.privacy.applicableLaws.content')
    }
  ];

  const renderContent = (content) => (
    <div className="space-y-4">
      {content.map((section, index) => (
        <div key={section.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-center text-blue-600">{index + 1}</span>
              </div>
              <h3 className="text-lg font-semibold text-center text-gray-900 text-center">{section.title}</h3>
            </div>
            {expandedSections[section.id] ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {expandedSections[section.id] && (
            <div className="px-6 pb-4">
              <div className="pl-11">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {section.content}
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 text-center">
                  {t('legal.title')}
                </h1>
                <p className="text-gray-600 mt-1">
                  {t('legal.subtitle')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-8">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'terms'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DocumentTextIcon className="w-5 h-5 mr-2" />
            {t('legal.termsOfUse')}
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'privacy'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShieldCheckIcon className="w-5 h-5 mr-2" />
            {t('legal.privacyPolicy')}
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Introduction Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
            <div className="flex items-start space-x-3">
              {activeTab === 'terms' ? (
                <DocumentTextIcon className="w-6 h-6 text-blue-600 mt-1" />
              ) : (
                <ShieldCheckIcon className="w-6 h-6 text-blue-600 mt-1" />
              )}
              <div>
                <h2 className="text-xl font-semibold text-center text-center text-gray-900 text-center mb-2">
                  {activeTab === 'terms' ? t('legal.terms.title') : t('legal.privacy.title')}
                </h2>
                <p className="text-gray-700">
                  {activeTab === 'terms' ? t('legal.terms.description') : t('legal.privacy.description')}
                </p>
                <div className="mt-3 text-sm text-gray-600">
                  <span className="font-medium">{t('legal.lastUpdated')}: </span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          {activeTab === 'terms' ? renderContent(termsContent) : renderContent(privacyContent)}

          {/* Contact Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-8">
            <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-3">
              {t('legal.contact.title')}
            </h3>
            <p className="text-gray-700 mb-4">
              {t('legal.contact.description')}
            </p>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">{t('legal.contact.email')}: </span>
                <span>info@datalifeai.com</span>
              </div>
              <div>
                <span className="font-medium">{t('legal.contact.address')}: </span>
                <span>{t('legal.contact.addressValue')}</span>
              </div>
            </div>
          </div>

          {/* Acceptance Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <ShieldCheckIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800 mb-1">
                  {t('legal.acceptance.title')}
                </h4>
                <p className="text-sm text-yellow-700">
                  {t('legal.acceptance.content')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPrivacy;