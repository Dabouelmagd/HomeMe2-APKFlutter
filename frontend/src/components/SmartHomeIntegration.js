import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  HomeModernIcon,
  CogIcon,
  BoltIcon,
  LightBulbIcon,
  FireIcon,
  ShieldCheckIcon,
  CameraIcon,
  SpeakerWaveIcon,
  AcademicCapIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  PauseIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  WifiIcon,
  SignalIcon,
  BatteryIcon,
  ThermometerIcon
} from '@heroicons/react/24/outline';
import { 
  LightBulbIcon as LightBulbSolidIcon,
  BoltIcon as BoltSolidIcon 
} from '@heroicons/react/24/solid';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SmartHomeIntegration = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('devices');
  const [devices, setDevices] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [showAddAutomationModal, setShowAddAutomationModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [stats, setStats] = useState({});

  // Form states
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    type: '',
    brand: '',
    model: '',
    location: '',
    ip_address: '',
    mac_address: '',
    protocol: 'wifi'
  });

  const [automationForm, setAutomationForm] = useState({
    name: '',
    trigger_type: 'time',
    trigger_value: '',
    action_type: 'device_control',
    target_devices: [],
    action_value: '',
    conditions: [],
    is_active: true
  });

  const deviceTypes = [
    { value: 'smart_light', label: t('smart_light'), icon: LightBulbIcon, color: 'text-yellow-500' },
    { value: 'smart_switch', label: t('smart_switch'), icon: BoltIcon, color: 'text-blue-500' },
    { value: 'thermostat', label: t('smart_thermostat'), icon: FireIcon, color: 'text-red-500' },
    { value: 'security_camera', label: t('security_camera'), icon: CameraIcon, color: 'text-green-500' },
    { value: 'door_lock', label: t('smart_lock'), icon: ShieldCheckIcon, color: 'text-purple-500' },
    { value: 'smart_speaker', label: t('smart_speaker'), icon: SpeakerWaveIcon, color: 'text-indigo-500' },
    { value: 'sensor', label: t('sensor'), icon: AcademicCapIcon, color: 'text-pink-500' },
    { value: 'smart_tv', label: t('smart_tv'), icon: HomeModernIcon, color: 'text-gray-500' }
  ];

  const deviceStatuses = [
    { value: 'online', label: t('online'), color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
    { value: 'offline', label: t('offline'), color: 'bg-red-100 text-red-800', icon: XCircleIcon },
    { value: 'error', label: t('error'), color: 'bg-orange-100 text-orange-800', icon: ExclamationTriangleIcon }
  ];

  const triggerTypes = [
    { value: 'time', label: t('time_based') },
    { value: 'device_state', label: t('device_state') },
    { value: 'sensor', label: t('sensor_reading') },
    { value: 'location', label: t('location_based') },
    { value: 'weather', label: t('weather_condition') }
  ];

  const actionTypes = [
    { value: 'device_control', label: t('control_device') },
    { value: 'scene_activate', label: t('activate_scene') },
    { value: 'notification', label: t('send_notification') },
    { value: 'security_action', label: t('security_action') }
  ];

  useEffect(() => {
    fetchSmartHomeData();
  }, []);

  const fetchSmartHomeData = async () => {
    try {
      setLoading(true);
      const [devicesRes, automationsRes, scenesRes, statsRes] = await Promise.all([
        axios.get(`${API}/smart-home/devices`),
        axios.get(`${API}/smart-home/automations`),
        axios.get(`${API}/smart-home/scenes`),
        axios.get(`${API}/smart-home/stats`)
      ]);
      
      setDevices(devicesRes.data.devices || []);
      setAutomations(automationsRes.data.automations || []);
      setScenes(scenesRes.data.scenes || []);
      setStats(statsRes.data.stats || {});
    } catch (error) {
      toast.error('Failed to load smart home data');
      console.error('Smart home fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/smart-home/devices`, deviceForm);
      
      toast.success('Smart device added successfully!');
      setShowAddDeviceModal(false);
      setDeviceForm({
        name: '',
        type: '',
        brand: '',
        model: '',
        location: '',
        ip_address: '',
        mac_address: '',
        protocol: 'wifi'
      });
      fetchSmartHomeData();
    } catch (error) {
      toast.error('Failed to add smart device');
      console.error('Add device error:', error);
    }
  };

  const handleDeviceControl = async (deviceId, action, value = null) => {
    try {
      await axios.post(`${API}/smart-home/devices/${deviceId}/control`, {
        action: action,
        value: value
      });
      
      toast.success('Device controlled successfully!');
      fetchSmartHomeData();
    } catch (error) {
      toast.error('Failed to control device');
      console.error('Device control error:', error);
    }
  };

  const handleCreateAutomation = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/smart-home/automations`, automationForm);
      
      toast.success('Automation created successfully!');
      setShowAddAutomationModal(false);
      setAutomationForm({
        name: '',
        trigger_type: 'time',
        trigger_value: '',
        action_type: 'device_control',
        target_devices: [],
        action_value: '',
        conditions: [],
        is_active: true
      });
      fetchSmartHomeData();
    } catch (error) {
      toast.error('Failed to create automation');
      console.error('Create automation error:', error);
    }
  };

  const toggleAutomation = async (automationId, isActive) => {
    try {
      await axios.patch(`${API}/smart-home/automations/${automationId}`, {
        is_active: !isActive
      });
      
      toast.success(`Automation ${!isActive ? 'enabled' : 'disabled'} successfully!`);
      fetchSmartHomeData();
    } catch (error) {
      toast.error('Failed to toggle automation');
      console.error('Toggle automation error:', error);
    }
  };

  const activateScene = async (sceneId) => {
    try {
      await axios.post(`${API}/smart-home/scenes/${sceneId}/activate`);
      
      toast.success('Scene activated successfully!');
      fetchSmartHomeData();
    } catch (error) {
      toast.error('Failed to activate scene');
      console.error('Activate scene error:', error);
    }
  };

  const getDeviceIcon = (type) => {
    const deviceType = deviceTypes.find(dt => dt.value === type);
    if (!deviceType) return HomeModernIcon;
    return deviceType.icon;
  };

  const getDeviceColor = (type) => {
    const deviceType = deviceTypes.find(dt => dt.value === type);
    return deviceType ? deviceType.color : 'text-gray-500';
  };

  const getStatusBadge = (status) => {
    const statusConfig = deviceStatuses.find(s => s.value === status);
    if (!statusConfig) return null;
    
    const Icon = statusConfig.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('smart_home_integration')}</h1>
            <p className="text-gray-600 mt-2">{t('smart_home_description')}</p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={() => setShowAddDeviceModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              {t('add_device')}
            </button>
            <button
              onClick={() => setShowAddAutomationModal(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CogIcon className="w-5 h-5 mr-2" />
              {t('create_automation')}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('total_devices')}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_devices || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <HomeModernIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('online_devices')}</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.online_devices || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('active_automations')}</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.active_automations || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <CogIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('energy_saved')}</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.energy_saved || 0}%</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500">
              <BoltIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'devices', label: t('devices'), icon: HomeModernIcon },
            { key: 'automations', label: t('automations'), icon: CogIcon },
            { key: 'scenes', label: t('scenes'), icon: PlayIcon },
            { key: 'energy', label: t('energy_monitoring'), icon: ChartBarIcon }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'devices' && (
          <>
            {devices.length === 0 ? (
              <div className="text-center py-12">
                <HomeModernIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t('no_devices')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('no_devices_description')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.map((device) => {
                  const DeviceIcon = getDeviceIcon(device.type);
                  return (
                    <div key={device.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg bg-gray-100`}>
                              <DeviceIcon className={`w-6 h-6 ${getDeviceColor(device.type)}`} />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{device.name}</h3>
                              <p className="text-sm text-gray-500">{device.location}</p>
                            </div>
                          </div>
                          {getStatusBadge(device.status)}
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{t('brand')}:</span>
                            <span className="text-gray-900">{device.brand} {device.model}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{t('protocol')}:</span>
                            <span className="text-gray-900 flex items-center">
                              <WifiIcon className="w-4 h-4 mr-1" />
                              {device.protocol}
                            </span>
                          </div>
                          {device.battery_level && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">{t('battery')}:</span>
                              <span className="text-gray-900 flex items-center">
                                <BatteryIcon className="w-4 h-4 mr-1" />
                                {device.battery_level}%
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          {device.type === 'smart_light' && (
                            <button
                              onClick={() => handleDeviceControl(device.id, 'toggle')}
                              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                                device.state?.on 
                                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              {device.state?.on ? (
                                <LightBulbSolidIcon className="w-4 h-4 inline mr-1" />
                              ) : (
                                <LightBulbIcon className="w-4 h-4 inline mr-1" />
                              )}
                              {device.state?.on ? t('turn_off') : t('turn_on')}
                            </button>
                          )}
                          
                          {device.type === 'smart_switch' && (
                            <button
                              onClick={() => handleDeviceControl(device.id, 'toggle')}
                              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                                device.state?.on 
                                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              {device.state?.on ? (
                                <BoltSolidIcon className="w-4 h-4 inline mr-1" />
                              ) : (
                                <BoltIcon className="w-4 h-4 inline mr-1" />
                              )}
                              {device.state?.on ? t('turn_off') : t('turn_on')}
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedDevice(device)}
                            className="px-3 py-2 text-gray-600 hover:text-blue-600 transition-colors"
                          >
                            <CogIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'automations' && (
          <>
            {automations.length === 0 ? (
              <div className="text-center py-12">
                <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t('no_automations')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('no_automations_description')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {automations.map((automation) => (
                  <div key={automation.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{automation.name}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              automation.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {automation.is_active ? t('active') : t('inactive')}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-3">
                            <p><strong>{t('trigger')}:</strong> {automation.trigger_description}</p>
                            <p><strong>{t('action')}:</strong> {automation.action_description}</p>
                            {automation.last_triggered && (
                              <p><strong>{t('last_triggered')}:</strong> {new Date(automation.last_triggered).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => toggleAutomation(automation.id, automation.is_active)}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              automation.is_active
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {automation.is_active ? t('disable') : t('enable')}
                          </button>
                          <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-600 hover:text-red-600 transition-colors">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'scenes' && (
          <>
            {scenes.length === 0 ? (
              <div className="text-center py-12">
                <PlayIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t('no_scenes')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('no_scenes_description')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scenes.map((scene) => (
                  <div key={scene.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 rounded-lg bg-purple-100">
                          <PlayIcon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{scene.name}</h3>
                          <p className="text-sm text-gray-500">{scene.description}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">{t('devices_affected')}:</p>
                        <div className="flex flex-wrap gap-2">
                          {scene.devices?.slice(0, 3).map((deviceId, index) => {
                            const device = devices.find(d => d.id === deviceId);
                            return device ? (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                                {device.name}
                              </span>
                            ) : null;
                          })}
                          {scene.devices?.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                              +{scene.devices.length - 3} {t('more')}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => activateScene(scene.id)}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                      >
                        <PlayIcon className="w-4 h-4 mr-2" />
                        {t('activate_scene')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'energy' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('energy_consumption')}</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('today')}</span>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-gray-900">24.5</span>
                    <span className="text-sm text-gray-500 ml-1">kWh</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('this_month')}</span>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-gray-900">682</span>
                    <span className="text-sm text-gray-500 ml-1">kWh</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('estimated_cost')}</span>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-green-600">$89.46</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('top_energy_consumers')}</h3>
              <div className="space-y-3">
                {devices.filter(d => d.energy_usage).slice(0, 5).map((device, index) => (
                  <div key={device.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <span className="text-sm text-gray-900">{device.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{device.energy_usage} kWh</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Device Modal */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{t('add_smart_device')}</h2>
            </div>
            
            <form onSubmit={handleAddDevice} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('device_name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={deviceForm.name}
                    onChange={(e) => setDeviceForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('device_type')} *
                  </label>
                  <select
                    required
                    value={deviceForm.type}
                    onChange={(e) => setDeviceForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('select_device_type')}</option>
                    {deviceTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('brand')}
                  </label>
                  <input
                    type="text"
                    value={deviceForm.brand}
                    onChange={(e) => setDeviceForm(prev => ({ ...prev, brand: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('model')}
                  </label>
                  <input
                    type="text"
                    value={deviceForm.model}
                    onChange={(e) => setDeviceForm(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('location')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={deviceForm.location}
                    onChange={(e) => setDeviceForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('location_placeholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('protocol')}
                  </label>
                  <select
                    value={deviceForm.protocol}
                    onChange={(e) => setDeviceForm(prev => ({ ...prev, protocol: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="wifi">Wi-Fi</option>
                    <option value="zigbee">Zigbee</option>
                    <option value="zwave">Z-Wave</option>
                    <option value="bluetooth">Bluetooth</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('ip_address')}
                  </label>
                  <input
                    type="text"
                    value={deviceForm.ip_address}
                    onChange={(e) => setDeviceForm(prev => ({ ...prev, ip_address: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="192.168.1.100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('mac_address')}
                  </label>
                  <input
                    type="text"
                    value={deviceForm.mac_address}
                    onChange={(e) => setDeviceForm(prev => ({ ...prev, mac_address: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="AA:BB:CC:DD:EE:FF"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('add_device')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Automation Modal */}
      {showAddAutomationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{t('create_automation')}</h2>
            </div>
            
            <form onSubmit={handleCreateAutomation} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('automation_name')} *
                </label>
                <input
                  type="text"
                  required
                  value={automationForm.name}
                  onChange={(e) => setAutomationForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('automation_name_placeholder')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('trigger_type')} *
                  </label>
                  <select
                    required
                    value={automationForm.trigger_type}
                    onChange={(e) => setAutomationForm(prev => ({ ...prev, trigger_type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {triggerTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('trigger_value')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={automationForm.trigger_value}
                    onChange={(e) => setAutomationForm(prev => ({ ...prev, trigger_value: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={automationForm.trigger_type === 'time' ? '18:00' : t('trigger_value_placeholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('action_type')} *
                  </label>
                  <select
                    required
                    value={automationForm.action_type}
                    onChange={(e) => setAutomationForm(prev => ({ ...prev, action_type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {actionTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('action_value')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={automationForm.action_value}
                    onChange={(e) => setAutomationForm(prev => ({ ...prev, action_value: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('action_value_placeholder')}
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={automationForm.is_active}
                    onChange={(e) => setAutomationForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('activate_immediately')}</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddAutomationModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {t('create_automation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartHomeIntegration;