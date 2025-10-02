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
  UserCircleIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  HandRaisedIcon,
  HomeIcon,
  PencilSquareIcon,
  ScaleIcon,
  CogIcon,
  BookOpenIcon,
  EyeSlashIcon,
  UserGroupIcon,
  BellIcon,
  DocumentArrowUpIcon
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

  // دالة لإرجاع الأيقونة المناسبة لكل قسم
  const getSectionIcon = (sectionId, index) => {
    const iconProps = { className: "w-6 h-6 text-white" };
    
    // أيقونات شروط الاستخدام
    if (activeTab === 'terms') {
      switch (sectionId) {
        case 'acceptance':
          return <HandRaisedIcon {...iconProps} />;
        case 'personal_use':
          return <HomeIcon {...iconProps} />;
        case 'content':
          return <PencilSquareIcon {...iconProps} />;
        case 'liability':
          return <ScaleIcon {...iconProps} />;
        case 'modifications':
          return <CogIcon {...iconProps} />;
        case 'governing_law':
          return <BookOpenIcon {...iconProps} />;
        default:
          return <DocumentTextIcon {...iconProps} />;
      }
    }
    
    // أيقونات سياسة الخصوصية
    switch (sectionId) {
      case 'info_collection':
        return <DocumentArrowUpIcon {...iconProps} />;
      case 'info_use':
        return <EyeIcon {...iconProps} />;
      case 'info_protection':
        return <LockClosedIcon {...iconProps} />;
      case 'info_sharing':
        return <UserGroupIcon {...iconProps} />;
      case 'user_rights':
        return <UserCircleIcon {...iconProps} />;
      case 'policy_changes':
        return <BellIcon {...iconProps} />;
      case 'applicable_laws':
        return <ScaleIcon {...iconProps} />;
      default:
        return <ShieldCheckIcon {...iconProps} />;
    }
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
    <div className="space-y-5">
      {content.map((section, index) => (
        <div key={section.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-white/50 rounded-2xl transition-all duration-300 group"
          >
            <div className="flex items-center space-x-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                activeTab === 'terms' 
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 group-hover:from-blue-600 group-hover:to-indigo-700' 
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600 group-hover:from-emerald-600 group-hover:to-teal-700'
              } shadow-lg`}>
                {getSectionIcon(section.id, index)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors">
                  {section.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {expandedSections[section.id] ? t('legal_clickToCollapse') || 'Click to collapse' : t('legal_clickToExpand') || 'Click to expand'}
                </p>
              </div>
            </div>
            <div className={`p-2 rounded-xl transition-all duration-300 ${
              expandedSections[section.id] 
                ? (activeTab === 'terms' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600')
                : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
            }`}>
              {expandedSections[section.id] ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
            </div>
          </button>
          
          {expandedSections[section.id] && (
            <div className="px-8 pb-8">
              <div className="pl-16">
                <div className={`p-6 rounded-xl border-l-4 ${
                  activeTab === 'terms' 
                    ? 'bg-blue-50/50 border-blue-400' 
                    : 'bg-emerald-50/50 border-emerald-400'
                }`}>
                  <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
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
                  <UserCircleIcon className="w-8 h-8 text-white" />
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

          {/* Enhanced Contact Information */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 shadow-lg p-8 mt-10">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <EnvelopeIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {t('legal_contact_title')}
              </h3>
            </div>
            
            <p className="text-gray-700 text-lg mb-6 leading-relaxed">
              {t('legal_contact_description')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('legal_contact_email')}</p>
                  <p className="text-lg font-semibold text-gray-900">info@datalifeai.com</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <MapPinIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('legal_contact_address')}</p>
                  <p className="text-lg font-semibold text-gray-900">{t('legal_contact_addressValue')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Acceptance Notice */}
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500"></div>
            </div>
            
            <div className="relative flex items-start space-x-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
                <ExclamationTriangleIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-amber-900 mb-3 flex items-center space-x-2">
                  <span>{t('legal_acceptance_title')}</span>
                  <CheckCircleIcon className="w-5 h-5 text-amber-600" />
                </h4>
                <p className="text-amber-800 text-lg leading-relaxed">
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