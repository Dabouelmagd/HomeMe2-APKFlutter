import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BookOpenIcon,
  VideoCameraIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ClockIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import WrittenGuide from './WrittenGuide';

const HelpCenter = () => {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSections, setFilteredSections] = useState([]);

  const helpSections = [
    {
      id: 'getting-started',
      title: 'البدء',
      icon: BookOpenIcon,
      articles: [
        { title: 'كيفية تسجيل الدخول لأول مرة', link: '#' },
        { title: 'إعداد الملف الشخصي', link: '#' },
        { title: 'فهم لوحة التحكم', link: '#' }
      ]
    },
    {
      id: 'compound-management',
      title: 'إدارة المجمع',
      icon: BookOpenIcon,
      articles: [
        { title: 'إنشاء مساكن جديدة', link: '#' },
        { title: 'إدارة المقيمين', link: '#' },
        { title: 'تحميل شعار المجمع', link: '#' },
        { title: 'إعداد روابط التسجيل', link: '#' }
      ]
    },
    {
      id: 'services-maintenance',
      title: 'الخدمات والصيانة',
      icon: BookOpenIcon,
      articles: [
        { title: 'طلب خدمة صيانة', link: '#' },
        { title: 'إدارة الخدمات المتاحة', link: '#' },
        { title: 'تتبع حالة الطلبات', link: '#' }
      ]
    },
    {
      id: 'family-management',
      title: 'إدارة العائلة',
      icon: BookOpenIcon,
      articles: [
        { title: 'إضافة أفراد العائلة', link: '#' },
        { title: 'تعديل معلومات الأفراد', link: '#' },
        { title: 'إدارة الضيوف', link: '#' }
      ]
    },
    {
      id: 'financial-services',
      title: 'الخدمات المالية',
      icon: BookOpenIcon,
      articles: [
        { title: 'دفع الفواتير', link: '#' },
        { title: 'عرض السجل المالي', link: '#' },
        { title: 'إعداد الدفع التلقائي', link: '#' }
      ]
    },
    {
      id: 'communication',
      title: 'التواصل والإشعارات',
      icon: BookOpenIcon,
      articles: [
        { title: 'استخدام مركز الرسائل', link: '#' },
        { title: 'إدارة الإشعارات', link: '#' },
        { title: 'استخدام الدردشة', link: '#' }
      ]
    }
  ];

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  // Search functionality
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredSections([]);
      return;
    }

    const filtered = helpSections.filter(section => {
      const sectionMatch = section.title.toLowerCase().includes(query.toLowerCase());
      const articleMatch = section.articles.some(article => 
        article.title.toLowerCase().includes(query.toLowerCase())
      );
      return sectionMatch || articleMatch;
    });
    setFilteredSections(filtered);
  };

  const sectionsToShow = searchQuery.trim() ? filteredSections : helpSections;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="relative">
          <QuestionMarkCircleIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <SparklesIcon className="h-6 w-6 text-yellow-500 absolute top-0 right-1/2 transform translate-x-8 animate-pulse" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {t('help_center')}
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          {t('help_center_description')}
        </p>
        
        {/* Search Bar */}
        <div className="max-w-md mx-auto">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t('search_help_topics')}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-500">
              {sectionsToShow.length} {t('results_found')}
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions - Before Guide */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <button 
          onClick={() => {
            const guideSection = document.querySelector('[class*="bg-gradient-to-br from-purple-600"]');
            if (guideSection) guideSection.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
        >
          <VideoCameraIcon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">{t('video_tutorials', 'دروس الفيديو')}</h3>
          <p className="text-sm text-gray-600">{t('watch_video_guides', 'شاهد الدليل المكتوب أدناه')}</p>
        </button>
        
        <button 
          onClick={() => window.location.href = '/app/messages'}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-lg hover:border-green-300 transition-all cursor-pointer"
        >
          <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">{t('live_chat', 'الدردشة المباشرة')}</h3>
          <p className="text-sm text-gray-600">{t('chat_with_support', 'تحدث مع إدارة المجمع')}</p>
        </button>
        
        <a 
          href="https://wa.me/201012625529"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-lg hover:border-green-400 transition-all cursor-pointer block"
        >
          <svg className="h-8 w-8 text-green-500 mx-auto mb-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <h3 className="font-semibold text-gray-900 mb-2">{t('phone_support', 'واتساب الدعم')}</h3>
          <p className="text-sm text-gray-600">{t('call_support_team', 'تواصل: 01012625529')}</p>
        </a>
        
        <button 
          onClick={() => {
            const articlesSection = document.getElementById('help-articles');
            if (articlesSection) articlesSection.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer"
        >
          <BookOpenIcon className="h-8 w-8 text-orange-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">{t('documentation', 'الوثائق')}</h3>
          <p className="text-sm text-gray-600">{t('browse_full_docs', 'تصفح المقالات أدناه')}</p>
        </button>
      </div>

      {/* Written Guide Section */}
      <div className="mb-12">
        <WrittenGuide />
      </div>

      {/* Help Articles by Category */}
      <div id="help-articles" className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t('help_topics')}</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {sectionsToShow.length === 0 && searchQuery ? (
            <div className="px-6 py-12 text-center">
              <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('no_results_found')}</h3>
              <p className="text-gray-600">{t('try_different_keywords')}</p>
            </div>
          ) : (
            sectionsToShow.map((section) => (
            <div key={section.id}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <section.icon className="h-5 w-5 text-gray-500 mr-3" />
                  <span className="font-medium text-gray-900">{section.title}</span>
                </div>
                {expandedSection === section.id ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              {expandedSection === section.id && (
                <div className="px-6 pb-4 bg-gray-50">
                  <div className="space-y-2">
                    {section.articles.map((article, index) => (
                      <a
                        key={index}
                        href={article.link}
                        className="block py-2 px-4 text-sm text-gray-700 hover:text-blue-600 hover:bg-white rounded transition-colors"
                      >
                        {article.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;