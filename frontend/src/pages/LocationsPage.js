import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import LocationMap from '../components/LocationMap';

const LocationsPage = () => {
  const { t } = useTranslation();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locations, setLocations] = useState([]);
  const [nearbyServices, setNearbyServices] = useState([]);
  const [activeTab, setActiveTab] = useState('compound');

  useEffect(() => {
    loadLocationData();
  }, []);

  const loadLocationData = async () => {
    // In a real app, these would come from API
    const compoundLocations = [
      {
        id: 'compound-main',
        lat: 25.2048,
        lng: 55.2708,
        title: t('Main Compound'),
        type: 'compound',
        infoContent: `
          <div class="p-3">
            <h3 class="font-semibold text-lg mb-2">${t('HomeMe Community')}</h3>
            <p class="text-sm text-gray-600 mb-2">${t('Main residential compound with 150 units')}</p>
            <div class="space-y-1 text-xs">
              <div class="flex items-center">
                <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                <span>${t('Security: 24/7')}</span>
              </div>
              <div class="flex items-center">
                <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                <span>${t('Swimming Pool Available')}</span>
              </div>
              <div class="flex items-center">
                <span class="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                <span>${t('Gym & Fitness Center')}</span>
              </div>
            </div>
          </div>
        `,
        onClick: (data) => setSelectedLocation(data)
      },
      {
        id: 'parking-main',
        lat: 25.2052,
        lng: 55.2712,
        title: t('Main Parking'),
        type: 'parking',
        infoContent: `
          <div class="p-3">
            <h3 class="font-semibold text-lg mb-2">${t('Main Parking Area')}</h3>
            <p class="text-sm text-gray-600 mb-2">${t('200+ parking spaces available')}</p>
            <div class="text-xs text-green-600">${t('Available: 45 spaces')}</div>
          </div>
        `
      },
      {
        id: 'security-gate',
        lat: 25.2044,
        lng: 55.2704,
        title: t('Security Gate'),
        type: 'security',
        infoContent: `
          <div class="p-3">
            <h3 class="font-semibold text-lg mb-2">${t('Main Security Gate')}</h3>
            <p class="text-sm text-gray-600 mb-2">${t('24/7 security checkpoint')}</p>
            <div class="text-xs text-blue-600">${t('Current Status: Active')}</div>
          </div>
        `
      }
    ];

    const nearbyServicesData = [
      {
        id: 'hospital-1',
        lat: 25.2068,
        lng: 55.2728,
        title: t('Dubai Hospital'),
        type: 'hospital',
        distance: '1.2 km',
        infoContent: `
          <div class="p-3">
            <h3 class="font-semibold text-lg mb-2">${t('Dubai Hospital')}</h3>
            <p class="text-sm text-gray-600 mb-2">${t('Emergency and general medical services')}</p>
            <div class="text-xs text-red-600">${t('Emergency: 24/7')}</div>
          </div>
        `
      },
      {
        id: 'mall-1',
        lat: 25.2018,
        lng: 55.2758,
        title: t('City Mall'),
        type: 'mall',
        distance: '2.1 km',
        infoContent: `
          <div class="p-3">
            <h3 class="font-semibold text-lg mb-2">${t('City Mall Dubai')}</h3>
            <p class="text-sm text-gray-600 mb-2">${t('Shopping, dining, and entertainment')}</p>
            <div class="text-xs text-green-600">${t('Open: 10:00 AM - 10:00 PM')}</div>
          </div>
        `
      },
      {
        id: 'school-1',
        lat: 25.2078,
        lng: 55.2688,
        title: t('International School'),
        type: 'school',
        distance: '1.8 km',
        infoContent: `
          <div class="p-3">
            <h3 class="font-semibold text-lg mb-2">${t('Dubai International School')}</h3>
            <p class="text-sm text-gray-600 mb-2">${t('K-12 international curriculum')}</p>
            <div class="text-xs text-blue-600">${t('Rating: 4.5/5 stars')}</div>
          </div>
        `
      },
      {
        id: 'metro-1',
        lat: 25.2028,
        lng: 55.2678,
        title: t('Metro Station'),
        type: 'transport',
        distance: '0.8 km',
        infoContent: `
          <div class="p-3">
            <h3 class="font-semibold text-lg mb-2">${t('Business Bay Metro')}</h3>
            <p class="text-sm text-gray-600 mb-2">${t('Red line metro station')}</p>
            <div class="text-xs text-green-600">${t('Next train: 3 minutes')}</div>
          </div>
        `
      }
    ];

    setLocations(compoundLocations);
    setNearbyServices(nearbyServicesData);
  };

  const getMarkerIcon = (type) => {
    const iconColors = {
      compound: '#4285F4',
      parking: '#34A853',
      security: '#EA4335',
      hospital: '#FF5722',
      mall: '#9C27B0',
      school: '#FF9800',
      transport: '#607D8B'
    };

    const color = iconColors[type] || '#757575';
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}"/>
          <circle cx="12" cy="9" r="2.5" fill="white"/>
        </svg>
      `)}`,
      scaledSize: window.google && new window.google.maps.Size(24, 24),
      anchor: window.google && new window.google.maps.Point(12, 24)
    };
  };

  const getCurrentTabMarkers = () => {
    switch (activeTab) {
      case 'compound':
        return locations.map(loc => ({
          ...loc,
          icon: getMarkerIcon(loc.type)
        }));
      case 'services':
        return nearbyServices.map(service => ({
          ...service,
          icon: getMarkerIcon(service.type)
        }));
      case 'all':
        return [...locations, ...nearbyServices].map(item => ({
          ...item,
          icon: getMarkerIcon(item.type)
        }));
      default:
        return [];
    }
  };

  const handleLocationSelect = (location) => {
    console.log('Selected location:', location);
    setSelectedLocation({
      lat: location.lat,
      lng: location.lng,
      title: t('Selected Location')
    });
  };

  const getLocationTypeIcon = (type) => {
    const icons = {
      compound: '🏢',
      parking: '🚗',
      security: '🛡️',
      hospital: '🏥',
      mall: '🛍️',
      school: '🏫',
      transport: '🚇'
    };
    return icons[type] || '📍';
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('locations_map')}
          </h1>
          <p className="text-gray-600">
            {t('explore_compound_facilities')}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'compound', label: t('Compound Facilities'), count: locations.length },
                { id: 'services', label: t('Nearby Services'), count: nearbyServices.length },
                { id: 'all', label: t('All Locations'), count: locations.length + nearbyServices.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  {tab.label}
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeTab === 'compound' && t('Compound Map')}
                  {activeTab === 'services' && t('Nearby Services Map')}
                  {activeTab === 'all' && t('Complete Area Map')}
                </h2>
              </div>
              <LocationMap
                height="500px"
                markers={getCurrentTabMarkers()}
                showCurrentLocation={true}
                onLocationSelect={handleLocationSelect}
                center={{ lat: 25.2048, lng: 55.2708 }}
                zoom={15}
              />
            </div>
          </div>

          {/* Location List */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {activeTab === 'compound' && t('Facilities')}
                  {activeTab === 'services' && t('Services')}
                  {activeTab === 'all' && t('All Locations')}
                </h3>
              </div>
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {getCurrentTabMarkers().map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedLocation(item)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{getLocationTypeIcon(item.type)}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {item.title}
                        </h4>
                        {item.distance && (
                          <p className="text-sm text-blue-600">{item.distance}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {t('Click to view on map')}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('Quick Actions')}
              </h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="text-xl">🚗</div>
                    <span className="text-sm font-medium text-gray-900">
                      {t('Request Parking Space')}
                    </span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="text-xl">🚇</div>
                    <span className="text-sm font-medium text-gray-900">
                      {t('Metro Schedule')}
                    </span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button className="w-full flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="text-xl">🏥</div>
                    <span className="text-sm font-medium text-gray-900">
                      {t('Emergency Contacts')}
                    </span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Location Info */}
            {selectedLocation && (
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('Selected Location')}
                </h3>
                <div className="space-y-2">
                  <p className="font-medium text-gray-800">{selectedLocation.title}</p>
                  <div className="text-sm text-gray-600">
                    <p>{t('Latitude')}: {selectedLocation.lat.toFixed(6)}</p>
                    <p>{t('Longitude')}: {selectedLocation.lng.toFixed(6)}</p>
                  </div>
                  {selectedLocation.distance && (
                    <p className="text-sm text-blue-600">
                      {t('Distance')}: {selectedLocation.distance}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LocationsPage;