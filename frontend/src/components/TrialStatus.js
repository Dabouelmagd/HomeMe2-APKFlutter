import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  TrophyIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChartBarIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TrialStatus = ({ showFull = false, onUpgradeClick = null }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [trialData, setTrialData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrialStatus();
  }, []);

  const fetchTrialStatus = async () => {
    try {
      const response = await axios.get(`${API}/trial/status`);
      setTrialData(response.data);
    } catch (error) {
      console.error('Failed to fetch trial status:', error);
    } finally {
      setLoading(false);
    }
  };

  const activateTrial = async () => {
    try {
      const response = await axios.post(`${API}/trial/activate`);
      toast.success('🎉 Free trial activated! Enjoy 14 days of full access!');
      fetchTrialStatus(); // Refresh status
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to activate trial');
    }
  };

  const upgradeToPaid = () => {
    navigate('/pricing');
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${showFull ? 'space-y-4' : ''}`}>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        {showFull && (
          <>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </>
        )}
      </div>
    );
  }

  if (!trialData || !trialData.is_trial) {
    if (user?.subscription_type === 'paid') {
      // User has paid subscription
      return showFull ? (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-green-100">
              <TrophyIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900">Premium Account</h3>
              <p className="text-sm text-green-700">You have unlimited access to all HomeMe features</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-3 text-white">
          <div className="flex items-center space-x-2">
            <TrophyIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Premium Account</span>
          </div>
        </div>
      );
    }

    // No trial - show start trial option
    return (
      <div className={`bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white ${showFull ? 'p-6' : 'p-4'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SparklesIcon className={showFull ? "h-6 w-6" : "h-5 w-5"} />
            <div>
              <h3 className={`font-semibold ${showFull ? 'text-lg' : 'text-sm'}`}>
                Start Your Free Trial
              </h3>
              <p className={`text-blue-100 ${showFull ? 'text-sm' : 'text-xs'}`}>
                Get 14 days of premium features
              </p>
            </div>
          </div>
          <button
            onClick={activateTrial}
            className={`bg-white font-medium hover:bg-gray-50 transition-colors ${
              showFull 
                ? 'text-blue-600 px-4 py-2 rounded-lg' 
                : 'text-blue-600 px-3 py-1 rounded text-xs'
            }`}
          >
            Start Trial
          </button>
        </div>
      </div>
    );
  }

  const daysRemaining = trialData.days_remaining;
  const isExpired = !trialData.trial_active;
  const isAlmostExpired = daysRemaining <= 3 && daysRemaining > 0;
  
  const usagePercentages = {};
  Object.keys(trialData.usage || {}).forEach(key => {
    const usage = trialData.usage[key];
    const limit = trialData.limits[key];
    usagePercentages[key] = limit > 0 ? Math.round((usage / limit) * 100) : 0;
  });

  if (isExpired) {
    return (
      <div className={`bg-gradient-to-r from-red-500 to-red-600 rounded-lg text-white ${showFull ? 'p-6' : 'p-4'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <XMarkIcon className={showFull ? "h-6 w-6" : "h-5 w-5"} />
            <div>
              <h3 className={`font-semibold ${showFull ? 'text-lg' : 'text-sm'}`}>
                Trial Expired
              </h3>
              <p className={`text-red-100 ${showFull ? 'text-sm' : 'text-xs'}`}>
                Upgrade now to continue using premium features
              </p>
            </div>
          </div>
          <button
            onClick={onUpgradeClick || upgradeToPaid}
            className={`bg-white text-red-600 font-medium hover:bg-gray-50 transition-colors ${
              showFull 
                ? 'px-4 py-2 rounded-lg' 
                : 'px-3 py-1 rounded text-xs'
            }`}
          >
            Upgrade Now
          </button>
        </div>
      </div>
    );
  }

  if (!showFull) {
    // Compact version
    return (
      <div className={`rounded-lg p-3 text-white ${
        isAlmostExpired
          ? 'bg-gradient-to-r from-orange-500 to-red-500'
          : 'bg-gradient-to-r from-blue-500 to-purple-600'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isAlmostExpired ? (
              <ExclamationTriangleIcon className="h-5 w-5" />
            ) : (
              <ClockIcon className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">
              {daysRemaining} day{daysRemaining === 1 ? '' : 's'} left
            </span>
          </div>
          <button
            onClick={onUpgradeClick || upgradeToPaid}
            className="bg-white font-medium hover:bg-gray-50 transition-colors px-3 py-1 rounded text-xs text-blue-600"
          >
            Upgrade
          </button>
        </div>
      </div>
    );
  }

  // Full version for dashboard/dedicated page
  return (
    <div className="space-y-6">
      {/* Trial Status Header */}
      <div className={`border rounded-xl p-6 ${
        isAlmostExpired ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${
              isAlmostExpired ? 'bg-orange-100' : 'bg-blue-100'
            }`}>
              {isAlmostExpired ? (
                <ExclamationTriangleIcon className={`h-6 w-6 ${
                  isAlmostExpired ? 'text-orange-600' : 'text-blue-600'
                }`} />
              ) : (
                <ClockIcon className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${
                isAlmostExpired ? 'text-orange-900' : 'text-blue-900'
              }`}>
                {isAlmostExpired ? 'Trial Ending Soon!' : 'Free Trial Active'}
              </h3>
              <p className={`text-sm ${
                isAlmostExpired ? 'text-orange-700' : 'text-blue-700'
              }`}>
                {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining
                {isAlmostExpired && ' - Upgrade soon to avoid service interruption'}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onUpgradeClick || upgradeToPaid}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-colors ${
                isAlmostExpired 
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <ArrowUpIcon className="h-4 w-4 mr-2" />
              Upgrade Now
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              View Plans
            </button>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      {trialData.usage && Object.keys(trialData.usage).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-6">
            <ChartBarIcon className="h-5 w-5 text-gray-600" />
            <h4 className="text-lg font-medium text-gray-900">Usage & Limits</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(trialData.usage).map(([key, usage]) => {
              const limit = trialData.limits[key];
              const percentage = limit > 0 ? Math.round((usage / limit) * 100) : 0;
              const isNearLimit = percentage >= 80;
              const isAtLimit = percentage >= 100;
              
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 capitalize">
                      {key.replace('_', ' ')}
                    </span>
                    <span className={`text-sm font-medium ${
                      isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-900'
                    }`}>
                      {usage}/{limit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${
                      isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'
                    }`}>
                      {percentage}% used
                    </span>
                    {isNearLimit && (
                      <span className="text-yellow-600 font-medium">
                        {isAtLimit ? 'Limit reached' : 'Near limit'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upgrade Benefits */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Upgrade to unlock unlimited access
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-700">Unlimited users and families</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-700">Unlimited services</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-700">Unlimited storage</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-700">Premium support</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialStatus;