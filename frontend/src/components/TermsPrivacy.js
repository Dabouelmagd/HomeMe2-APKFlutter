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
        <div key={section.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 rounded-2xl transition-all duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 ${
                activeTab === 'terms' 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' 
                  : 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
              }`}>
                {getSectionIcon(section.id, index)}
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {section.title}
                </h3>
                <p className="text-sm text-gray-500">
                  {expandedSections[section.id] 
                    ? (t('legal_clickToCollapse') || 'انقر للطي') 
                    : (t('legal_clickToExpand') || 'انقر للتوسيع')
                  }
                </p>
              </div>
            </div>
            
            <div className={`p-2 rounded-lg transition-all duration-200 ${
              expandedSections[section.id] 
                ? (activeTab === 'terms' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600')
                : 'bg-gray-100 text-gray-400'
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
                <div className={`p-5 rounded-xl ${
                  activeTab === 'terms' 
                    ? 'bg-blue-50 border-l-4 border-blue-400' 
                    : 'bg-emerald-50 border-l-4 border-emerald-400'
                }`}>
                  <p className="text-gray-700 leading-relaxed text-base">
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
        
        {/* Ultra Modern Header Content */}
        <div className="relative max-w-8xl mx-auto px-8 sm:px-12 lg:px-20">
          <div className="flex items-center justify-between py-16">
            <div className="flex items-center space-x-12">
              <button
                onClick={handleBack}
                className="group relative p-6 text-white hover:text-cyan-200 transition-all duration-500 hover:scale-110"
              >
                {/* Button Glassmorphism */}
                <div className="absolute inset-0 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 group-hover:bg-white/20 group-hover:border-cyan-300/30 transition-all duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl group-hover:from-cyan-300/20 transition-all duration-500"></div>
                <ArrowLeftIcon className="relative w-7 h-7 group-hover:-translate-x-2 transition-all duration-500" />
              </button>
              
              <div className="space-y-6">
                {/* Animated Indicator Dots */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-pulse shadow-lg shadow-cyan-400/50"></div>
                    <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full animate-pulse delay-300 shadow-lg shadow-purple-400/50"></div>
                    <div className="w-1.5 h-1.5 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full animate-pulse delay-500 shadow-lg shadow-indigo-400/50"></div>
                  </div>
                  <div className="text-cyan-300/60 text-sm font-semibold tracking-wider uppercase">Legal Hub</div>
                </div>
                
                {/* Main Title with Advanced Typography */}
                <div className="space-y-4">
                  <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-300 tracking-tight leading-none">
                    {t('legal_title')}
                  </h1>
                  <div className="w-24 h-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full shadow-lg shadow-cyan-400/30"></div>
                </div>
                
                <p className="text-white/80 text-2xl font-light max-w-2xl leading-relaxed tracking-wide">
                  {t('legal_subtitle')}
                </p>
                
                {/* Status Indicators */}
                <div className="flex items-center space-x-8 pt-4">
                  <div className="flex items-center space-x-3 px-6 py-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <span className="text-green-300 text-sm font-semibold">Updated 2024</span>
                  </div>
                  <div className="flex items-center space-x-3 px-6 py-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-300 shadow-lg shadow-blue-400/50"></div>
                    <span className="text-blue-300 text-sm font-semibold">3 Languages</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Ultra Modern Decorative Elements */}
            <div className="hidden xl:flex items-center space-x-8">
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-[2rem] blur-2xl group-hover:blur-3xl transition-all duration-700"></div>
                <div className="relative p-8 bg-white/10 backdrop-blur-2xl rounded-[2rem] border border-white/20 group-hover:bg-white/15 group-hover:border-cyan-300/30 transition-all duration-700 hover:scale-105">
                  <ShieldCheckIcon className="w-12 h-12 text-white group-hover:text-cyan-200 group-hover:scale-110 transition-all duration-500" />
                </div>
              </div>
              
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-[2rem] blur-2xl group-hover:blur-3xl transition-all duration-700"></div>
                <div className="relative p-8 bg-white/10 backdrop-blur-2xl rounded-[2rem] border border-white/20 group-hover:bg-white/15 group-hover:border-purple-300/30 transition-all duration-700 hover:scale-105">
                  <DocumentTextIcon className="w-12 h-12 text-white group-hover:text-purple-200 group-hover:scale-110 transition-all duration-500" />
                </div>
              </div>
              
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-cyan-500/20 rounded-[2rem] blur-2xl group-hover:blur-3xl transition-all duration-700"></div>
                <div className="relative p-8 bg-white/10 backdrop-blur-2xl rounded-[2rem] border border-white/20 group-hover:bg-white/15 group-hover:border-indigo-300/30 transition-all duration-700 hover:scale-105">
                  <ScaleIcon className="w-12 h-12 text-white group-hover:text-indigo-200 group-hover:scale-110 transition-all duration-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-8 sm:px-12 lg:px-20 py-16">
        {/* Ultra Modern Tab Navigation */}
        <div className="relative mb-20">
          {/* Background Glow Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/5 to-pink-500/10 rounded-[3rem] blur-3xl"></div>
          
          <div className="relative flex space-x-3 bg-black/20 backdrop-blur-3xl rounded-[3rem] p-4 border border-white/10 shadow-2xl">
            <button
              onClick={() => setActiveTab('terms')}
              className={`group relative flex-1 flex items-center justify-center px-10 py-8 rounded-[2.5rem] text-xl font-bold transition-all duration-700 overflow-hidden ${
                activeTab === 'terms'
                  ? 'text-white scale-105'
                  : 'text-white/60 hover:text-white/90 hover:scale-102'
              }`}
            >
              {/* Active Background */}
              {activeTab === 'terms' && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 rounded-[2.5rem] animate-gradient-x"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20 rounded-[2.5rem]"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10 rounded-[2.5rem] animate-pulse"></div>
                </>
              )}
              
              {/* Hover Background */}
              <div className="absolute inset-0 bg-white/5 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
              
              {/* Content */}
              <DocumentTextIcon className={`relative w-7 h-7 mr-4 transition-all duration-500 ${
                activeTab === 'terms' ? 'scale-110 text-white' : 'group-hover:scale-105'
              }`} />
              <span className="relative font-black tracking-wide">{t('legal_termsOfUse')}</span>
              
              {/* Active Indicator */}
              {activeTab === 'terms' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-cyan-300 to-white rounded-full animate-ping shadow-lg shadow-cyan-300/50"></div>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('privacy')}
              className={`group relative flex-1 flex items-center justify-center px-10 py-8 rounded-[2.5rem] text-xl font-bold transition-all duration-700 overflow-hidden ${
                activeTab === 'privacy'
                  ? 'text-white scale-105'
                  : 'text-white/60 hover:text-white/90 hover:scale-102'
              }`}
            >
              {/* Active Background */}
              {activeTab === 'privacy' && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 rounded-[2.5rem] animate-gradient-x"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20 rounded-[2.5rem]"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10 rounded-[2.5rem] animate-pulse"></div>
                </>
              )}
              
              {/* Hover Background */}
              <div className="absolute inset-0 bg-white/5 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
              
              {/* Content */}
              <ShieldCheckIcon className={`relative w-7 h-7 mr-4 transition-all duration-500 ${
                activeTab === 'privacy' ? 'scale-110 text-white' : 'group-hover:scale-105'
              }`} />
              <span className="relative font-black tracking-wide">{t('legal_privacyPolicy')}</span>
              
              {/* Active Indicator */}
              {activeTab === 'privacy' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-300 to-white rounded-full animate-ping shadow-lg shadow-emerald-300/50"></div>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Ultra Modern Introduction Card */}
          <div className="relative mb-16">
            {/* Background Glow Effects */}
            <div className={`absolute inset-0 rounded-[3rem] blur-3xl opacity-30 ${
              activeTab === 'terms' 
                ? 'bg-gradient-to-br from-cyan-400/40 to-blue-500/40' 
                : 'bg-gradient-to-br from-emerald-400/40 to-teal-500/40'
            }`}></div>
            
            <div className="relative bg-black/20 backdrop-blur-3xl rounded-[3rem] p-12 border border-white/10 shadow-2xl overflow-hidden">
              {/* Animated Background Pattern */}
              <div className={`absolute inset-0 opacity-5 ${
                activeTab === 'terms' 
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600' 
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600'
              } animate-pulse`}></div>
              
              {/* Floating Geometric Elements */}
              <div className={`absolute top-8 right-8 w-32 h-32 rounded-full blur-2xl opacity-20 ${
                activeTab === 'terms' ? 'bg-cyan-400' : 'bg-emerald-400'
              } animate-float`}></div>
              <div className={`absolute bottom-8 left-8 w-24 h-24 rounded-full blur-2xl opacity-15 ${
                activeTab === 'terms' ? 'bg-blue-400' : 'bg-teal-400'
              } animate-float-delay-1`}></div>
              
              <div className="relative flex items-start space-x-10">
                {/* Ultra Modern Icon */}
                <div className="relative group">
                  <div className={`absolute inset-0 rounded-[2rem] blur-2xl ${
                    activeTab === 'terms' 
                      ? 'bg-gradient-to-br from-cyan-400/60 to-blue-500/60' 
                      : 'bg-gradient-to-br from-emerald-400/60 to-teal-500/60'
                  } group-hover:blur-3xl transition-all duration-700`}></div>
                  
                  <div className={`relative p-8 rounded-[2rem] backdrop-blur-2xl border border-white/20 transition-all duration-700 group-hover:scale-110 ${
                    activeTab === 'terms' 
                      ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20' 
                      : 'bg-gradient-to-br from-emerald-500/20 to-teal-600/20'
                  }`}>
                    {activeTab === 'terms' ? (
                      <ClipboardDocumentCheckIcon className="w-16 h-16 text-white group-hover:scale-110 transition-all duration-500" />
                    ) : (
                      <UserCircleIcon className="w-16 h-16 text-white group-hover:scale-110 transition-all duration-500" />
                    )}
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <h2 className="text-4xl font-black text-white tracking-tight">
                        {activeTab === 'terms' ? t('legal_terms_title') : t('legal_privacy_title') || 'Privacy Policy'}
                      </h2>
                      <div className={`p-3 rounded-2xl ${
                        activeTab === 'terms' ? 'bg-cyan-500/20' : 'bg-emerald-500/20'
                      } animate-bounce`}>
                        <CheckCircleIcon className={`w-8 h-8 ${
                          activeTab === 'terms' ? 'text-cyan-300' : 'text-emerald-300'
                        }`} />
                      </div>
                    </div>
                    
                    <div className={`w-32 h-1.5 rounded-full ${
                      activeTab === 'terms' 
                        ? 'bg-gradient-to-r from-cyan-400 to-blue-500' 
                        : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                    } shadow-lg ${
                      activeTab === 'terms' ? 'shadow-cyan-400/30' : 'shadow-emerald-400/30'
                    }`}></div>
                  </div>
                  
                  <p className="text-white/90 text-2xl leading-relaxed font-light tracking-wide">
                    {activeTab === 'terms' 
                      ? t('legal_terms_description') 
                      : t('legal_privacy_description') || 'Learn how we collect, use, and protect your personal information.'
                    }
                  </p>
                  
                  {/* Modern Status Badge */}
                  <div className="flex items-center space-x-6">
                    <div className={`flex items-center space-x-4 px-8 py-4 rounded-[2rem] backdrop-blur-xl border transition-all duration-500 hover:scale-105 ${
                      activeTab === 'terms' 
                        ? 'bg-cyan-500/10 border-cyan-400/20 shadow-lg shadow-cyan-400/10' 
                        : 'bg-emerald-500/10 border-emerald-400/20 shadow-lg shadow-emerald-400/10'
                    }`}>
                      <ClockIcon className={`w-6 h-6 ${
                        activeTab === 'terms' ? 'text-cyan-300' : 'text-emerald-300'
                      }`} />
                      <span className="text-white text-lg font-bold tracking-wide">{t('legal_lastUpdated')}: 30/9/2025</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          {activeTab === 'terms' ? renderContent(termsContent) : renderContent(privacyContent)}

          {/* Complete Contact Information */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 shadow-lg p-8 mt-10">
            <div className="flex items-center space-x-6 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <EnvelopeIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {t('legal_contact_title')}
              </h3>
            </div>
            
            <p className="text-gray-700 text-lg mb-8 leading-relaxed">
              {t('legal_contact_description')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Email */}
              <div className="flex items-center space-x-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('legal_contact_email')}</p>
                  <p className="text-sm text-gray-500">{t('legal_contact_email_desc')}</p>
                  <p className="text-lg font-semibold text-gray-900">info@datalifeai.com</p>
                </div>
              </div>
              
              {/* Website */}
              <div className="flex items-center space-x-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DocumentTextIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('legal_contact_website')}</p>
                  <p className="text-sm text-gray-500">{t('legal_contact_website_desc')}</p>
                  <p className="text-lg font-semibold text-gray-900">www.homemeapp.net</p>
                </div>
              </div>
              
              {/* Address */}
              <div className="flex items-center space-x-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <MapPinIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('legal_contact_address')}</p>
                  <p className="text-sm text-gray-500">{t('legal_contact_address_desc')}</p>
                  <p className="text-lg font-semibold text-gray-900">{t('legal_contact_addressValue')}</p>
                </div>
              </div>
              
              {/* Support */}
              <div className="flex items-center space-x-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CheckCircleIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('legal_contact_support')}</p>
                  <p className="text-sm text-gray-500">{t('legal_contact_support_desc')}</p>
                  <p className="text-lg font-semibold text-gray-900">{t('legal_contact_support_method')}</p>
                </div>
              </div>
            </div>
            
            {/* Additional Contact Information */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h4 className="text-xl font-bold text-gray-900 mb-4">{t('legal_contact_get_in_touch')}</h4>
              <p className="text-gray-700 mb-4">{t('legal_contact_get_in_touch_desc')}</p>
              
              <div className="mb-4">
                <h5 className="text-lg font-semibold text-gray-900 mb-2">{t('legal_contact_primary')}</h5>
                <p className="text-gray-700">{t('legal_contact_primary_desc')}</p>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h5 className="text-lg font-semibold text-blue-800 mb-2">{t('legal_contact_before_contact')}</h5>
                <p className="text-blue-700">{t('legal_contact_before_contact_desc')}</p>
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

// Add advanced CSS animations
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
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px) rotate(0deg);
    }
    33% {
      transform: translateY(-30px) rotate(5deg);
    }
    66% {
      transform: translateY(-15px) rotate(-3deg);
    }
  }
  
  @keyframes float-delay-1 {
    0%, 100% {
      transform: translateY(0px) rotate(0deg);
    }
    33% {
      transform: translateY(-20px) rotate(-7deg);
    }
    66% {
      transform: translateY(-35px) rotate(4deg);
    }
  }
  
  @keyframes float-delay-2 {
    0%, 100% {
      transform: translateY(0px) rotate(0deg);
    }
    33% {
      transform: translateY(-25px) rotate(8deg);
    }
    66% {
      transform: translateY(-10px) rotate(-5deg);
    }
  }
  
  @keyframes spin-slow {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  @keyframes pulse-glow {
    0%, 100% {
      opacity: 0.5;
      filter: blur(20px);
    }
    50% {
      opacity: 0.8;
      filter: blur(30px);
    }
  }
  
  .animate-gradient-x {
    animation: gradient-x 12s ease infinite;
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.8s ease-out;
  }
  
  .animate-float {
    animation: float 20s ease-in-out infinite;
  }
  
  .animate-float-delay-1 {
    animation: float-delay-1 25s ease-in-out infinite;
  }
  
  .animate-float-delay-2 {
    animation: float-delay-2 18s ease-in-out infinite;
  }
  
  .animate-spin-slow {
    animation: spin-slow 30s linear infinite;
  }
  
  .animate-pulse-glow {
    animation: pulse-glow 4s ease-in-out infinite;
  }
  
  .hover\\:scale-102:hover {
    transform: scale(1.02);
  }
`;
document.head.appendChild(style);