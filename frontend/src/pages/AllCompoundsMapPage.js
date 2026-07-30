import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../App';
import { MapIcon, BuildingOfficeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MAPS_KEY = 'AIzaSyBFpCjYAyk3Rqobw3UTzRRkVzdJozrIpNU';
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

let mapsReady = false;
const loadMaps = () => new Promise((resolve) => {
  if (window.google?.maps?.Map) { resolve(); return; }
  if (mapsReady) {
    const t = setInterval(() => { if (window.google?.maps?.Map) { clearInterval(t); resolve(); } }, 100);
    return;
  }
  mapsReady = true;
  window.__mapsAllCb = resolve;
  const s = document.createElement('script');
  s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=__mapsAllCb`;
  s.async = true; s.defer = true;
  document.head.appendChild(s);
});

export default function AllCompoundsMapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [compounds, setCompounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get(`${API}/compounds`, tok())
      .then(r => setCompounds(r.data?.compounds || []))
      .catch(() => toast.error('فشل تحميل الكمبوندات'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !mapRef.current || compounds.length === 0) return;
    loadMaps().then(() => {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 30.0444, lng: 31.2357 },
        zoom: 10,
        mapTypeId: 'roadmap',
      });
      mapInstance.current = map;
      const infoWindow = new window.google.maps.InfoWindow();
      const bounds = new window.google.maps.LatLngBounds();

      compounds.forEach(c => {
        const center = c.map_center || { lat: 30.0444 + Math.random() * 0.1, lng: 31.2357 + Math.random() * 0.1 };
        const marker = new window.google.maps.Marker({
          position: center,
          map,
          title: c.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: c.map_center ? '#059669' : '#6b7280',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3,
          },
          label: { text: c.name.charAt(0), color: '#fff', fontWeight: 'bold' },
        });

        if (c.map_boundary?.length > 2) {
          new window.google.maps.Polygon({
            paths: c.map_boundary,
            strokeColor: '#dc2626',
            strokeWeight: 2,
            fillColor: '#dc2626',
            fillOpacity: 0.08,
            map,
          });
        }

        marker.addListener('click', () => {
          infoWindow.setContent(`
            <div dir="rtl" style="font-family:Cairo,Arial,sans-serif;padding:4px;min-width:160px">
              <p style="font-weight:700;font-size:14px;margin:0 0 4px">${c.name}</p>
              ${c.address ? `<p style="font-size:12px;color:#6b7280;margin:0 0 4px">📍 ${c.address}</p>` : ''}
              <button onclick="window._goToCompound('${c.id}')"
                style="margin-top:8px;width:100%;background:#059669;color:#fff;border:none;padding:6px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:bold">
                🗺️ فتح خريطة الكمبوند
              </button>
            </div>
          `);
          infoWindow.open(map, marker);
          setSelected(c);
        });

        bounds.extend(center);
      });

      if (compounds.length > 1) map.fitBounds(bounds);

      window._goToCompound = (id) => {
        navigate(`/app/compound-map?compound=${id}`);
      };
    });
  }, [loading, compounds]);

  return (
    <div className="space-y-4 p-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <MapIcon className="h-6 w-6 text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            خريطة جميع الكمبوندات ({compounds.length})
          </h2>
        </div>
        <button onClick={() => window.location.reload()}
          className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <ArrowPathIcon className="h-3.5 w-3.5" /> تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">{compounds.length}</p>
          <p className="text-xs text-gray-500">كمبوند مسجّل</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{compounds.filter(c => c.map_center).length}</p>
          <p className="text-xs text-gray-500">محدد الموقع</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{compounds.filter(c => c.map_boundary?.length > 2).length}</p>
          <p className="text-xs text-gray-500">محدد الحدود</p>
        </div>
      </div>

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg" style={{ height: '500px' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">جارٍ تحميل الخريطة...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Compounds List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {compounds.map(c => (
          <div key={c.id}
            className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border rounded-xl cursor-pointer hover:border-emerald-400 transition-colors ${selected?.id === c.id ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700'}`}
            onClick={() => navigate(`/app/compound-map?compound=${c.id}`)}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.map_center ? 'bg-emerald-100' : 'bg-gray-100'}`}>
              {c.logo ? <img src={c.logo} alt={c.name} className="w-full h-full object-cover rounded-xl" /> :
               <BuildingOfficeIcon className={`h-5 w-5 ${c.map_center ? 'text-emerald-600' : 'text-gray-400'}`} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white truncate">{c.name}</p>
              <p className="text-xs text-gray-500 truncate">{c.address || 'لم يتم تحديد العنوان'}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {c.map_center && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">● محدد</span>}
              {c.map_boundary?.length > 2 && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">● حدود</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
