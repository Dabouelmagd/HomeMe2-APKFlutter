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
      content: t('legal_terms_acceptance_content')
    },
    {
      id: 'personal_use',
      title: t('legal_terms_personalUse_title'),
      content: t('legal_terms_personalUse_content')
    },
    {
      id: 'content',
      title: t('legal_terms_content_title'),
      content: t('legal_terms_content_content')
    },
    {
      id: 'liability',
      title: t('legal_terms_liability_title'),
      content: t('legal_terms_liability_content')
    },
    {
      id: 'modifications',
      title: t('legal_terms_modifications_title'),
      content: t('legal_terms_modifications_content')
    },
    {
      id: 'governing_law',
      title: t('legal_terms_governingLaw_title'),
      content: t('legal_terms_governingLaw_content')
    }
  ];

  const privacyContent = [
    {
      id: 'info_collection',
      title: t('legal_privacy_infoCollection_title'),
      content: t('legal_privacy_infoCollection_content')
    },
    {
      id: 'info_use',
      title: t('legal_privacy_infoUse_title'),
      content: t('legal_privacy_infoUse_content')
    },
    {
      id: 'info_protection',
      title: t('legal_privacy_infoProtection_title'),
      content: t('legal_privacy_infoProtection_content')
    },
    {
      id: 'info_sharing',
      title: t('legal_privacy_infoSharing_title'),
      content: t('legal_privacy_infoSharing_content')
    },
    {
      id: 'user_rights',
      title: t('legal_privacy_userRights_title'),
      content: t('legal_privacy_userRights_content')
    },
    {
      id: 'policy_changes',
      title: t('legal_privacy_policyChanges_title'),
      content: t('legal_privacy_policyChanges_content')
    },
    {
      id: 'applicable_laws',
      title: t('legal_privacy_applicableLaws_title'),
      content: t('legal_privacy_applicableLaws_content')
    }
  ];

  const renderContent = (content) => (
    <div className="space-y-4">
      {content.map((section, index) => (
        <div key={section.id} className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-gray-700/30 transition-all duration-300">
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full px-6 py-5 flex items-center justify-between text-left rounded-2xl transition-all duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 ${
                activeTab === 'terms' 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                  : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
              }`}>
                {getSectionIcon(section.id, index)}
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">
                  {section.title}
                </h3>
                <p className="text-sm text-white/60">
                  {expandedSections[section.id] 
                    ? (t('legal_clickToCollapse') || 'انقر للطي') 
                    : (t('legal_clickToExpand') || 'انقر للتوسيع')
                  }
                </p>
              </div>
            </div>
            
            <div className={`p-2 rounded-lg transition-all duration-200 ${
              expandedSections[section.id] 
                ? (activeTab === 'terms' ? 'bg-blue-600/20 text-blue-300' : 'bg-emerald-600/20 text-emerald-300')
                : 'bg-white/10 text-white/40'
            }`}>
              {expandedSections[section.id] ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
            </div>
          </button>
          
          {expandedSections[section.id] && (
            <div className="px-6 pb-6">
              <div className="ml-16">
                <div className={`p-5 rounded-xl border-l-4 ${
                  activeTab === 'terms' 
                    ? 'bg-blue-900/30 border-blue-400' 
                    : 'bg-emerald-900/30 border-emerald-400'
                }`}>
                  <p className="text-white/90 leading-relaxed text-base">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Modern Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
      </div>
      
      {/* Modern Header */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-700">
        <div className="absolute inset-0 bg-black/20"></div>
        
        {/* Modern Header Content */}
        <div className="relative max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <button
                onClick={handleBack}
                className="p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all duration-300"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </button>
              
              <div>
                <h1 className="text-5xl font-bold text-white mb-2">
                  {t('legal_title')}
                </h1>
                <p className="text-white/80 text-xl">
                  {t('legal_subtitle')}
                </p>
              </div>
            </div>
            
            {/* Decorative Icons */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="p-4 bg-white/10 rounded-2xl">
                <ShieldCheckIcon className="w-8 h-8 text-white" />
              </div>
              <div className="p-4 bg-white/10 rounded-2xl">
                <DocumentTextIcon className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Modern Tab Navigation */}
        <div className="flex space-x-2 bg-gray-800/50 rounded-2xl p-2 mb-8">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-300 ${
              activeTab === 'terms'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <DocumentTextIcon className="w-5 h-5 mr-3" />
            {t('legal_termsOfUse')}
          </button>
          
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-300 ${
              activeTab === 'privacy'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <ShieldCheckIcon className="w-5 h-5 mr-3" />
            {t('legal_privacyPolicy')}
          </button>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Modern Introduction Card */}
          <div className={`rounded-2xl p-8 mb-8 shadow-xl ${
            activeTab === 'terms' 
              ? 'bg-gradient-to-br from-blue-900/50 to-purple-900/50' 
              : 'bg-gradient-to-br from-emerald-900/50 to-teal-900/50'
          } border border-white/10 backdrop-blur-sm`}>
            <div className="flex items-start space-x-6">
              <div className={`p-4 rounded-2xl ${
                activeTab === 'terms' 
                  ? 'bg-gradient-to-br from-blue-600 to-purple-600' 
                  : 'bg-gradient-to-br from-emerald-600 to-teal-600'
              } shadow-lg`}>
                {activeTab === 'terms' ? (
                  <ClipboardDocumentCheckIcon className="w-8 h-8 text-white" />
                ) : (
                  <UserCircleIcon className="w-8 h-8 text-white" />
                )}
              </div>
              
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-3">
                  {activeTab === 'terms' ? t('legal_terms_title') : t('legal_privacy_title') || 'Privacy Policy'}
                </h2>
                
                <p className="text-white/80 text-lg leading-relaxed mb-4">
                  {activeTab === 'terms' 
                    ? t('legal_terms_description') 
                    : t('legal_privacy_description') || 'Learn how we collect, use, and protect your personal information.'
                  }
                </p>
                
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  activeTab === 'terms' 
                    ? 'bg-blue-600/20 text-blue-300' 
                    : 'bg-emerald-600/20 text-emerald-300'
                }`}>
                  <ClockIcon className="w-4 h-4" />
                  <span>{t('legal_lastUpdated')}: 30/9/2025</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          {activeTab === 'terms' ? renderContent(termsContent) : renderContent(privacyContent)}

          {/* Modern Contact Information */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-white/10 shadow-xl p-8 mt-10">
            <div className="flex items-center space-x-6 mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <EnvelopeIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white">
                {t('legal_contact_title')}
              </h3>
            </div>
            
            <p className="text-white/80 text-xl mb-8 leading-relaxed">
              {t('legal_contact_description')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Email */}
              <div className="bg-gray-700/40 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-gray-600/40 transition-all duration-300">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                    <EnvelopeIcon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-white">{t('legal_contact_email')}</h4>
                </div>
                <p className="text-white/70 text-sm mb-2">{t('legal_contact_email_desc')}</p>
                <p className="text-white font-semibold">info@datalifeai.com</p>
              </div>
              
              {/* Website */}
              <div className="bg-gray-700/40 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-gray-600/40 transition-all duration-300">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                    <DocumentTextIcon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-white">{t('legal_contact_website')}</h4>
                </div>
                <p className="text-white/70 text-sm mb-2">{t('legal_contact_website_desc')}</p>
                <p className="text-white font-semibold">www.homemeapp.net</p>
              </div>
              
              {/* Address */}
              <div className="bg-gray-700/40 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-gray-600/40 transition-all duration-300">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                    <MapPinIcon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-white">{t('legal_contact_address')}</h4>
                </div>
                <p className="text-white/70 text-sm mb-2">{t('legal_contact_address_desc')}</p>
                <p className="text-white font-semibold">{t('legal_contact_addressValue')}</p>
              </div>
              
              {/* Support */}
              <div className="bg-gray-700/40 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-gray-600/40 transition-all duration-300">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
                    <CheckCircleIcon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-white">{t('legal_contact_support')}</h4>
                </div>
                <p className="text-white/70 text-sm mb-2">{t('legal_contact_support_desc')}</p>
                <p className="text-white font-semibold">{t('legal_contact_support_method')}</p>
              </div>
            </div>
            
            {/* Additional Contact Information */}
            <div className="bg-gray-700/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h4 className="text-2xl font-bold text-white mb-4">{t('legal_contact_get_in_touch')}</h4>
              <p className="text-white/80 text-lg mb-6">{t('legal_contact_get_in_touch_desc')}</p>
              
              <div className="mb-6">
                <h5 className="text-xl font-bold text-white mb-3">{t('legal_contact_primary')}</h5>
                <p className="text-white/80">{t('legal_contact_primary_desc')}</p>
              </div>
              
              <div className="bg-blue-900/40 rounded-xl p-5 border border-blue-400/20">
                <h5 className="text-xl font-bold text-blue-300 mb-3">{t('legal_contact_before_contact')}</h5>
                <p className="text-blue-200">{t('legal_contact_before_contact_desc')}</p>
              </div>
            </div>
          </div>

          {/* Modern Acceptance Notice */}
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-900/30 via-yellow-900/30 to-orange-900/30 border border-amber-400/20 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500"></div>
            </div>
            
            <div className="relative flex items-start space-x-4">
              <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
                <ExclamationTriangleIcon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-bold text-amber-200 mb-3 flex items-center space-x-3">
                  <span>{t('legal_acceptance_title')}</span>
                  <CheckCircleIcon className="w-6 h-6 text-amber-400" />
                </h4>
                <p className="text-amber-100 text-lg leading-relaxed">
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

// Add simple CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out;
  }
`;
document.head.appendChild(style);