import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { toast } from 'sonner';
import {
  MapIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import PageHeader from './shared/PageHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Visual occupancy palette. Status order matters for the legend.
const STATUS_STYLE = {
  occupied:    { label: 'مسكونة',  bg: 'bg-emerald-100 border-emerald-400 hover:bg-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-900' },
  vacant:      { label: 'شاغرة',   bg: 'bg-gray-100 border-gray-300 hover:bg-gray-200',           dot: 'bg-gray-400',    text: 'text-gray-700' },
  maintenance: { label: 'صيانة',   bg: 'bg-amber-100 border-amber-400 hover:bg-amber-200',         dot: 'bg-amber-500',   text: 'text-amber-900' },
};

const CompoundMap = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [residences, setResidences] = useState([]);
  const [maintenanceUnits, setMaintenanceUnits] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | occupied | vacant | maintenance

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const compoundId = user?.compound_id;
      if (!compoundId) {
        setLoading(false);
        return;
      }
      const [resRes, mxRes] = await Promise.all([
        axios.get(`${API}/compounds/${compoundId}/residences`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        // Pull active maintenance requests to tint the matching unit cards. The
        // endpoint already exists app-wide; we only care about the unit_number.
        axios
          .get(`${API}/maintenance/requests?status=open,in_progress`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => ({ data: { requests: [] } })),
      ]);
      setResidences(resRes.data?.residences || []);
      const m = new Set();
      (mxRes.data?.requests || []).forEach((r) => r.unit_number && m.add(r.unit_number));
      setMaintenanceUnits(m);
    } catch (err) {
      toast.error(t('map_load_failed', 'فشل تحميل خريطة الكمبوند'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [user?.compound_id]);

  // Derive each unit's display status from occupancy + maintenance overlay
  const cards = useMemo(() => {
    return residences.map((r) => {
      const isMaintenance = r.unit_number && maintenanceUnits.has(r.unit_number);
      const status = isMaintenance ? 'maintenance' : (r.occupancy_status || 'vacant');
      return { ...r, status };
    });
  }, [residences, maintenanceUnits]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((c) => {
      if (filter !== 'all' && c.status !== filter) return false;
      if (!q) return true;
      return (
        (c.unit_number || '').toLowerCase().includes(q) ||
        (c.family_head?.full_name || '').toLowerCase().includes(q) ||
        (c.family_head?.email || '').toLowerCase().includes(q)
      );
    });
  }, [cards, search, filter]);

  const stats = useMemo(() => {
    const out = { total: cards.length, occupied: 0, vacant: 0, maintenance: 0 };
    cards.forEach((c) => { out[c.status] = (out[c.status] || 0) + 1; });
    return out;
  }, [cards]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded-2xl" />
          <div className="grid grid-cols-6 gap-3">
            {[...Array(18)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto" data-testid="compound-map-page">
      <PageHeader
        theme="emerald"
        icon={MapIcon}
        badge={t('map_badge', 'خريطة المجمع')}
        title={t('compound_map_title', 'خريطة الكمبوند التفاعلية')}
        subtitle={t('compound_map_subtitle', 'عرض بصري لكل الوحدات — اضغط على أي وحدة لرؤية تفاصيل ساكنيها')}
        testId="compound-map-page-header"
      />

      {/* Stats + Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`p-3 rounded-xl border-2 text-start transition ${filter === 'all' ? 'border-emerald-500 bg-emerald-50 shadow' : 'border-gray-200 bg-white'}`}
          data-testid="map-filter-all"
        >
          <div className="text-xs text-gray-500">{t('total_units', 'إجمالي الوحدات')}</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </button>
        {Object.entries(STATUS_STYLE).map(([key, st]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`p-3 rounded-xl border-2 text-start transition ${filter === key ? 'border-gray-900 shadow' : 'border-gray-200'} ${st.bg}`}
            data-testid={`map-filter-${key}`}
          >
            <div className="text-xs text-gray-600 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${st.dot}`}></span>
              {t(`map_${key}`, st.label)}
            </div>
            <div className={`text-2xl font-bold ${st.text}`}>{stats[key] || 0}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <MagnifyingGlassIcon className="absolute top-2.5 right-3 h-5 w-5 text-gray-400 rtl:right-3 ltr:left-3" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('map_search_placeholder', 'بحث برقم الوحدة أو اسم الساكن...')}
          className="w-full pr-10 pl-3 rtl:pr-10 rtl:pl-3 py-2.5 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm"
          data-testid="map-search"
        />
      </div>

      {/* Map Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <HomeIcon className="h-12 w-12 mx-auto text-gray-300" />
          <p className="text-gray-500 mt-3 text-sm">
            {filter === 'all' && !search ? t('map_no_units', 'لا توجد وحدات بعد. أضف عائلات أو سكان لتظهر هنا.') : t('map_no_match', 'لا توجد نتائج للبحث.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3" data-testid="map-grid">
          {filtered.map((u) => {
            const st = STATUS_STYLE[u.status];
            return (
              <button
                key={u.unit_number}
                onClick={() => setSelected(u)}
                className={`relative aspect-square rounded-xl border-2 ${st.bg} ${st.text} p-2 transition-all hover:scale-105 hover:shadow-lg flex flex-col items-center justify-center text-center`}
                data-testid={`map-unit-${u.unit_number}`}
                title={`${u.unit_number} — ${st.label}`}
              >
                <HomeIcon className="h-6 w-6 mb-1 opacity-70" />
                <div className="font-bold text-sm leading-tight">{u.unit_number}</div>
                <div className="text-[10px] mt-0.5 opacity-80">{st.label}</div>
                <span className={`absolute top-1.5 right-1.5 rtl:right-1.5 rtl:left-auto ltr:left-1.5 w-2 h-2 rounded-full ${st.dot}`}></span>
              </button>
            );
          })}
        </div>
      )}

      {/* Unit Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            data-testid="map-unit-modal"
          >
            <div className={`px-5 py-4 flex items-center justify-between ${STATUS_STYLE[selected.status].bg} border-b border-gray-200`}>
              <div className="flex items-center gap-2">
                <HomeIcon className="h-6 w-6" />
                <div>
                  <div className="font-bold text-lg">{selected.unit_number}</div>
                  <div className="text-xs opacity-75 flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${STATUS_STYLE[selected.status].dot}`}></span>
                    {STATUS_STYLE[selected.status].label}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-white/40 rounded-lg" data-testid="map-modal-close">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {selected.status === 'maintenance' && (
                <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                  <WrenchScrewdriverIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    {t('map_unit_has_maintenance', 'هذه الوحدة لديها طلب صيانة نشط حالياً.')}
                  </div>
                </div>
              )}

              {selected.family_head ? (
                <>
                  <div className="text-xs text-gray-500 mb-2">{t('family_head', 'رب الأسرة')}</div>
                  <div className="rounded-xl border border-gray-200 p-3 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-emerald-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900">{selected.family_head.full_name}</div>
                        {selected.family_head.email && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <EnvelopeIcon className="h-3 w-3" /> {selected.family_head.email}
                          </div>
                        )}
                        {selected.family_head.phone && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <PhoneIcon className="h-3 w-3" /> {selected.family_head.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {selected.family_members?.length > 1 && (
                    <>
                      <div className="text-xs text-gray-500 mb-2">
                        {t('family_members', 'أفراد العائلة')} ({selected.member_count})
                      </div>
                      <div className="space-y-2">
                        {selected.family_members
                          .filter((m) => m.id !== selected.family_head.id)
                          .map((m) => (
                            <div key={m.id} className="flex items-center gap-2 text-sm text-gray-700 px-2">
                              <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                              <span>{m.full_name}</span>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <HomeIcon className="h-10 w-10 mx-auto text-gray-300" />
                  <p className="text-sm text-gray-500 mt-2">{t('map_unit_vacant_desc', 'هذه الوحدة شاغرة حالياً.')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompoundMap;
