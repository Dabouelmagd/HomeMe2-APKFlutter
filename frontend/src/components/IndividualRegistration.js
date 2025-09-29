import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const IndividualRegistration = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    total_units: '',
    compound_type: 'residential',
    amenities: [],
    owner_email: user?.email || '',
    owner_phone: '',
    timezone: 'UTC',
    currency: 'USD',
    language: 'en'
  });

  const [pricingInfo, setPricingInfo] = useState(null);

  const amenityOptions = [
    'swimming_pool', 'gym', 'parking', 'security', 'garden', 
    'playground', 'community_center', 'laundry', 'storage', 'elevator'
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (name === 'amenities') {
        setFormData(prev => ({
          ...prev,
          amenities: checked 
            ? [...prev.amenities, value]
            : prev.amenities.filter(item => item !== value)
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: checked }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Calculate pricing when units change
    if (name === 'total_units' && value) {
      calculatePricing(parseInt(value));
    }
  };

  const calculatePricing = async (units) => {
    if (units <= 0 || units > 1000) return;
    
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/individual/pricing/calculate?units=${units}&billing_cycle=monthly`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setPricingInfo(response.data.pricing);
      }
    } catch (error) {
      console.error('Error calculating pricing:', error);
    }
  };

  const validateStep = (currentStep) => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.address && formData.total_units;
      case 2:
        return formData.owner_email;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    } else {
      toast.error(t('individual.please_fill_required_fields'));
    }
  };

  const handlePrevious = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    setLoading(true);
    try {
      // Convert total_units to integer
      const submitData = {
        ...formData,
        total_units: parseInt(formData.total_units)
      };

      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/individual/register`,
        submitData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        toast.success(t('individual.registration_successful'));
        // Redirect to individual dashboard
        navigate('/individual-dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || t('individual.registration_failed'));
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {t('individual.compound_information')}
        </h2>
        <p className="text-gray-600">
          {t('individual.step1_description')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('individual.compound_name')} *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder={t('individual.compound_name_placeholder')}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('individual.address')} *
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            rows="3"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder={t('individual.address_placeholder')}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('individual.total_units')} *
          </label>
          <input
            type="number"
            name="total_units"
            value={formData.total_units}
            onChange={handleInputChange}
            min="1"
            max="1000"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="50"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('individual.max_units_note')}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('individual.compound_type')}
          </label>
          <select
            name="compound_type"
            value={formData.compound_type}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="residential">{t('individual.residential')}</option>
            <option value="commercial">{t('individual.commercial')}</option>
            <option value="mixed">{t('individual.mixed')}</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('individual.description')}
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows="2"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder={t('individual.description_placeholder')}
          />
        </div>
      </div>

      {/* Pricing Preview */}
      {pricingInfo && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <h4 className="font-semibold text-center text-green-800 mb-2">
            {t('individual.pricing_preview')}
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-green-700">{t('individual.monthly_cost')}:</span>
              <span className="font-bold text-green-800 ml-1">
                ${pricingInfo.monthly_amount.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-green-700">{t('individual.annual_cost')}:</span>
              <span className="font-bold text-green-800 ml-1">
                ${pricingInfo.annual_amount.toFixed(2)}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-green-600 text-xs">
                ✓ {t('individual.trial_included')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {t('individual.contact_preferences')}
        </h2>
        <p className="text-gray-600">
          {t('individual.step2_description')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('individual.owner_email')} *
          </label>
          <input
            type="email"
            name="owner_email"
            value={formData.owner_email}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('individual.owner_phone')}
          </label>
          <input
            type="tel"
            name="owner_phone"
            value={formData.owner_phone}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('individual.timezone')}
          </label>
          <select
            name="timezone"
            value={formData.timezone}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Asia/Dubai">Dubai</option>
            <option value="Asia/Riyadh">Riyadh</option>
            <option value="Africa/Cairo">Cairo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('individual.currency')}
          </label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="AED">AED (د.إ)</option>
            <option value="SAR">SAR (ر.س)</option>
            <option value="EGP">EGP (ج.م)</option>
          </select>
        </div>

        {/* Amenities */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('individual.amenities')}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {amenityOptions.map((amenity) => (
              <label key={amenity} className="flex items-center">
                <input
                  type="checkbox"
                  name="amenities"
                  value={amenity}
                  checked={formData.amenities.includes(amenity)}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {t(`individual.amenity_${amenity}`)}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {t('individual.review_and_submit')}
        </h2>
        <p className="text-gray-600">
          {t('individual.step3_description')}
        </p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-center mb-4">{t('individual.compound_summary')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>{t('individual.compound_name')}:</strong> {formData.name}
          </div>
          <div>
            <strong>{t('individual.total_units')}:</strong> {formData.total_units}
          </div>
          <div>
            <strong>{t('individual.compound_type')}:</strong> {t(`individual.${formData.compound_type}`)}
          </div>
          <div>
            <strong>{t('individual.owner_email')}:</strong> {formData.owner_email}
          </div>
          <div className="md:col-span-2">
            <strong>{t('individual.address')}:</strong> {formData.address}
          </div>
          {formData.amenities.length > 0 && (
            <div className="md:col-span-2">
              <strong>{t('individual.amenities')}:</strong> {formData.amenities.map(a => t(`individual.amenity_${a}`)).join(', ')}
            </div>
          )}
        </div>
      </div>

      {pricingInfo && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
          <h4 className="font-semibold text-center text-green-800 mb-3">
            {t('individual.pricing_details')}
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{t('individual.monthly_subscription')}:</span>
              <span className="font-semibold text-center">${pricingInfo.monthly_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('individual.annual_subscription')}:</span>
              <span className="font-semibold text-center">${pricingInfo.annual_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>{t('individual.annual_savings')}:</span>
              <span className="font-semibold text-center">-${pricingInfo.annual_savings.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-bold text-green-800">
                <span>{t('individual.first_month')}:</span>
                <span>{t('individual.free_trial')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h4 className="font-semibold text-center text-blue-800 mb-2">
          {t('individual.whats_included')}
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• {t('individual.feature_resident_management')}</li>
          <li>• {t('individual.feature_financial_tracking')}</li>
          <li>• {t('individual.feature_maintenance_system')}</li>
          <li>• {t('individual.feature_communication_tools')}</li>
          <li>• {t('individual.feature_basic_reporting')}</li>
          <li>• {t('individual.feature_mobile_access')}</li>
          <li>• {t('individual.feature_upgrade_option')}</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div
                    className={`w-20 h-1 ${
                      step > stepNumber ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>{t('individual.compound_info')}</span>
            <span>{t('individual.contact_settings')}</span>
            <span>{t('individual.review')}</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white shadow-lg rounded-lg p-8">
          <form onSubmit={handleSubmit}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={step === 1}
                className={`px-6 py-3 rounded-md font-medium ${
                  step === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {t('individual.previous')}
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!validateStep(step)}
                  className={`px-6 py-3 rounded-md font-medium ${
                    validateStep(step)
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {t('individual.next')}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !validateStep(step)}
                  className={`px-8 py-3 rounded-md font-medium ${
                    loading || !validateStep(step)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {t('individual.registering')}
                    </span>
                  ) : (
                    t('individual.create_compound')
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default IndividualRegistration;