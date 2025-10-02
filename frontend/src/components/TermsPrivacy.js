import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  DocumentTextIcon, 
  ShieldCheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
  MapPinIcon,
  LockClosedIcon,
  EyeIcon,
  UserShieldIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header with Gradient */}
      <div className="relative">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20"></div>
        
        {/* Header Content */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-8">
            <div className="flex items-center space-x-6">
              <button
                onClick={handleBack}
                className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {t('legal_title')}
                </h1>
                <p className="text-blue-100 text-lg">
                  {t('legal_subtitle')}
                </p>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                <ShieldCheckIcon className="w-8 h-8 text-white" />
              </div>
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                <DocumentTextIcon className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Tab Navigation */}
        <div className="flex space-x-1 bg-white/70 backdrop-blur-sm rounded-2xl p-2 mb-10 shadow-lg border border-white/20">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
              activeTab === 'terms'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 transform scale-[1.02]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <DocumentTextIcon className="w-5 h-5 mr-3" />
            {t('legal_termsOfUse')}
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
              activeTab === 'privacy'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 transform scale-[1.02]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <ShieldCheckIcon className="w-5 h-5 mr-3" />
            {t('legal_privacyPolicy')}
          </button>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Enhanced Introduction Card */}
          <div className={`relative overflow-hidden rounded-2xl p-8 border shadow-xl ${
            activeTab === 'terms' 
              ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200' 
              : 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200'
          }`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-gradient-to-r from-current to-transparent"></div>
            </div>
            
            <div className="relative flex items-start space-x-6">
              <div className={`p-4 rounded-2xl ${
                activeTab === 'terms' 
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600'
              } shadow-lg`}>
                {activeTab === 'terms' ? (
                  <ClipboardDocumentCheckIcon className="w-8 h-8 text-white" />
                ) : (
                  <UserShieldIcon className="w-8 h-8 text-white" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {activeTab === 'terms' ? t('legal_terms_title') : t('legal_privacy_title') || 'Privacy Policy'}
                  </h2>
                  <CheckCircleIcon className={`w-6 h-6 ${
                    activeTab === 'terms' ? 'text-blue-600' : 'text-emerald-600'
                  }`} />
                </div>
                
                <p className="text-gray-700 text-lg leading-relaxed mb-4">
                  {activeTab === 'terms' 
                    ? t('legal_terms_description') 
                    : t('legal_privacy_description') || 'Learn how we collect, use, and protect your personal information.'
                  }
                </p>
                
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    activeTab === 'terms' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    <ClockIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('legal_lastUpdated')}: 30/9/2025</span>
                  </div>
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