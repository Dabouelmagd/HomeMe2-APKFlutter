import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const ContactUs = () => {
  const { t } = useTranslation();

  const contactMethods = [
    {
      icon: EnvelopeIcon,
      label: t('legal.contact.email'),
      value: 'info@datalifeai.com',
      href: 'mailto:info@datalifeai.com',
      description: 'Send us an email for general inquiries and support'
    },
    {
      icon: MapPinIcon,
      label: t('legal.contact.address'),
      value: t('legal.contact.addressValue'),
      description: 'Our office location'
    },
    {
      icon: ChatBubbleLeftRightIcon,
      label: 'Support',
      value: 'In-app support',
      description: 'Use our messaging system for quick support'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            {t('legal.contact.title')}
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {t('legal.contact.description')}
          </p>
        </div>

        {/* Contact Methods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {contactMethods.map((method, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <method.icon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {method.label}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {method.description}
                  </p>
                  <div className="mt-2">
                    {method.href ? (
                      <a
                        href={method.href}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {method.value}
                      </a>
                    ) : (
                      <span className="text-gray-700 font-medium">
                        {method.value}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Get in Touch
          </h2>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-4">
              We're here to help! Whether you have questions about using the HomeMe application, 
              need technical support, or want to provide feedback, we'd love to hear from you.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                Primary Contact
              </h3>
              <div className="flex items-center">
                <EnvelopeIcon className="h-5 w-5 text-blue-600 mr-2" />
                <a 
                  href="mailto:info@datalifeai.com"
                  className="text-blue-700 hover:text-blue-800 font-medium"
                >
                  info@datalifeai.com
                </a>
              </div>
              <p className="text-blue-800 text-sm mt-2">
                We typically respond to emails within 24 hours during business days.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Notice */}
        <div className="mt-8 bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Before You Contact Us
          </h3>
          <p className="text-gray-600">
            For faster support, please check our in-app help section or FAQ. 
            Many common questions can be resolved quickly through our self-service resources.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;