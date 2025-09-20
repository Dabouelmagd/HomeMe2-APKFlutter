import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  CrownIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TrialStatus = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const startTrial = async () => {
    try {
      const response = await axios.post(`${API}/trial/start`);
      setTrialData(response.data);
      toast.success('🎉 Free trial started! Enjoy 14 days of full access!');
    } catch (error) {
      toast.error('Failed to start trial');
    }
  };

  const upgradeToPaid = () => {
    navigate('/pricing');
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!trialData) {
    // No trial - show start trial option
    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SparklesIcon className="h-6 w-6" />
            <div>
              <h3 className="font-semibold">Start Your Free Trial</h3>
              <p className="text-sm text-blue-100">Get 14 days of premium features</p>
            </div>
          </div>
          <button
            onClick={startTrial}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Start Trial
          </button>
        </div>
      </div>
    );
  }

  const daysRemaining = Math.ceil((new Date(trialData.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining <= 0;
  const isAlmostExpired = daysRemaining <= 3 && daysRemaining > 0;

  if (trialData.subscription_type === 'paid') {
    // User has paid subscription
    return (
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 text-white">
        <div className="flex items-center space-x-3">
          <CrownIcon className="h-6 w-6" />
          <div>
            <h3 className="font-semibold">Premium Account</h3>
            <p className="text-sm text-green-100">You have full access to all features</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-4 ${
      isExpired 
        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
        : isAlmostExpired
        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
        : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isExpired ? (
            <XMarkIcon className="h-6 w-6" />
          ) : isAlmostExpired ? (
            <ExclamationTriangleIcon className="h-6 w-6" />
          ) : (
            <ClockIcon className="h-6 w-6" />
          )}
          
          <div>
            <h3 className="font-semibold">
              {isExpired 
                ? 'Trial Expired' 
                : isAlmostExpired 
                ? 'Trial Ending Soon!' 
                : 'Free Trial Active'
              }
            </h3>
            <p className={`text-sm ${
              isExpired ? 'text-red-100' : isAlmostExpired ? 'text-orange-100' : 'text-blue-100'
            }`}>
              {isExpired 
                ? 'Upgrade now to continue using premium features'
                : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`
              }
            </p>
          </div>
        </div>
        
        <button
          onClick={upgradeToPaid}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isExpired
              ? 'bg-white text-red-600 hover:bg-gray-50'
              : isAlmostExpired
              ? 'bg-white text-orange-600 hover:bg-gray-50'
              : 'bg-white text-blue-600 hover:bg-gray-50'
          }`}
        >
          {isExpired ? 'Upgrade Now' : 'View Plans'}
        </button>
      </div>
    </div>
  );
};

export default TrialStatus;