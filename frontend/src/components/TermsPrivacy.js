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
      title: t('legal_terms_acceptance_title'),
      content: 'By accessing and using HomeMe services, you accept and agree to be bound by the terms and provisions of this agreement.'
    },
    {
      id: 'personal_use',
      title: t('legal_terms_personalUse_title'),
      content: 'You may use our service for personal, non-commercial purposes only. You agree not to use the service for any unlawful activities.'
    },
    {
      id: 'content',
      title: t('legal_terms_content_title'),
      content: 'You are responsible for all content you post. You agree not to post content that is offensive, illegal, or violates others\' rights.'
    },
    {
      id: 'liability',
      title: t('legal_terms_liability_title'),
      content: 'HomeMe shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.'
    },
    {
      id: 'modifications',
      title: t('legal_terms_modifications_title'),
      content: 'We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting on our website.'
    },
    {
      id: 'governing_law',
      title: t('legal_terms_governingLaw_title'),
      content: 'These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which HomeMe operates.'
    }
  ];

  const privacyContent = [
    {
      id: 'info_collection',
      title: t('legal_privacy_infoCollection_title'),
      content: 'We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.'
    },
    {
      id: 'info_use',
      title: t('legal_privacy_infoUse_title'),
      content: 'We use the information we collect to provide, maintain, and improve our services, communicate with you, and ensure platform security.'
    },
    {
      id: 'info_protection',
      title: t('legal_privacy_infoProtection_title'),
      content: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.'
    },
    {
      id: 'info_sharing',
      title: t('legal_privacy_infoSharing_title'),
      content: 'We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this privacy policy.'
    },
    {
      id: 'user_rights',
      title: t('legal_privacy_userRights_title'),
      content: 'You have the right to access, update, or delete your personal information. You may also opt out of certain communications from us.'
    },
    {
      id: 'policy_changes',
      title: t('legal_privacy_policyChanges_title'),
      content: 'We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.'
    },
    {
      id: 'applicable_laws',
      title: t('legal_privacy_applicableLaws_title'),
      content: 'This privacy policy is governed by and construed in accordance with applicable data protection laws and regulations.'
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
                  {t('legal_title')}
                </h1>
                <p className="text-gray-600 mt-1 text-center">
                  {t('legal_subtitle')}
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
            {t('legal_termsOfUse')}
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
            {t('legal_privacyPolicy')}
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
                <h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
                  {activeTab === 'terms' ? t('legal_terms_title') : 'Privacy Policy'}
                </h2>
                <p className="text-gray-700 text-center">
                  {activeTab === 'terms' ? t('legal_terms_description') : 'Learn how we collect, use, and protect your personal information.'}
                </p>
                <div className="mt-3 text-sm text-gray-600 text-center">
                  <span className="font-medium">{t('legal_lastUpdated')}: </span>
                  <span>9/30/2025</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          {activeTab === 'terms' ? renderContent(termsContent) : renderContent(privacyContent)}

          {/* Contact Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-8">
            <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-3">
              {t('legal_contact_title')}
            </h3>
            <p className="text-gray-700 mb-4">
              {t('legal_contact_description')}
            </p>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">{t('legal_contact_email')}: </span>
                <span>info@datalifeai.com</span>
              </div>
              <div>
                <span className="font-medium">{t('legal_contact_address')}: </span>
                <span>{t('legal_contact_addressValue')}</span>
              </div>
            </div>
          </div>

          {/* Acceptance Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <ShieldCheckIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800 mb-1">
                  {t('legal_acceptance_title')}
                </h4>
                <p className="text-sm text-yellow-700">
                  {t('legal_acceptance_content')}
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