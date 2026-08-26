/**
 * EgyptLocationPicker
 * محدد الموقع الجغرافي المتدرج لمصر
 * محافظة ← نوع التقسيم ← المنطقة
 */
import React, { useState, useMemo, useEffect } from 'react';
import { getGovernorates, getSubTypes, getAreas } from '../data/egyptRegions';
import { MapPinIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

const governorates = getGovernorates();

export default function EgyptLocationPicker({ value = {}, onChange, compact = false }) {
  const [gov, setGov]   = useState(value.governorate || '');
  const [type, setType] = useState(value.subType || '');
  const [area, setArea] = useState(value.area || '');
  const [custom, setCustom] = useState(value.custom || '');
  const [showCustom, setShowCustom] = useState(false);

  const subTypes = useMemo(() => getSubTypes(gov), [gov]);
  const areas    = useMemo(() => getAreas(gov, type), [gov, type]);

  // Reset cascades
  useEffect(() => { setType(''); setArea(''); }, [gov]);
  useEffect(() => { setArea(''); }, [type]);

  // Notify parent
  useEffect(() => {
    onChange?.({ governorate: gov, subType: type, area, custom,
      fullLocation: [gov, type, area, custom].filter(Boolean).join(' - ') });
  }, [gov, type, area, custom]);

  const selectClass = "w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300 appearance-none cursor-pointer";

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center gap-2 mb-1">
        <MapPinIcon className="h-4 w-4 text-emerald-600 flex-shrink-0" />
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">الموقع الجغرافي</span>
      </div>

      {/* Step 1 — Governorate */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">المحافظة *</label>
        <div className="relative">
          <select value={gov} onChange={e => setGov(e.target.value)} className={selectClass} required>
            <option value="">— اختر المحافظة —</option>
            {governorates.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <ChevronDownIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Step 2 — Sub-type */}
      {gov && subTypes.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">نوع التقسيم</label>
          <div className="flex gap-2 flex-wrap">
            {subTypes.map(st => (
              <button key={st} type="button" onClick={() => setType(st === type ? '' : st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                  type === st
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-emerald-300'
                }`}>
                {st === 'حي' ? '🏘️ حي' :
                 st === 'مركز' ? '🏛️ مركز' :
                 st === 'مدينة' ? '🏙️ مدينة' :
                 st === 'مدينة جديدة' ? '🏗️ مدينة جديدة' :
                 st === 'كمبوند / تجمع سكني' ? '🏠 كمبوند / تجمع' :
                 st}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — Area */}
      {gov && type && areas.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {type === 'حي' ? 'الحي' :
             type === 'مركز' ? 'المركز' :
             type === 'مدينة' || type === 'مدينة جديدة' ? 'المدينة' :
             'المنطقة / الكمبوند'}
          </label>
          <div className="relative">
            <select value={area} onChange={e => setArea(e.target.value)} className={selectClass}>
              <option value="">— اختر المنطقة —</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDownIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Custom input */}
      <div>
        <button type="button" onClick={() => setShowCustom(v => !v)}
          className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          {showCustom ? '▲' : '▼'} {showCustom ? 'إخفاء' : '+ إضافة تفاصيل إضافية (شارع، بلوك، رقم)'}
        </button>
        {showCustom && (
          <input type="text" value={custom} onChange={e => setCustom(e.target.value)}
            placeholder="مثال: شارع النيل، بلوك 12، عمارة 5..."
            className="mt-1.5 w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-emerald-300" />
        )}
      </div>

      {/* Preview */}
      {gov && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2">
          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
            📍 {[gov, type, area, custom].filter(Boolean).join(' ← ')}
          </p>
        </div>
      )}
    </div>
  );
}
