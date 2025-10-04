import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BookOpenIcon,
  VideoCameraIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

const HelpCenter = () => {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState(null);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <QuestionMarkCircleIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('help_center')}</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {t('help_center_description')}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
          <VideoCameraIcon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">{t('video_tutorials')}</h3>
          <p className="text-sm text-gray-600">{t('watch_video_guides')}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
          <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">{t('live_chat')}</h3>
          <p className="text-sm text-gray-600">{t('chat_with_support')}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
          <PhoneIcon className="h-8 w-8 text-purple-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">{t('phone_support')}</h3>
          <p className="text-sm text-gray-600">{t('call_support_team')}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
          <BookOpenIcon className="h-8 w-8 text-orange-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">{t('documentation')}</h3>
          <p className="text-sm text-gray-600">{t('browse_full_docs')}</p>
        </div>
      </div>

      {/* Help Articles by Category */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t('help_topics')}</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {helpSections.map((section) => (
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
          ))}
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;