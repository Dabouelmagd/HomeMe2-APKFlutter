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
const MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'AIzaSyBFpCjYAyk3Rqobw3UTzRRkVzdJozrIpNU';

const VEHICLE_ICONS = {
  car:        { svg: '🚗', color: '#3b82f6', label: 'سيارة أمن' },
  motorcycle: { svg: '🏍️', color: '#f59e0b', label: 'موتوسيكل' },
  truck:      { svg: '🚛', color: '#8b5cf6', label: 'شاحنة' },
  bike:       { svg: '🚲', color: '#10b981', label: 'دراجة' },
  golf_cart:  { svg: '⛳', color: '#6b7280', label: 'عربة جولف' },
};

const ROLE_ICON = {
  admin: '🛠️', manager: '📊', assistant_manager: '🤝',
  accountant: '💰', security: '🛡️', resident: '🏠', family_head: '👨‍👩‍👧',
};

let mapsLoaded = false;
let mapsLoadPromise = null;
const loadGoogleMaps = () => {
  if (window.google?.maps?.Map) return Promise.resolve();
  if (mapsLoadPromise) return mapsLoadPromise;
  mapsLoadPromise = new Promise((resolve, reject) => {
    mapsLoaded = true;
    window.__googleMapsCallback = resolve;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places,geometry&callback=__googleMapsCallback`;
    script.async = true;
    script.defer = true;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return mapsLoadPromise;
};

export default function CompoundGoogleMap({ compoundId: propCompoundId }) {
  const { user } = useAuth();
  const compoundId = propCompoundId || user?.compound_id;

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const polygonRef = useRef(null);
  const unitMarkers = useRef([]);
  const staffMarkers = useRef([]);
  const infoWindow = useRef(null);

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [units, setUnits] = useState([]);
  const [staff, setStaff] = useState([]);

  const [mode, setMode] = useState('view'); // view | draw_boundary | place_unit
  const [drawPoints, setDrawPoints] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef(null);
  const overlayClickRef = useRef(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const [showUnits, setShowUnits] = useState(true);
  const [showStaff, setShowStaff] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [selectedCompoundId, setSelectedCompoundId] = useState(compoundId || null);
  const [allCompounds, setAllCompounds] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showTracks, setShowTracks] = useState(true);
  const [vehicleMarkers, setVehicleMarkers] = useState([]);
  const vehicleMarkersRef = useRef([]);
  const trackPolylinesRef = useRef([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ name: '', type: 'car', plate: '', color: '#3b82f6' });

  const isAdmin = ['app_owner', 'super_admin', 'company_admin', 'admin', 'manager'].includes(user?.role);
  const isSecurity = user?.role === 'security';

  // ── Load Data ────────────────────────────────────────────────────────────
  const effectiveCompoundId = selectedCompoundId || compoundId;

  const loadData = useCallback(async () => {
    if (!effectiveCompoundId) { setLoading(false); return; }
    try {
      const tok = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      const [cfgRes, unitsRes] = await Promise.all([
        axios.get(`${API}/compounds/${effectiveCompoundId}/map-config`, tok),
        axios.get(`${API}/compounds/${effectiveCompoundId}/map/units`, tok),
      ]);
      setConfig(cfgRes.data);
      setUnits(unitsRes.data?.units || []);

      if (isAdmin) {
        const vehicleRes = await axios.get(`${API}/compounds/${effectiveCompoundId}/map/vehicles`, tok).catch(() => ({ data: { vehicles: [] } }));
        setVehicles(vehicleRes.data?.vehicles || []);
      }
      if (isAdmin) {
        const staffRes = await axios.get(`${API}/compounds/${effectiveCompoundId}/map/staff`, tok);
        setStaff(staffRes.data?.staff || []);
      }
    } catch (e) {
      console.error('Map data error:', e);
      // Don't show error - map can still render
    } finally {
      setLoading(false);
    }
  }, [compoundId, isAdmin, selectedCompoundId]);

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
      if (isAdmin) placeVehicleMarkers(map, vehicles);

      // Drawing manager for admin
      if (isAdmin) {
        if (window.google.maps.drawing) drawingManager.current = new window.google.maps.drawing.DrawingManager({
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

    }).catch((err) => {
      console.error('Google Maps load error:', err);
      // Don't show error toast — map may still render fine
    });
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
      await axios.put(`${API}/compounds/${effectiveCompoundId}/map-config`, {
        boundary: path,
        center: { lat: center.lat(), lng: center.lng() },
        zoom: mapInstance.current.getZoom(),
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success('✅ تم حفظ حدود الكمبوند');
    } catch { toast.error('فشل الحفظ'); }
  };

  // ── Vehicle Markers + Track Lines ──────────────────────────────────────────
  const placeVehicleMarkers = (map, vehicleList) => {
    vehicleMarkersRef.current.forEach(m => m.setMap(null));
    trackPolylinesRef.current.forEach(p => p.setMap(null));
    vehicleMarkersRef.current = [];
    trackPolylinesRef.current = [];

    vehicleList.forEach(v => {
      const cfg = VEHICLE_ICONS[v.type] || VEHICLE_ICONS.car;

      // Draw track history as polyline
      if (v.track_history?.length > 1 && showTracks) {
        const path = v.track_history.map(p => ({ lat: p.lat, lng: p.lng }));
        const polyline = new window.google.maps.Polyline({
          path,
          strokeColor: v.color || cfg.color,
          strokeOpacity: 0.7,
          strokeWeight: 3,
          icons: [{
            icon: {
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 3,
              fillColor: v.color || cfg.color,
              fillOpacity: 1,
              strokeWeight: 0,
            },
            offset: '100%',
            repeat: '80px',
          }],
          map,
        });
        trackPolylinesRef.current.push(polyline);
      }

      // Place current position marker
      if (!v.current_location?.lat) return;
      const marker = new window.google.maps.Marker({
        position: v.current_location,
        map,
        title: v.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="${v.color || cfg.color}" stroke="white" stroke-width="3"/>
              <text x="20" y="26" text-anchor="middle" font-size="18" fill="white">${cfg.svg}</text>
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(44, 44),
          anchor: new window.google.maps.Point(22, 22),
        },
        zIndex: 20,
      });

      marker.addListener('click', () => {
        const updatedAt = v.location_updated_at
          ? new Date(v.location_updated_at).toLocaleTimeString('ar-EG')
          : 'غير معروف';
        const histLen = v.track_history?.length || 0;
        infoWindow.current.setContent(`
          <div dir="rtl" style="font-family:Cairo,Arial,sans-serif;min-width:180px;padding:4px">
            <p style="margin:0 0 4px;font-weight:700;font-size:15px">${cfg.svg} ${v.name}</p>
            <p style="margin:0 0 4px;font-size:12px;color:#6b7280">${cfg.label}</p>
            ${v.plate ? `<p style="margin:0 0 4px;font-size:12px">🚘 ${v.plate}</p>` : ''}
            ${v.assigned_name ? `<p style="margin:0 0 4px;font-size:12px">👤 ${v.assigned_name}</p>` : ''}
            <p style="margin:4px 0 0;font-size:11px;color:#9ca3af">آخر تحديث: ${updatedAt}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#9ca3af">نقاط المسار: ${histLen}</p>
            <button onclick="window._clearVehicleTrack('${v.id}')"
              style="margin-top:8px;width:100%;background:#ef4444;color:#fff;border:none;padding:5px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:11px">
              🗑 مسح المسار
            </button>
          </div>
        `);
        infoWindow.current.open(map, marker);
      });

      vehicleMarkersRef.current.push(marker);
    });

    // Global handler for clearing track
    window._clearVehicleTrack = async (vehicleId) => {
      try {
        await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/map/vehicle-location/${vehicleId}/history`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        loadData();
      } catch {}
    };
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

  useEffect(() => {
    vehicleMarkersRef.current.forEach(m => m.setVisible(showVehicles));
    trackPolylinesRef.current.forEach(p => p.setVisible(showTracks));
  }, [showVehicles, showTracks]);

  // Start drawing boundary
  const startDrawBoundary = () => {
    if (polygonRef.current) polygonRef.current.setMap(null);
    setDrawPoints([]);
    setMode('draw_boundary');
    toast.info('انقر على الخريطة لرسم حدود الكمبوند');
  };

  const cancelDraw = () => {
    setDrawPoints([]);
    setMode('view');
    // Redraw existing boundary if any
    if (config?.boundary?.length > 2 && mapInstance.current) {
      drawBoundary(mapInstance.current, config.boundary);
    }
  };

  // Handle overlay click for drawing
  // Search by address or Google Maps link
  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapInstance.current) return;
    setSearching(true);
    try {
      // Handle Google Maps URL (extract coords)
      const coordsMatch = searchQuery.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      const shortCoords = searchQuery.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);

      if (coordsMatch) {
        const lat = parseFloat(coordsMatch[1]);
        const lng = parseFloat(coordsMatch[2]);
        mapInstance.current.setCenter({ lat, lng });
        mapInstance.current.setZoom(18);
        new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstance.current,
          title: searchQuery,
          animation: window.google.maps.Animation.DROP,
        });
        toast.success('✅ تم الانتقال للموقع');
      } else if (shortCoords && !isNaN(parseFloat(shortCoords[1])) && !isNaN(parseFloat(shortCoords[2]))) {
        const lat = parseFloat(shortCoords[1]);
        const lng = parseFloat(shortCoords[2]);
        mapInstance.current.setCenter({ lat, lng });
        mapInstance.current.setZoom(18);
        new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstance.current,
          animation: window.google.maps.Animation.DROP,
        });
        toast.success('✅ تم الانتقال للموقع');
      } else {
        // Use Geocoding API
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: searchQuery }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const loc = results[0].geometry.location;
            mapInstance.current.setCenter(loc);
            mapInstance.current.setZoom(18);
            new window.google.maps.Marker({
              position: loc,
              map: mapInstance.current,
              title: results[0].formatted_address,
              animation: window.google.maps.Animation.DROP,
            });
            toast.success(`✅ ${results[0].formatted_address}`);
          } else {
            toast.error('لم يتم العثور على الموقع');
          }
          setSearching(false);
        });
        return;
      }
    } catch (e) {
      toast.error('خطأ في البحث');
    }
    setSearching(false);
  };

  const handleOverlayClick = (e) => {
    if (mode !== 'draw_boundary' || !mapInstance.current) return;
    const map = mapInstance.current;
    const div = mapRef.current;
    const rect = div.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert pixel to lat/lng
    const projection = map.getProjection();
    if (!projection) return;

    const bounds = map.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const scale = Math.pow(2, map.getZoom());
    const worldWidth = 256 * scale;
    const worldHeight = 256 * scale;

    const neLng = ne.lng();
    const swLng = sw.lng();
    const neLat = ne.lat();
    const swLat = sw.lat();

    const lng = swLng + (x / div.offsetWidth) * (neLng - swLng);
    const lat = neLat - (y / div.offsetHeight) * (neLat - swLat);

    const newPoints = [...drawPoints, { lat, lng }];
    setDrawPoints(newPoints);

    // Draw markers + polyline
    if (polygonRef.current) polygonRef.current.setMap(null);
    if (newPoints.length >= 3) {
      polygonRef.current = new window.google.maps.Polygon({
        paths: newPoints,
        strokeColor: '#dc2626', strokeWeight: 3,
        fillColor: '#dc2626', fillOpacity: 0.1,
        map,
      });
    }
  };

  const finishDrawing = () => {
    if (drawPoints.length < 3) { toast.error('ارسم 3 نقاط على الأقل'); return; }
    if (polygonRef.current) polygonRef.current.setMap(null);
    polygonRef.current = new window.google.maps.Polygon({
      paths: drawPoints,
      strokeColor: '#dc2626', strokeWeight: 3,
      fillColor: '#dc2626', fillOpacity: 0.1,
      editable: true,
      map: mapInstance.current,
    });
    setMode('view');
    toast.success('✅ تم رسم الحدود — اضغط "حفظ الحدود" لتأكيدها');
  };


  useEffect(() => {
    if (!compoundId && ['app_owner','super_admin','company_admin'].includes(user?.role)) {
      axios.get(`${API}/compounds`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(r => {
        const list = r.data?.compounds || [];
        setAllCompounds(list);
        // Auto-select first compound
        if (list.length === 1) {
          setSelectedCompoundId(list[0].id);
        }
      }).catch(() => {});
    }
  }, [compoundId, user?.role]);

  if (!effectiveCompoundId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400" dir="rtl">
        <div className="text-center space-y-4">
          <MapIcon className="h-12 w-12 mx-auto opacity-40" />
          <p className="text-gray-500">اختاري كمبوند لعرض الخريطة</p>
          {allCompounds.length > 0 && (
            <select
              onChange={e => setSelectedCompoundId(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-emerald-300"
              defaultValue="">
              <option value="" disabled>اختاري كمبوند...</option>
              {allCompounds.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
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

          {/* Vehicles toggle */}
          {isAdmin && (
            <button onClick={() => setShowVehicles(p => !p)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${showVehicles ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              {showVehicles ? <EyeIcon className="h-3.5 w-3.5" /> : <EyeSlashIcon className="h-3.5 w-3.5" />}
              المركبات
            </button>
          )}

          {/* Track toggle */}
          {isAdmin && (
            <button onClick={() => setShowTracks(p => !p)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${showTracks ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              {showTracks ? <EyeIcon className="h-3.5 w-3.5" /> : <EyeSlashIcon className="h-3.5 w-3.5" />}
              المسارات
            </button>
          )}

          {/* Add vehicle */}
          {isAdmin && (
            <button onClick={() => setShowAddVehicle(p => !p)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors">
              ➕ مركبة
            </button>
          )}

          {/* Security: send location */}
          {(isSecurity || isAdmin) && (
            <button onClick={sendMyLocation}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              موقعي الآن
            </button>
          )}

          {/* Security: update vehicle location */}
          {(isSecurity || isAdmin) && vehicles.length > 0 && (
            <div className="relative">
              <select
                onChange={async (e) => {
                  const vid = e.target.value;
                  if (!vid) return;
                  navigator.geolocation.getCurrentPosition(async (pos) => {
                    try {
                      await axios.put(`${API}/map/vehicle-location/${vid}`, {
                        location: { lat: pos.coords.latitude, lng: pos.coords.longitude }
                      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                      toast.success('✅ تم تحديث موقع المركبة');
                      loadData();
                    } catch { toast.error('فشل تحديث الموقع'); }
                    e.target.value = '';
                  }, () => toast.error('تعذّر الوصول للموقع'));
                }}
                className="text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer"
                defaultValue="">
                <option value="" disabled>🚗 تحديث مركبة</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {VEHICLE_ICONS[v.type]?.svg || '🚗'} {v.name}
                    {v.plate ? ` (${v.plate})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2" dir="rtl">
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="ابحث بالعنوان أو الإحداثيات أو رابط Google Maps..."
            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-300 outline-none pr-10"
            dir="rtl"
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
        >
          {searching ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <MagnifyingGlassIcon className="h-4 w-4" />
          )}
          بحث
        </button>
        <button
          onClick={() => {
            navigator.geolocation.getCurrentPosition(pos => {
              const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              mapInstance.current?.setCenter(loc);
              mapInstance.current?.setZoom(18);
              new window.google.maps.Marker({
                position: loc, map: mapInstance.current,
                title: 'موقعك الحالي',
                icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 10,
                  fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
                animation: window.google.maps.Animation.DROP,
              });
              toast.success('📍 تم تحديد موقعك الحالي');
            }, () => toast.error('تعذّر تحديد موقعك'));
          }}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-3 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          title="موقعي الحالي"
        >
          📍
        </button>
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

      {/* Add Vehicle Form */}
      {showAddVehicle && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 space-y-3" dir="rtl">
          <h3 className="font-bold text-amber-800 dark:text-amber-300 text-sm flex items-center gap-2">
            🚗 إضافة مركبة جديدة
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">نوع المركبة</label>
              <select value={newVehicle.type} onChange={e => setNewVehicle(p => ({...p, type: e.target.value}))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none">
                <option value="car">🚗 سيارة أمن</option>
                <option value="motorcycle">🏍️ موتوسيكل</option>
                <option value="truck">🚛 شاحنة / تجول</option>
                <option value="golf_cart">⛳ عربة جولف</option>
                <option value="bike">🚲 دراجة</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الاسم</label>
              <input value={newVehicle.name} onChange={e => setNewVehicle(p => ({...p, name: e.target.value}))}
                placeholder="مثال: دورية 1"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">رقم اللوحة</label>
              <input value={newVehicle.plate} onChange={e => setNewVehicle(p => ({...p, plate: e.target.value}))}
                placeholder="أ ب ج 1234"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">اللون</label>
              <div className="flex items-center gap-2">
                <input type="color" value={newVehicle.color}
                  onChange={e => setNewVehicle(p => ({...p, color: e.target.value}))}
                  className="w-10 h-9 border border-gray-300 rounded-lg cursor-pointer" />
                <span className="text-xs text-gray-500">{newVehicle.color}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={async () => {
              try {
                await axios.post(`${API}/compounds/${effectiveCompoundId}/map/vehicles`,
                  newVehicle,
                  { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                toast.success('✅ تم إضافة المركبة');
                setNewVehicle({ name: '', type: 'car', plate: '', color: '#3b82f6' });
                setShowAddVehicle(false);
                loadData();
              } catch(e) { toast.error(e.response?.data?.detail || 'فشل الإضافة'); }
            }}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
              <CheckIcon className="h-4 w-4" />
              إضافة
            </button>
            <button onClick={() => setShowAddVehicle(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Vehicles List */}
      {isAdmin && vehicles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">المركبات المسجّلة ({vehicles.length})</p>
          <div className="flex flex-wrap gap-2">
            {vehicles.map(v => {
              const cfg = VEHICLE_ICONS[v.type] || VEHICLE_ICONS.car;
              const hasLocation = !!v.current_location?.lat;
              const trackLen = v.track_history?.length || 0;
              return (
                <div key={v.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${hasLocation ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700' : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'}`}>
                  <span className="text-base">{cfg.svg}</span>
                  <div>
                    <p className="font-bold text-gray-800 dark:text-gray-200">{v.name}</p>
                    {v.plate && <p className="text-gray-500 dark:text-gray-400">{v.plate}</p>}
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${hasLocation ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {hasLocation ? `● نشط · ${trackLen} نقطة` : '● غير محدد'}
                  </span>
                  <button onClick={async () => {
                    if (!window.confirm('حذف المركبة؟')) return;
                    await axios.delete(`${API}/compounds/${compoundId}/map/vehicles/${v.id}`,
                      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                    toast.success('تم الحذف');
                    loadData();
                  }} className="text-red-400 hover:text-red-600 transition-colors">✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

        {/* Drawing overlay — captures clicks above the map */}
        {mode === 'draw_boundary' && (
          <div
            onClick={handleOverlayClick}
            style={{
              position: 'absolute', inset: 0,
              cursor: 'crosshair',
              zIndex: 10,
              background: 'transparent',
            }}
          />
        )}

        {/* Mode indicator */}
        {mode === 'draw_boundary' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2" style={{zIndex: 20}}>
            <div className="bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <span className="animate-pulse">●</span>
              {drawPoints.length === 0 ? 'انقر على الخريطة لبدء رسم الحدود' :
               drawPoints.length < 3 ? `${drawPoints.length} نقطة — أضف ${3 - drawPoints.length} نقاط على الأقل` :
               `${drawPoints.length} نقطة — اضغط "إنهاء" لإغلاق الشكل`}
            </div>
            {drawPoints.length >= 3 && (
              <button
                onClick={finishDrawing}
                style={{zIndex: 20}}
                className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg hover:bg-emerald-700 transition-colors">
                ✅ إنهاء الرسم
              </button>
            )}
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
        {isAdmin && <span className="flex items-center gap-1.5"><span>🚗</span> سيارة أمن</span>}
        {isAdmin && <span className="flex items-center gap-1.5"><span>🏍️</span> موتوسيكل</span>}
        {isAdmin && <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-2 border-dashed border-amber-500"/> مسار</span>}
        <span className="flex items-center gap-1.5"><span className="w-8 h-0.5 bg-red-500 inline-block border-t-2 border-dashed border-red-500"/> حدود الكمبوند</span>
      </div>
    </div>
  );
}
