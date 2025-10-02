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
    <div className="space-y-6">
      {content.map((section, index) => (
        <div key={section.id} className="group relative">
          {/* Glow effect on hover */}
          <div className={`absolute inset-0 rounded-3xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${
            activeTab === 'terms' 
              ? 'bg-gradient-to-r from-blue-400 to-indigo-500' 
              : 'bg-gradient-to-r from-emerald-400 to-teal-500'
          }`}></div>
          
          <div className="relative bg-white/90 backdrop-blur-md rounded-3xl border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-10 py-8 flex items-center justify-between text-left hover:bg-white/60 rounded-3xl transition-all duration-500 group-hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-8">
                <div className={`relative flex-shrink-0 w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 shadow-2xl ${
                  activeTab === 'terms' 
                    ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 group-hover:from-blue-700 group-hover:via-indigo-700 group-hover:to-purple-700' 
                    : 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 group-hover:from-emerald-700 group-hover:via-teal-700 group-hover:to-cyan-700'
                } hover:scale-110 hover:rotate-3`}>
                  {/* Icon background glow */}
                  <div className="absolute inset-0 bg-white/20 rounded-3xl blur-md"></div>
                  <div className="relative z-10">
                    {getSectionIcon(section.id, index)}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900 group-hover:text-gray-800 transition-colors tracking-tight">
                    {section.title}
                  </h3>
                  <p className={`text-base font-medium transition-colors ${
                    expandedSections[section.id] 
                      ? (activeTab === 'terms' ? 'text-blue-600' : 'text-emerald-600')
                      : 'text-gray-500 group-hover:text-gray-600'
                  }`}>
                    {expandedSections[section.id] ? t('legal_clickToCollapse') || '▲ Click to collapse' : t('legal_clickToExpand') || '▼ Click to expand'}
                  </p>
                </div>
              </div>
              
              <div className={`relative p-4 rounded-2xl transition-all duration-500 hover:scale-110 ${
                expandedSections[section.id] 
                  ? (activeTab === 'terms' 
                      ? 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 shadow-lg' 
                      : 'bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 shadow-lg')
                  : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600'
              }`}>
                {expandedSections[section.id] ? (
                  <ChevronUpIcon className="w-6 h-6 transform transition-transform duration-300 rotate-180" />
                ) : (
                  <ChevronDownIcon className="w-6 h-6 transform transition-transform duration-300 group-hover:translate-y-1" />
                )}
              </div>
            </button>
            
            {expandedSections[section.id] && (
              <div className="px-10 pb-10 animate-fadeIn">
                <div className="pl-20">
                  <div className={`relative p-8 rounded-2xl shadow-inner transition-all duration-300 ${
                    activeTab === 'terms' 
                      ? 'bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border-l-4 border-blue-500' 
                      : 'bg-gradient-to-br from-emerald-50/80 to-teal-50/80 border-l-4 border-emerald-500'
                  }`}>
                    {/* Content decorative elements */}
                    <div className={`absolute top-4 right-4 w-12 h-12 rounded-full opacity-10 ${
                      activeTab === 'terms' ? 'bg-blue-400' : 'bg-emerald-400'
                    }`}></div>
                    <div className={`absolute bottom-4 right-8 w-8 h-8 rounded-full opacity-5 ${
                      activeTab === 'terms' ? 'bg-indigo-400' : 'bg-teal-400'
                    }`}></div>
                    
                    <p className="text-gray-800 leading-relaxed text-xl font-medium whitespace-pre-line relative z-10">
                      {section.content}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-x-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -right-10 w-72 h-72 bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-20 w-96 h-96 bg-gradient-to-tr from-purple-400/8 to-blue-500/8 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-gradient-to-tl from-indigo-400/8 to-purple-500/8 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      {/* Modern Header with Enhanced Gradient */}
      <div className="relative">
        {/* Enhanced Background Gradient with Animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 animate-gradient-x"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/30"></div>
        <div className="absolute inset-0 bg-black/5"></div>
        
        {/* Enhanced Header Content */}
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between py-12">
            <div className="flex items-center space-x-8">
              <button
                onClick={handleBack}
                className="group p-4 text-white/80 hover:text-white hover:bg-white/15 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/10"
              >
                <ArrowLeftIcon className="w-6 h-6 group-hover:-translate-x-1 transition-transform duration-300" />
              </button>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-white/70 rounded-full animate-pulse delay-200"></div>
                  <div className="w-1 h-1 bg-white/50 rounded-full animate-pulse delay-400"></div>
                </div>
                <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
                  {t('legal_title')}
                </h1>
                <p className="text-blue-100 text-xl font-medium max-w-md leading-relaxed">
                  {t('legal_subtitle')}
                </p>
              </div>
            </div>
            
            {/* Enhanced Decorative Elements */}
            <div className="hidden lg:flex items-center space-x-6">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-3xl blur-lg"></div>
                <div className="relative p-5 bg-white/10 rounded-3xl backdrop-blur-sm hover:bg-white/15 transition-all duration-300 hover:scale-105 group cursor-pointer">
                  <ShieldCheckIcon className="w-10 h-10 text-white group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-3xl blur-lg"></div>
                <div className="relative p-5 bg-white/10 rounded-3xl backdrop-blur-sm hover:bg-white/15 transition-all duration-300 hover:scale-105 group cursor-pointer">
                  <DocumentTextIcon className="w-10 h-10 text-white group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-3xl blur-lg"></div>
                <div className="relative p-5 bg-white/10 rounded-3xl backdrop-blur-sm hover:bg-white/15 transition-all duration-300 hover:scale-105 group cursor-pointer">
                  <ScaleIcon className="w-10 h-10 text-white group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        {/* Premium Tab Navigation */}
        <div className="relative mb-16">
          {/* Background glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 rounded-3xl blur-xl"></div>
          <div className="relative flex space-x-2 bg-white/80 backdrop-blur-md rounded-3xl p-3 shadow-2xl border border-white/30">
            <button
              onClick={() => setActiveTab('terms')}
              className={`group flex-1 flex items-center justify-center px-8 py-6 rounded-2xl text-lg font-bold transition-all duration-500 relative overflow-hidden ${
                activeTab === 'terms'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl shadow-blue-500/30 transform scale-[1.03]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/70 hover:scale-[1.01]'
              }`}
            >
              {activeTab === 'terms' && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-600/20 animate-pulse"></div>
              )}
              <DocumentTextIcon className={`w-6 h-6 mr-4 transition-all duration-300 ${
                activeTab === 'terms' ? 'scale-110' : 'group-hover:scale-105'
              }`} />
              <span className="relative z-10">{t('legal_termsOfUse')}</span>
              {activeTab === 'terms' && (
                <div className="absolute -right-1 -top-1 w-3 h-3 bg-white/30 rounded-full animate-ping"></div>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('privacy')}
              className={`group flex-1 flex items-center justify-center px-8 py-6 rounded-2xl text-lg font-bold transition-all duration-500 relative overflow-hidden ${
                activeTab === 'privacy'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-2xl shadow-emerald-500/30 transform scale-[1.03]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/70 hover:scale-[1.01]'
              }`}
            >
              {activeTab === 'privacy' && (
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-cyan-600/20 animate-pulse"></div>
              )}
              <ShieldCheckIcon className={`w-6 h-6 mr-4 transition-all duration-300 ${
                activeTab === 'privacy' ? 'scale-110' : 'group-hover:scale-105'
              }`} />
              <span className="relative z-10">{t('legal_privacyPolicy')}</span>
              {activeTab === 'privacy' && (
                <div className="absolute -right-1 -top-1 w-3 h-3 bg-white/30 rounded-full animate-ping"></div>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Premium Introduction Card */}
          <div className={`relative overflow-hidden rounded-3xl p-10 shadow-2xl transition-all duration-700 ${
            activeTab === 'terms' 
              ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/50' 
              : 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200/50'
          }`}>
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className={`absolute inset-0 bg-gradient-to-r ${
                activeTab === 'terms' 
                  ? 'from-blue-500 to-purple-600' 
                  : 'from-emerald-500 to-teal-600'
              } animate-pulse`}></div>
            </div>
            
            {/* Floating elements */}
            <div className={`absolute top-4 right-4 w-20 h-20 rounded-full blur-2xl opacity-20 ${
              activeTab === 'terms' ? 'bg-blue-400' : 'bg-emerald-400'
            } animate-pulse delay-300`}></div>
            <div className={`absolute bottom-4 left-4 w-16 h-16 rounded-full blur-2xl opacity-15 ${
              activeTab === 'terms' ? 'bg-purple-400' : 'bg-teal-400'
            } animate-pulse delay-700`}></div>
            
            <div className="relative flex items-start space-x-8">
              <div className={`relative p-6 rounded-3xl shadow-2xl transition-all duration-500 ${
                activeTab === 'terms' 
                  ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600' 
                  : 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600'
              } hover:scale-110 group`}>
                {/* Icon glow effect */}
                <div className="absolute inset-0 bg-white/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {activeTab === 'terms' ? (
                  <ClipboardDocumentCheckIcon className="w-12 h-12 text-white relative z-10" />
                ) : (
                  <UserCircleIcon className="w-12 h-12 text-white relative z-10" />
                )}
              </div>
              
              <div className="flex-1 space-y-6">
                <div className="flex items-center space-x-4 mb-4">
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                    {activeTab === 'terms' ? t('legal_terms_title') : t('legal_privacy_title') || 'Privacy Policy'}
                  </h2>
                  <div className={`p-2 rounded-full ${
                    activeTab === 'terms' ? 'bg-blue-100' : 'bg-emerald-100'
                  } animate-bounce`}>
                    <CheckCircleIcon className={`w-6 h-6 ${
                      activeTab === 'terms' ? 'text-blue-600' : 'text-emerald-600'
                    }`} />
                  </div>
                </div>
                
                <p className="text-gray-700 text-xl leading-relaxed font-medium">
                  {activeTab === 'terms' 
                    ? t('legal_terms_description') 
                    : t('legal_privacy_description') || 'Learn how we collect, use, and protect your personal information.'
                  }
                </p>
                
                <div className="flex items-center space-x-6">
                  <div className={`flex items-center space-x-3 px-6 py-3 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 ${
                    activeTab === 'terms' 
                      ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800' 
                      : 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800'
                  }`}>
                    <ClockIcon className="w-5 h-5" />
                    <span className="text-lg font-bold">{t('legal_lastUpdated')}: 30/9/2025</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          {activeTab === 'terms' ? renderContent(termsContent) : renderContent(privacyContent)}

          {/* Enhanced Contact Information */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 shadow-lg p-8 mt-10">
            <div className="flex items-center space-x-6 mb-6">
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

// Add custom CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes gradient-x {
    0%, 100% {
      background-size: 200% 200%;
      background-position: left center;
    }
    50% {
      background-size: 200% 200%;
      background-position: right center;
    }
  }
  
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
  
  .animate-gradient-x {
    animation: gradient-x 8s ease infinite;
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out;
  }
`;
document.head.appendChild(style);