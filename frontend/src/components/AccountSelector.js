import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import axios from 'axios';
import {
  BuildingOfficeIcon,
  UsersIcon,
  HomeModernIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AccountSelector = () => {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';

  const [compounds, setCompounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rememberChoice, setRememberChoice] = useState(false);

  useEffect(() => {
    fetchCompounds();
  }, []);

  useEffect(() => {
    // If user already has a remembered compound, go directly
    const remembered = localStorage.getItem('selectedCompoundId');
    if (remembered && localStorage.getItem('rememberCompound') === 'true') {
      selectAndNavigate(remembered);
    }
  }, []);

  const fetchCompounds = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      let compoundsList = [];

      if (user?.role === 'super_admin') {
        // Super admin sees all compounds
        const res = await axios.get(`${API}/super-admin/dashboard`, { headers });
        compoundsList = (res.data.compounds || []).map(c => ({
          id: c.id,
          name: c.name,
          users: c.users || 0,
          families: c.families || 0,
          created_at: c.created_at
        }));
      } else if (user?.role === 'company_admin') {
        // Company admin sees their company compounds
        const res = await axios.get(`${API}/companies/my-compounds`, { headers });
        compoundsList = (res.data || []).map(c => ({
          id: c.id || c.compound_id,
          name: c.name || c.compound_name,
          users: c.total_users || c.users || 0,
          families: c.total_families || c.families || 0,
        }));
      } else {
        // Regular users - just their compound
        if (user?.compound_id) {
          compoundsList = [{
            id: user.compound_id,
            name: user.compound_name || t('as_my_compound', 'مجمعي السكني'),
            users: 0,
            families: 0,
          }];
        }
      }

      setCompounds(compoundsList);

      // Auto-select if only one compound
      if (compoundsList.length === 1) {
        setSelected(compoundsList[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch compounds:', err);
      // If fetch fails, go to dashboard directly
      navigate('/app/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const selectAndNavigate = async (compoundId) => {
    try {
      // Store selected compound
      localStorage.setItem('selectedCompoundId', compoundId);

      if (rememberChoice) {
        localStorage.setItem('rememberCompound', 'true');
      }

      // Update user context with selected compound if needed
      const compound = compounds.find(c => c.id === compoundId);
      if (compound && updateUser) {
        updateUser({
          ...user,
          selected_compound_id: compoundId,
          selected_compound_name: compound.name
        });
      }

      navigate('/app/dashboard', { replace: true });
    } catch {
      navigate('/app/dashboard', { replace: true });
    }
  };

  const handleContinue = () => {
    if (selected) {
      selectAndNavigate(selected);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  // If no compounds found, go directly to dashboard
  if (compounds.length === 0) {
    navigate('/app/dashboard', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4"
      dir={isRTL ? 'rtl' : 'ltr'} data-testid="account-selector">

      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 mb-4">
            <BuildingOfficeIcon className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {t('as_select_compound', 'اختر المجمع السكني')}
          </h1>
          <p className="text-gray-400 text-sm">
            {t('as_select_desc', 'اختر المجمع الذي تريد الدخول إليه')}
          </p>
          {user?.name && (
            <p className="text-purple-300 text-sm mt-1">
              {t('welcome_back', 'مرحباً بعودتك')}، <span className="font-semibold">{user.name}</span>
            </p>
          )}
        </div>

        {/* Compound Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {compounds.map(compound => (
            <button
              key={compound.id}
              onClick={() => setSelected(compound.id)}
              data-testid={`compound-card-${compound.id}`}
              className={`relative group p-5 rounded-2xl border-2 transition-all duration-200 text-left ${isRTL ? 'text-right' : 'text-left'} ${
                selected === compound.id
                  ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/20'
                  : 'bg-white/5 border-gray-700/50 hover:border-purple-500/50 hover:bg-white/10'
              }`}
            >
              {/* Selected badge */}
              {selected === compound.id && (
                <div className="absolute top-3 end-3">
                  <CheckCircleIcon className="w-6 h-6 text-purple-400" />
                </div>
              )}

              {/* Compound icon */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                selected === compound.id ? 'bg-purple-600' : 'bg-gray-700'
              }`}>
                <HomeModernIcon className="w-6 h-6 text-white" />
              </div>

              {/* Name */}
              <h3 className="text-lg font-bold text-white mb-1 truncate pe-6">
                {compound.name}
              </h3>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <UsersIcon className="w-4 h-4" />
                  {compound.users} {t('as_users', 'مستخدم')}
                </span>
                <span className="flex items-center gap-1">
                  <HomeModernIcon className="w-4 h-4" />
                  {compound.families} {t('as_families', 'أسرة')}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Remember + Continue */}
        <div className="bg-white/5 backdrop-blur rounded-2xl border border-gray-700/50 p-5">
          {/* Remember choice */}
          <label className="flex items-center gap-3 mb-4 cursor-pointer group" data-testid="remember-compound">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={e => setRememberChoice(e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
            />
            <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
              {t('as_remember', 'تذكر اختياري (الدخول مباشرة في المرة القادمة)')}
            </span>
          </label>

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!selected}
            data-testid="as-continue-btn"
            className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-base transition-all ${
              selected
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {t('as_continue', 'متابعة')}
            {isRTL ? <ArrowLeftIcon className="w-5 h-5" /> : <ArrowRightIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSelector;
