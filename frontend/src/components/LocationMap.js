import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LocationMap = ({ 
  center = { lat: 25.2048, lng: 55.2708 }, // Dubai default
  zoom = 15,
  markers = [],
  height = '400px',
  onLocationSelect = null,
  showCurrentLocation = true,
  interactive = true
}) => {
  const { t } = useTranslation();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load Google Maps API
  const loadGoogleMaps = () => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve(window.google);
        return;
      }

      // Check if script is already loading
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkGoogle = () => {
          if (window.google && window.google.maps) {
            resolve(window.google);
          } else {
            setTimeout(checkGoogle, 100);
          }
        };
        checkGoogle();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        if (window.google && window.google.maps) {
          resolve(window.google);
        } else {
          reject(new Error('Google Maps failed to load'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'));
      };

      document.head.appendChild(script);
    });
  };

  // Get user's current location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          resolve(location);
        },
        (error) => {
          console.warn('Error getting location:', error);
          resolve(null); // Don't reject, just resolve with null
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  };

  // Initialize map
  const initializeMap = async () => {
    try {
      setLoading(true);
      
      // Load Google Maps
      const google = await loadGoogleMaps();
      
      // Get user location if enabled
      let mapCenter = center;
      if (showCurrentLocation) {
        const currentLocation = await getCurrentLocation();
        if (currentLocation) {
          setUserLocation(currentLocation);
          mapCenter = currentLocation;
        }
      }

      // Create map
      const map = new google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: zoom,
        disableDefaultUI: !interactive,
        gestureHandling: interactive ? 'cooperative' : 'none',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      mapInstanceRef.current = map;

      // Add click listener for location selection
      if (onLocationSelect && interactive) {
        map.addListener('click', (event) => {
          const location = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };
          onLocationSelect(location);
        });
      }

      // Add markers
      addMarkers(google, map);

      // Add user location marker
      if (userLocation) {
        new google.maps.Marker({
          position: userLocation,
          map: map,
          title: t('Your Location'),
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="#4285F4"/>
                <circle cx="12" cy="12" r="4" fill="white"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 12)
          }
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to load map. Please check your internet connection.');
      setLoading(false);
    }
  };

  // Add markers to map
  const addMarkers = (google, map) => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    markers.forEach((markerData, index) => {
      const marker = new google.maps.Marker({
        position: { lat: markerData.lat, lng: markerData.lng },
        map: map,
        title: markerData.title || `Location ${index + 1}`,
        icon: markerData.icon || {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(24, 24),
          anchor: new google.maps.Point(12, 24)
        }
      });

      // Add info window if content provided
      if (markerData.infoContent) {
        const infoWindow = new google.maps.InfoWindow({
          content: markerData.infoContent
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      }

      // Add click listener if callback provided
      if (markerData.onClick) {
        marker.addListener('click', () => {
          markerData.onClick(markerData);
        });
      }

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    initializeMap();
  }, []);

  // Update markers when they change
  useEffect(() => {
    if (mapInstanceRef.current && window.google) {
      addMarkers(window.google, mapInstanceRef.current);
    }
  }, [markers]);

  // Handle loading fallback when Google Maps API key is not available
  if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg"
        style={{ height }}
      >
        <div className="text-center p-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-300 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">{t('Map Preview')}</p>
          <p className="text-sm text-gray-500 mt-2">
            {t('Google Maps API key required for interactive maps')}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="flex items-center justify-center bg-red-50 border-2 border-red-200 rounded-lg"
        style={{ height }}
      >
        <div className="text-center p-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-700 font-medium">{t('Map Loading Error')}</p>
          <p className="text-sm text-red-600 mt-2">{error}</p>
          <button
            onClick={initializeMap}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            {t('Try Again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">{t('Loading Map...')}</p>
          </div>
        </div>
      )}
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg"
        style={{ height }}
      />
      {interactive && onLocationSelect && (
        <div className="absolute bottom-4 left-4 right-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-2 text-sm text-gray-600">
          <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.121 2.122" />
          </svg>
          {t('Click on the map to select a location')}
        </div>
      )}
    </div>
  );
};

export default LocationMap;