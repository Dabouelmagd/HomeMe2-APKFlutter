import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { toast } from 'sonner';
import {
  BoltIcon,
  PhoneIcon,
  BeakerIcon,
  FireIcon,
  WifiIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PlusIcon,
  PrinterIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Multi-country provider configuration
const UTILITY_PROVIDERS = {
  EG: { // Egypt
    electricity: [
      'شركة شمال القاهرة لتوزيع الكهرباء',
      'شركة جنوب القاهرة لتوزيع الكهرباء',
      'شركة الإسكندرية لتوزيع الكهرباء',
      'شركة القناة لتوزيع الكهرباء',
      'شركة مصر الوسطى لتوزيع الكهرباء',
      'شركة مصر العليا لتوزيع الكهرباء',
      'شركة شمال الدلتا لتوزيع الكهرباء'
    ],
    water: [
      'شركة مياه الشرب والصرف الصحي بالقاهرة الكبرى',
      'شركة مياه الشرب والصرف الصحي بالإسكندرية',
      'شركة مياه الشرب والصرف الصحي بالجيزة',
      'شركة مياه الشرب والصرف الصحي بالقليوبية',
      'شركة مياه الشرب والصرف الصحي بالشرقية'
    ],
    telecom: [
      'المصرية للاتصالات (WE)',
      'أورانج مصر',
      'فودافون مصر',
      'اتصالات مصر'
    ],
    gas: [
      'الشركة المصرية للغازات الطبيعية (إيجاس)',
      'شركة بتروجاس',
      'شركة غاز مصر',
      'شركة توزيع الغاز الطبيعي للمدن الجديدة'
    ]
  },
  AE: { // UAE
    electricity: [
      'هيئة كهرباء ومياه دبي (DEWA)',
      'شركة أبوظبي لتوزيع المياه والكهرباء (ADDC)',
      'هيئة الشارقة للكهرباء والماء والغاز (SEWA)',
      'دائرة الطاقة في أبوظبي (DoE)',
      'شركة الاتحاد لخدمات الطاقة (UES)'
    ],
    water: [
      'هيئة كهرباء ومياه دبي (DEWA)',
      'شركة أبوظبي لتوزيع المياه والكهرباء (ADDC)',
      'هيئة الشارقة للكهرباء والماء والغاز (SEWA)',
      'شركة مياه وكهرباء الإمارات (EWEC)'
    ],
    telecom: [
      'اتصالات الإمارات (Etisalat)',
      'دو (du)',
      'فيرجن موبايل الإمارات'
    ],
    gas: [
      'شركة غاز الإمارات (Emirates Gas)',
      'أدنوك للتوزيع (ADNOC Distribution)',
      'شركة الإمارات للغاز (EmGas)'
    ]
  },
  SA: { // Saudi Arabia
    electricity: [
      'الشركة السعودية للكهرباء (SEC)',
      'شركة أرامكو السعودية للطاقة',
      'الشركة الوطنية للطاقة المتجددة'
    ],
    water: [
      'شركة المياه الوطنية (NWC)',
      'شركة تحلية المياه المالحة (SWCC)',
      'أمانة المنطقة الشرقية'
    ],
    telecom: [
      'شركة الاتصالات السعودية (STC)',
      'شركة موبايلي',
      'شركة زين السعودية'
    ],
    gas: [
      'شركة أرامكو السعودية',
      'الشركة السعودية للصناعات الأساسية (سابك)',
      'شركة الغاز والتصنيع الأهلية'
    ]
  },
  KW: { // Kuwait
    electricity: [
      'وزارة الكهرباء والماء الكويتية',
      'شركة الخليج لإنتاج الطاقة'
    ],
    water: [
      'وزارة الكهرباء والماء الكويتية',
      'شركة تحلية المياه الكويتية'
    ],
    telecom: [
      'شركة زين الكويت',
      'شركة أوريدو الكويت',
      'شركة فيفا الكويت'
    ],
    gas: [
      'شركة البترول الوطنية الكويتية',
      'شركة نفط الكويت'
    ]
  },
  QA: { // Qatar
    electricity: [
      'شركة كهرماء القطرية (Kahramaa)',
      'شركة راس غاز للطاقة'
    ],
    water: [
      'شركة كهرماء القطرية (Kahramaa)',
      'الشركة القطرية لتحلية المياه'
    ],
    telecom: [
      'شركة اوريدو قطر',
      'فودافون قطر'
    ],
    gas: [
      'شركة قطر للبترول',
      'شركة راس غاز'
    ]
  }
};

// Provider functions for multi-country support
const getElectricityProviders = (country = 'EG') => {
  return UTILITY_PROVIDERS[country]?.electricity || UTILITY_PROVIDERS.EG.electricity;
};

const getWaterProviders = (country = 'EG') => {
  return UTILITY_PROVIDERS[country]?.water || UTILITY_PROVIDERS.EG.water;
};

const getTelecomProviders = (country = 'EG') => {
  return UTILITY_PROVIDERS[country]?.telecom || UTILITY_PROVIDERS.EG.telecom;
};

const getGasProviders = (country = 'EG') => {
  return UTILITY_PROVIDERS[country]?.gas || UTILITY_PROVIDERS.EG.gas;
};

const UtilityBills = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bills');
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(null);

  const [connectionForm, setConnectionForm] = useState({
    utility_type: 'electricity',
    provider_name: '',
    identifier: '', // رقم العداد أو التليفون أو الحساب
    subscriber_name: '', // اسم المشترك
    address: '' // العنوان
  });

  const [selectedCountry, setSelectedCountry] = useState('EG'); // Default to Egypt

  const [billForm, setBillForm] = useState({
    family_id: '',
    unit_number: '',
    utility_type: 'electricity',
    provider_name: '',
    account_number: '',
    billing_period: '',
    issue_date: '',
    due_date: '',
    amount: '',
    previous_reading: '',
    current_reading: '',
    government_reference: ''
  });

  const utilityTypes = {
    electricity: { 
      name: t('electricity'), 
      icon: BoltIcon, 
      color: 'bg-yellow-500',
      providers: getElectricityProviders(),
      identifierLabel: t('meter_number'),
      identifierType: 'meter'
    },
    water: { 
      name: t('water'), 
      icon: BeakerIcon, 
      color: 'bg-blue-500',
      providers: getWaterProviders(),
      identifierLabel: t('meter_number'),
      identifierType: 'meter'
    },
    telephone: { 
      name: t('landline_telephone'), 
      icon: PhoneIcon, 
      color: 'bg-green-500',
      providers: getTelecomProviders(selectedCountry),
      identifierLabel: t('phone_number'),
      identifierType: 'phone'
    },
    mobile: { 
      name: t('mobile_phone'), 
      icon: DevicePhoneMobileIcon, 
      color: 'bg-indigo-500',
      providers: getTelecomProviders(selectedCountry),
      identifierLabel: t('phone_number'),
      identifierType: 'phone'
    },
    natural_gas: { 
      name: t('natural_gas'), 
      icon: FireIcon, 
      color: 'bg-red-500',
      providers: getGasProviders(selectedCountry),
      identifierLabel: t('meter_number'),
      identifierType: 'meter'
    },
    internet: { 
      name: t('internet'), 
      icon: GlobeAltIcon, 
      color: 'bg-purple-500',
      providers: getTelecomProviders(selectedCountry),
      identifierLabel: t('subscriber_number'),
      identifierType: 'subscriber'
    },
    government: { 
      name: t('government_services'), 
      icon: BuildingLibraryIcon, 
      color: 'bg-gray-600',
      providers: [
        'ضريبة العقارات',
        'رسوم الترخيص',
        'المخالفات المرورية',
        'رسوم التوثيق',
        'الضرائب على الدخل',
        'رسوم الخدمات الحكومية'
      ],
      identifierLabel: t('reference_number'),
      identifierType: 'reference'
    }
  };

  useEffect(() => {
    fetchBills();
    fetchConnections();
    checkPaymentStatus();
  }, [user]);

  const checkPaymentStatus = async () => {
    // Check if returning from Stripe payment
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const paymentStatus = urlParams.get('payment');
    
    if (sessionId && paymentStatus === 'success') {
      try {
        const timestamp = Date.now();
        const response = await axios.get(`${API}/payments/status/${sessionId}?_t=${timestamp}`, {
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (response.data.payment_status === 'paid') {
          toast.success(t('payment_successful'));
          fetchBills(); // Refresh bills to show updated status
        } else {
          // Poll for status if not yet confirmed
          pollPaymentStatus(sessionId, 0);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        toast.error(t('payment_status_check_failed'));
      }
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'cancelled') {
      toast.info(t('payment_cancelled'));
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const pollPaymentStatus = async (sessionId, attempts) => {
    const maxAttempts = 5;
    const pollInterval = 2000; // 2 seconds

    if (attempts >= maxAttempts) {
      toast.warning(t('payment_check_timeout'));
      return;
    }

    try {
      const timestamp = Date.now();
      const response = await axios.get(`${API}/payments/status/${sessionId}?_t=${timestamp}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.data.payment_status === 'paid') {
        toast.success(t('payment_successful'));
        fetchBills(); // Refresh bills
        return;
      } else if (response.data.status === 'expired') {
        toast.error(t('payment_expired'));
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error polling payment status:', error);
      toast.error(t('payment_status_check_failed'));
    }
  };

  const fetchBills = async () => {
    try {
      const timestamp = Date.now();
      const response = user?.role === 'admin' 
        ? await axios.get(`${API}/compounds/${user.compound_id}/utility-bills?_t=${timestamp}`, {
            headers: { 'Cache-Control': 'no-cache' }
          })
        : await axios.get(`${API}/utility-bills/my?_t=${timestamp}`, {
            headers: { 'Cache-Control': 'no-cache' }
          });
      setBills(response.data.bills);
    } catch (error) {
      toast.error('Failed to load utility bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const timestamp = Date.now();
      const response = await axios.get(`${API}/compounds/${user.compound_id}/utility-connections?_t=${timestamp}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      setConnections(response.data.connections);
    } catch (error) {
      console.error('Failed to load utility connections:', error);
    }
  };

  // محاكاة نظام جلب الفواتير
  const mockBillData = {
    electricity: {
      'شركة شمال القاهرة لتوزيع الكهرباء': [
        { meter: '123456789', name: 'أحمد محمد علي', amount: 245.50, due_date: '2024-01-15' },
        { meter: '987654321', name: 'فاطمة أحمد حسن', amount: 189.25, due_date: '2024-01-20' },
      ]
    },
    water: {
      'شركة مياه الشرب والصرف الصحي بالقاهرة الكبرى': [
        { meter: '555666777', name: 'محمد أحمد السيد', amount: 78.40, due_date: '2024-01-18' },
      ]
    },
    telephone: {
      'المصرية للاتصالات (WE)': [
        { phone: '0225551234', name: 'سارة محمود عبدالله', amount: 65.80, due_date: '2024-01-25' },
      ]
    }
  };

  // البحث عن فاتورة بالرقم المرجعي
  const findBillByIdentifier = (utilityType, provider, identifier) => {
    const bills = mockBillData[utilityType]?.[provider] || [];
    const field = utilityTypes[utilityType]?.identifierType;
    
    if (field === 'meter') {
      return bills.find(bill => bill.meter === identifier);
    } else if (field === 'phone') {
      return bills.find(bill => bill.phone === identifier);
    }
    return null;
  };

  // Handle creating connection
  const handleCreateConnection = async (e) => {
    e.preventDefault();
    try {
      // محاولة العثور على فاتورة
      const foundBill = findBillByIdentifier(
        connectionForm.utility_type, 
        connectionForm.provider_name, 
        connectionForm.identifier
      );

      const newConnection = {
        ...connectionForm,
        id: Date.now(),
        created_at: new Date().toISOString(),
        status: 'active',
        has_pending_bill: !!foundBill,
        pending_amount: foundBill?.amount || 0,
        last_bill_date: foundBill?.due_date
      };
      
      setConnections([...connections, newConnection]);

      // إضافة الفاتورة إذا وُجدت
      if (foundBill) {
        const newBill = {
          id: Date.now() + 1,
          family_id: user?.family_id || 'default',
          unit_number: user?.unit_number || 'A-101',
          utility_type: connectionForm.utility_type,
          provider_name: connectionForm.provider_name,
          account_number: connectionForm.identifier,
          subscriber_name: foundBill.name,
          billing_period: 'ديسمبر 2024',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: foundBill.due_date,
          amount: foundBill.amount,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        setBills([...bills, newBill]);
        toast.success(t('connection_and_bill_added'));
      } else {
        toast.success(t('connection_added_successfully'));
      }

      setConnectionForm({
        utility_type: 'electricity',
        provider_name: '',
        identifier: '',
        subscriber_name: '',
        address: ''
      });
      setShowAddConnection(false);
    } catch (error) {
      toast.error(t('failed_to_add_connection'));
    }
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    try {
      const billData = {
        ...billForm,
        amount: parseFloat(billForm.amount),
        previous_reading: billForm.previous_reading ? parseFloat(billForm.previous_reading) : null,
        current_reading: billForm.current_reading ? parseFloat(billForm.current_reading) : null,
        issue_date: new Date(billForm.issue_date).toISOString(),
        due_date: new Date(billForm.due_date).toISOString()
      };
      
      await axios.post(`${API}/compounds/${user.compound_id}/utility-bills`, billData);
      toast.success('Utility bill created successfully!');
      setShowAddBill(false);
      setBillForm({
        family_id: '',
        unit_number: '',
        utility_type: 'electricity',
        provider_name: '',
        account_number: '',
        billing_period: '',
        issue_date: '',
        due_date: '',
        amount: '',
        previous_reading: '',
        current_reading: '',
        government_reference: ''
      });
      fetchBills();
    } catch (error) {
      toast.error('Failed to create utility bill');
    }
  };

  const handlePayBill = async (billId, amount) => {
    setProcessingPayment(billId);
    try {
      const timestamp = Date.now();
      const response = await axios.post(`${API}/payments/create-session?_t=${timestamp}`, {
        utility_bill_id: billId,
        amount: amount,
        currency: 'EGP'
      }, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      // Redirect to Stripe checkout
      window.location.href = response.data.checkout_url;
      
    } catch (error) {
      console.error('Payment session creation error:', error);
      toast.error(t('payment_failed_try_again'));
      setProcessingPayment(null);
    }
  };

  const getUtilityIcon = (type) => {
    const utilityInfo = utilityTypes[type] || utilityTypes.electricity;
    const IconComponent = utilityInfo.icon;
    return <IconComponent className="h-6 w-6" />;
  };

  const getUtilityColor = (type) => {
    return utilityTypes[type]?.color || utilityTypes.electricity.color;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingBills = bills.filter(bill => bill.status === 'pending');
  const totalPending = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);
  const overdueBills = bills.filter(bill => bill.status === 'pending' && isOverdue(bill.due_date));

  return (
    <div className="p-6">
      {/* Version indicator for cache debugging */}
      <div className="mb-4 text-center">
        <small className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
          ✅ {t('updated_version')} - {new Date().toLocaleTimeString()} | 7 {t('utility_types')} | {t('egyptian_providers')}
        </small>
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 text-center">
          {t('government_utility_gateway')}
        </h1>
        <p className="text-gray-600 mt-2 text-center">
          {t('manage_government_utility_bills')}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('pending_bills')}</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingBills.length}</p>
            </div>
            <ClockIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('overdue_bills')}</p>
              <p className="text-2xl font-bold text-red-600">{overdueBills.length}</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('total_pending')}</p>
              <p className="text-2xl font-bold text-gray-900 text-center">{formatCurrency(totalPending)}</p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('connections')}</p>
              <p className="text-2xl font-bold text-gray-900 text-center">{connections.length}</p>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Pending Bills Alert */}
      {overdueBills.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800 text-center">
                {t('overdue_bills_alert', { count: overdueBills.length })}
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {t('pay_overdue_bills_message')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('bills')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'bills'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('utility_bills')} ({bills.length})
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'connections'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('utility_connections')} ({connections.length})
          </button>
        </nav>
      </div>

      {/* Bills Tab */}
      {activeTab === 'bills' && (
        <div className="space-y-6">
          {user?.role === 'admin' && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddBill(true)}
                className="btn btn-primary flex items-center space-x-2"
              >
                <PlusIcon className="h-4 w-4" />
                <span>{t('add_bill')}</span>
              </button>
            </div>
          )}

          {bills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bills.map((bill) => (
                <div key={bill.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getUtilityColor(bill.utility_type)}`}>
                        <div className="text-white">
                          {getUtilityIcon(bill.utility_type)}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-center text-gray-900 capitalize">
                          {utilityTypes[bill.utility_type]?.name || bill.utility_type}
                        </h3>
                        <p className="text-sm text-gray-600">{bill.provider_name}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                      {t(bill.status)}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('account_number')}:</span>
                      <span className="font-medium">{bill.account_number}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('billing_period')}:</span>
                      <span className="font-medium">{bill.billing_period}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('due_date')}:</span>
                      <span className={`font-medium ${isOverdue(bill.due_date) ? 'text-red-600' : ''}`}>
                        {new Date(bill.due_date).toLocaleDateString()}
                      </span>
                    </div>
                    {bill.consumption && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('consumption')}:</span>
                        <span className="font-medium">{bill.consumption} units</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(bill.amount)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {t('gov_ref')}: {bill.government_reference}
                      </span>
                    </div>

                    {user?.role === 'resident' && bill.status === 'pending' && (
                      <button
                        onClick={() => handlePayBill(bill.id, bill.amount)}
                        disabled={processingPayment === bill.id}
                        className="w-full btn btn-primary text-sm flex items-center justify-center space-x-2"
                      >
                        {processingPayment === bill.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>{t('processing')}</span>
                          </>
                        ) : (
                          <>
                            <CurrencyDollarIcon className="h-4 w-4" />
                            <span>{t('pay_now')}</span>
                          </>
                        )}
                      </button>
                    )}

                    {bill.status === 'paid' && (
                      <div className="flex space-x-2">
                        <div className="flex items-center text-green-600 text-sm">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          {t('paid')}
                        </div>
                        <button className="ml-auto text-blue-600 text-sm flex items-center space-x-1">
                          <PrinterIcon className="h-4 w-4" />
                          <span>{t('receipt')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-center text-center text-gray-900 mb-2">{t('no_utility_bills')}</h3>
              <p className="text-gray-600">
                {user?.role === 'admin'
                  ? t('add_first_utility_bill')
                  : t('no_bills_available')
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Connections Tab */}
      {activeTab === 'connections' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddConnection(true)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>{t('add_connection')}</span>
            </button>
          </div>

          {connections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {connections.map((connection) => (
                <div key={connection.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`p-2 rounded-lg ${getUtilityColor(connection.utility_type)}`}>
                      <div className="text-white">
                        {getUtilityIcon(connection.utility_type)}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-center text-gray-900 capitalize">
                        {utilityTypes[connection.utility_type]?.name || connection.utility_type}
                      </h3>
                      <p className="text-sm text-gray-600">{connection.provider_name}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('account_number')}:</span>
                      <span className="font-medium">{connection.account_number}</span>
                    </div>
                    {connection.meter_number && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('meter_number')}:</span>
                        <span className="font-medium">{connection.meter_number}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('unit')}:</span>
                      <span className="font-medium">{connection.unit_number}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('status')}:</span>
                      <span className={`font-medium ${connection.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {connection.is_active ? t('active') : t('inactive')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-center text-center text-gray-900 mb-2">{t('no_utility_connections')}</h3>
              <p className="text-gray-600">{t('add_first_connection')}</p>
            </div>
          )}
        </div>
      )}

      {/* Add Connection Modal */}
      {showAddConnection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-center text-gray-900 text-center">
                  {t('add_utility_connection')}
                </h3>
                <button
                  onClick={() => setShowAddConnection(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateConnection} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('utility_type')}
                  </label>
                  <select
                    value={connectionForm.utility_type}
                    onChange={(e) => setConnectionForm({...connectionForm, utility_type: e.target.value})}
                    className="form-input"
                    required
                  >
                    {Object.keys(utilityTypes).map(type => (
                      <option key={type} value={type}>
                        {utilityTypes[type].name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('provider_name')}
                  </label>
                  <select
                    value={connectionForm.provider_name}
                    onChange={(e) => setConnectionForm({...connectionForm, provider_name: e.target.value})}
                    className="form-input"
                    required
                  >
                    <option value="">{t('select_provider')}</option>
                    {utilityTypes[connectionForm.utility_type]?.providers.map(provider => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {connectionForm.utility_type && utilityTypes[connectionForm.utility_type]?.identifierLabel || t('account_number')}
                  </label>
                  <input
                    type="text"
                    value={connectionForm.identifier}
                    onChange={(e) => setConnectionForm({...connectionForm, identifier: e.target.value})}
                    className="form-input"
                    required
                    placeholder={
                      connectionForm.utility_type && utilityTypes[connectionForm.utility_type]?.identifierType === 'meter' 
                        ? t('enter_meter_number')
                        : connectionForm.utility_type && utilityTypes[connectionForm.utility_type]?.identifierType === 'phone'
                        ? t('enter_phone_number')
                        : connectionForm.utility_type && utilityTypes[connectionForm.utility_type]?.identifierType === 'reference'
                        ? t('enter_reference_number')
                        : connectionForm.utility_type && utilityTypes[connectionForm.utility_type]?.identifierType === 'subscriber'
                        ? t('enter_subscriber_number')
                        : t('enter_account_number')
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('subscriber_name')}
                  </label>
                  <input
                    type="text"
                    value={connectionForm.subscriber_name}
                    onChange={(e) => setConnectionForm({...connectionForm, subscriber_name: e.target.value})}
                    className="form-input"
                    required
                    placeholder={t('enter_subscriber_name')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('address')} ({t('optional')})
                  </label>
                  <textarea
                    value={connectionForm.address}
                    onChange={(e) => setConnectionForm({...connectionForm, address: e.target.value})}
                    className="form-input"
                    rows="2"
                    placeholder={t('enter_address')}
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddConnection(false)}
                    className="btn btn-secondary flex-1"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                  >
                    {t('add_connection')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilityBills;