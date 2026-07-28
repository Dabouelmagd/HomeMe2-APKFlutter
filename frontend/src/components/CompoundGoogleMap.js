import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../App';
import {
  MapIcon, UserGroupIcon, HomeIcon, ShieldCheckIcon,
  PencilSquareIcon, CheckIcon, XMarkIcon, ArrowPathIcon,
  EyeIcon, EyeSlashIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'AIzaSyB1jclwy1oO3CrQ79lJiNS_djExYY89I-E';

const ROLE_ICON = {
  admin: '🛠️', manager: '📊', assistant_manager: '🤝',
  accountant: '💰', security: '🛡️', resident: '🏠', family_head: '👨‍👩‍👧',
};

let mapsLoaded = false;
const loadGoogleMaps = () => new Promise((resolve, reject) => {
  if (window.google?.maps) { resolve(); return; }
  if (mapsLoaded) {
    const check = setInterval(() => {
      if (window.google?.maps) { clearInterval(check); resolve(); }
    }, 100);
    return;
  }
  mapsLoaded = true;
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places,drawing,geometry`;
  script.async = true;
  script.onload = resolve;
  script.onerror = reject;
  document.head.appendChild(script);
});

export default function CompoundGoogleMap({ compoundId: propCompoundId }) {
  const { user } = useAuth();
  const compoundId = propCompoundId || user?.compound_id;

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const polygonRef = useRef(null);
  const drawingManager = useRef(null);
  const unitMarkers = useRef([]);
  const staffMarkers = useRef([]);
  const infoWindow = useRef(null);

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [units, setUnits] = useState([]);
  const [staff, setStaff] = useState([]);

  const [mode, setMode] = useState('view'); // view | draw_boundary | place_unit
  const [selectedUnit, setSelectedUnit] = useState(null);

  const [showUnits, setShowUnits] = useState(true);
  const [showStaff, setShowStaff] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);

  const isAdmin = ['app_owner', 'super_admin', 'company_admin', 'admin', 'manager'].includes(user?.role);
  const isSecurity = user?.role === 'security';

  // ── Load Data ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!compoundId) { setLoading(false); return; }
    try {
      const tok = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      const [cfgRes, unitsRes] = await Promise.all([
        axios.get(`${API}/compounds/${compoundId}/map-config`, tok),
        axios.get(`${API}/compounds/${compoundId}/map/units`, tok),
      ]);
      setConfig(cfgRes.data);
      setUnits(unitsRes.data?.units || []);

      if (isAdmin) {
        const staffRes = await axios.get(`${API}/compounds/${compoundId}/map/staff`, tok);
        setStaff(staffRes.data?.staff || []);
      }
    } catch (e) {
      toast.error('فشل تحميل بيانات الخريطة');
    } finally {
      setLoading(false);
    }
  }, [compoundId, isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Init Map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!config || !mapRef.current) return;
    loadGoogleMaps().then(() => {
      const map = new window.google.maps.Map(mapRef.current, {
        center: config.center,
        zoom: config.zoom || 17,
        mapTypeId: 'satellite',
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [],
      });
      mapInstance.current = map;
      infoWindow.current = new window.google.maps.InfoWindow();

      // Draw boundary
      if (config.boundary?.length > 2) {
        drawBoundary(map, config.boundary);
      }

      // Place markers
      placeUnitMarkers(map, units);
      if (isAdmin) placeStaffMarkers(map, staff);

      // Drawing manager for admin
      if (isAdmin) {
        drawingManager.current = new window.google.maps.drawing.DrawingManager({
          drawingMode: null,
          drawingControl: false,
          polygonOptions: {
            strokeColor: '#dc2626',
            strokeWeight: 3,
            fillColor: '#dc2626',
            fillOpacity: 0.08,
            editable: true,
          },
        });
        drawingManager.current.setMap(map);

        window.google.maps.event.addListener(drawingManager.current, 'polygoncomplete', (poly) => {
          if (polygonRef.current) polygonRef.current.setMap(null);
          polygonRef.current = poly;
          drawingManager.current.setDrawingMode(null);
          setMode('view');
          toast.success('تم رسم حدود الكمبوند — اضغط "حفظ" لتأكيدها');
        });
      }

    }).catch(() => toast.error('فشل تحميل خرائط Google'));
  }, [config]);

  // ── Draw Boundary ────────────────────────────────────────────────────────
  const drawBoundary = (map, points) => {
    if (polygonRef.current) polygonRef.current.setMap(null);
    polygonRef.current = new window.google.maps.Polygon({
      paths: points,
      strokeColor: '#dc2626',
      strokeWeight: 3,
      fillColor: '#dc2626',
      fillOpacity: 0.08,
      editable: isAdmin,
      map,
    });
  };

  // ── Unit Markers ─────────────────────────────────────────────────────────
  const placeUnitMarkers = (map, unitsList) => {
    unitMarkers.current.forEach(m => m.setMap(null));
    unitMarkers.current = [];

    unitsList.forEach(unit => {
      if (!unit.map_location?.lat) return;
      const marker = new window.google.maps.Marker({
        position: unit.map_location,
        map,
        title: `وحدة ${unit.unit_number}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: unit.status === 'occupied' ? '#10b981' :
                     unit.status === 'maintenance' ? '#f59e0b' : '#6b7280',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        label: {
          text: unit.unit_number?.slice(-3) || '',
          color: '#fff',
          fontSize: '10px',
          fontWeight: 'bold',
        },
      });

      marker.addListener('click', () => {
        const residents = (unit.residents || []).map(r =>
          `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
             <span>👤</span><span>${r.full_name || r.username}</span>
             ${r.phone ? `<span>· ${r.phone}</span>` : ''}
           </div>`
        ).join('') || '<p style="color:#6b7280">لا يوجد ساكن</p>';

        infoWindow.current.setContent(`
          <div dir="rtl" style="font-family:Cairo,Arial,sans-serif;min-width:180px;padding:4px">
            <p style="margin:0 0 6px;font-weight:700;font-size:14px">🏠 وحدة ${unit.unit_number}</p>
            <p style="margin:0 0 4px;font-size:12px;color:#6b7280">
              ${unit.building ? `مبنى ${unit.building}` : ''} ${unit.floor ? `· دور ${unit.floor}` : ''}
            </p>
            <hr style="margin:6px 0;border-color:#e5e7eb"/>
            ${residents}
            ${isAdmin ? `
              <button onclick="window._placeUnit('${unit.id}','${unit.unit_number}')"
                style="margin-top:8px;width:100%;background:#059669;color:#fff;border:none;padding:5px;border-radius:6px;cursor:pointer;font-family:inherit">
                📍 تحديث الموقع
              </button>` : ''}
          </div>
        `);
        infoWindow.current.open(map, marker);
      });

      unitMarkers.current.push(marker);
    });
  };

  // ── Staff Markers ────────────────────────────────────────────────────────
  const placeStaffMarkers = (map, staffList) => {
    staffMarkers.current.forEach(m => m.setMap(null));
    staffMarkers.current = [];

    staffList.forEach(s => {
      if (!s.current_location?.lat) return;
      const marker = new window.google.maps.Marker({
        position: s.current_location,
        map,
        title: s.full_name,
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 7,
          fillColor: s.role === 'security' ? '#3b82f6' : '#8b5cf6',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
          rotation: 0,
        },
      });

      marker.addListener('click', () => {
        const updatedAt = s.location_updated_at
          ? new Date(s.location_updated_at).toLocaleTimeString('ar-EG')
          : 'غير معروف';
        infoWindow.current.setContent(`
          <div dir="rtl" style="font-family:Cairo,Arial,sans-serif;padding:4px">
            <p style="margin:0 0 4px;font-weight:700">${s.role_icon} ${s.full_name}</p>
            <p style="margin:0 0 4px;font-size:12px;color:#6b7280">${s.role_ar}</p>
            ${s.phone ? `<p style="margin:0;font-size:12px">📞 ${s.phone}</p>` : ''}
            <p style="margin:4px 0 0;font-size:11px;color:#9ca3af">آخر تحديث: ${updatedAt}</p>
          </div>
        `);
        infoWindow.current.open(map, marker);
      });

      staffMarkers.current.push(marker);
    });
  };

  // ── Save Boundary ────────────────────────────────────────────────────────
  const saveBoundary = async () => {
    if (!polygonRef.current) { toast.error('ارسم حدود الكمبوند أولاً'); return; }
    const path = polygonRef.current.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
    if (path.length < 3) { toast.error('الحد يحتاج 3 نقاط على الأقل'); return; }
    try {
      const center = mapInstance.current.getCenter();
      await axios.put(`${API}/compounds/${compoundId}/map-config`, {
        boundary: path,
        center: { lat: center.lat(), lng: center.lng() },
        zoom: mapInstance.current.getZoom(),
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success('✅ تم حفظ حدود الكمبوند');
    } catch { toast.error('فشل الحفظ'); }
  };

  // ── Send my location (security) ──────────────────────────────────────────
  const sendMyLocation = () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await axios.put(`${API}/map/my-location`, {
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude }
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        toast.success('✅ تم تحديث موقعك');
        loadData();
      } catch { toast.error('فشل تحديث الموقع'); }
    }, () => toast.error('تعذّر الوصول لموقعك — تأكد من الصلاحيات'));
  };

  // ── Toggle visibility ────────────────────────────────────────────────────
  useEffect(() => {
    unitMarkers.current.forEach(m => m.setVisible(showUnits));
  }, [showUnits]);

  useEffect(() => {
    staffMarkers.current.forEach(m => m.setVisible(showStaff));
  }, [showStaff]);

  useEffect(() => {
    if (polygonRef.current) polygonRef.current.setVisible(showBoundary);
  }, [showBoundary]);

  // Start drawing boundary
  const startDrawBoundary = () => {
    if (polygonRef.current) polygonRef.current.setMap(null);
    drawingManager.current?.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
    setMode('draw_boundary');
    toast.info('ارسم حدود الكمبوند على الخريطة');
  };

  const cancelDraw = () => {
    drawingManager.current?.setDrawingMode(null);
    setMode('view');
  };

  if (!compoundId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400" dir="rtl">
        <div className="text-center">
          <MapIcon className="h-12 w-12 mx-auto mb-2 opacity-40" />
          <p>لم يتم تحديد الكمبوند</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <MapIcon className="h-6 w-6 text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            خريطة {config?.name || 'الكمبوند'}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Visibility toggles */}
          <button onClick={() => setShowUnits(p => !p)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${showUnits ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
            {showUnits ? <EyeIcon className="h-3.5 w-3.5" /> : <EyeSlashIcon className="h-3.5 w-3.5" />}
            الوحدات
          </button>

          {isAdmin && (
            <button onClick={() => setShowStaff(p => !p)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${showStaff ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              {showStaff ? <EyeIcon className="h-3.5 w-3.5" /> : <EyeSlashIcon className="h-3.5 w-3.5" />}
              الموظفون
            </button>
          )}

          <button onClick={() => setShowBoundary(p => !p)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${showBoundary ? 'bg-red-50 border-red-300 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
            {showBoundary ? <EyeIcon className="h-3.5 w-3.5" /> : <EyeSlashIcon className="h-3.5 w-3.5" />}
            الحدود
          </button>

          <button onClick={loadData} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            <ArrowPathIcon className="h-3.5 w-3.5" />
            تحديث
          </button>

          {/* Admin: draw boundary */}
          {isAdmin && mode === 'view' && (
            <button onClick={startDrawBoundary}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">
              <PencilSquareIcon className="h-3.5 w-3.5" />
              رسم حدود الكمبوند
            </button>
          )}

          {isAdmin && mode === 'draw_boundary' && (
            <>
              <button onClick={saveBoundary}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                <CheckIcon className="h-3.5 w-3.5" />
                حفظ الحدود
              </button>
              <button onClick={cancelDraw}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">
                <XMarkIcon className="h-3.5 w-3.5" />
                إلغاء
              </button>
            </>
          )}

          {/* Security: send location */}
          {isSecurity && (
            <button onClick={sendMyLocation}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              تحديث موقعي
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {units.filter(u => u.map_location?.lat).length}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500">وحدة محددة الموقع</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{units.length}</p>
          <p className="text-xs text-gray-500">إجمالي الوحدات</p>
        </div>
        {isAdmin && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {staff.filter(s => s.current_location?.lat).length}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-500">موظف نشط</p>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg"
           style={{ height: '520px' }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">جارٍ تحميل الخريطة...</p>
            </div>
          </div>
        ) : null}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Mode indicator */}
        {mode === 'draw_boundary' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
            ارسم الحدود بالنقر على الخريطة — انقر على النقطة الأولى للإغلاق
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
        <span className="font-bold text-gray-700 dark:text-gray-300">المفتاح:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"/> مسكونة</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"/> صيانة</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block"/> شاغرة</span>
        {isAdmin && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"/> أمن</span>}
        {isAdmin && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block"/> موظف</span>}
        <span className="flex items-center gap-1.5"><span className="w-8 h-0.5 bg-red-500 inline-block border-t-2 border-dashed border-red-500"/> حدود الكمبوند</span>
      </div>
    </div>
  );
}
