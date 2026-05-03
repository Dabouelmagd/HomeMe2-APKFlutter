import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BuildingOffice2Icon, GlobeAltIcon } from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tokenHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * Compound chip-selector for company_admin / accountant / app_owner.
 * Shows "كل الكمبوندات" + one chip per compound the user manages.
 *
 * Sets localStorage.active_compound_id (consumed by axios interceptor
 * sameOriginRewrite which passes X-Active-Compound-Id header).
 *
 * Props:
 *   - onChange(compoundId|null): notify parent so it can refetch.
 *   - className: extra classes for the wrapper.
 */
const CompoundSwitcher = ({ onChange, className = '' }) => {
  const [compounds, setCompounds] = useState([]);
  const [active, setActive] = useState(localStorage.getItem('active_compound_id') || '');
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');

  const load = useCallback(async () => {
    try {
      const me = await axios.get(`${API}/auth/me`, tokenHeader()).then(r => r.data);
      setRole(me?.role || '');
      // Only company-level roles benefit from this switcher
      if (!['company_admin', 'assistant_manager', 'accountant', 'app_owner', 'super_admin'].includes(me?.role)) {
        setCompounds([]);
        return;
      }
      // Fetch compounds owned by the company (or all for app_owner/super_admin)
      let res;
      if (['app_owner', 'super_admin'].includes(me?.role)) {
        res = await axios.get(`${API}/super-admin/compounds`, tokenHeader()).catch(() => null);
        setCompounds(res?.data?.compounds || res?.data || []);
      } else {
        res = await axios.get(`${API}/company-admin/compounds`, tokenHeader()).catch(() => null);
        setCompounds(res?.data?.compounds || []);
      }
    } catch (e) {
      console.error('CompoundSwitcher load error', e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const select = (id) => {
    setActive(id || '');
    if (id) {
      localStorage.setItem('active_compound_id', id);
      const found = compounds.find(c => c.id === id);
      if (found?.name) localStorage.setItem('active_compound_name', found.name);
    } else {
      localStorage.removeItem('active_compound_id');
      localStorage.removeItem('active_compound_name');
    }
    onChange?.(id || null);
  };

  if (loading || compounds.length === 0) return null;
  // Hide switcher if only 1 compound (no value)
  if (compounds.length === 1) return null;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-4 ${className}`} dir="rtl" data-testid="compound-switcher">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <BuildingOffice2Icon className="w-4 h-4 text-indigo-600" />
          عرض البيانات حسب الكمبوند
        </h3>
        <span className="text-xs text-gray-500">{compounds.length} كمبوندات</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => select('')}
          data-testid="chip-all-compounds"
          className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition ${
            !active
              ? 'bg-gradient-to-l from-indigo-600 to-violet-600 text-white shadow'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <GlobeAltIcon className="w-4 h-4" />
          كل الكمبوندات (إجمالي)
        </button>
        {compounds.map(c => (
          <button
            key={c.id}
            onClick={() => select(c.id)}
            data-testid={`chip-compound-${c.id}`}
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition whitespace-nowrap ${
              active === c.id
                ? 'bg-gradient-to-l from-indigo-600 to-violet-600 text-white shadow'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <BuildingOffice2Icon className="w-4 h-4" />
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CompoundSwitcher;
