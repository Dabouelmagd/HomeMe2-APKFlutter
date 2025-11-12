import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, useNotifications } from '../App';
import {
  HomeIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  UsersIcon,
  UserPlusIcon,
  UserGroupIcon,
  SpeakerWaveIcon,
  ChartBarIcon,
  ChartPieIcon,
  TicketIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftEllipsisIcon,
  BellIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  WrenchScrewdriverIcon,
  BoltIcon,
  CogIcon,
  PhotoIcon,
  ClockIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  MagnifyingGlassIcon,
  CommandLineIcon,
  DocumentTextIcon,
  HandRaisedIcon,
  HomeModernIcon,
  EnvelopeIcon,
  NewspaperIcon,
  PhoneIcon,
  QuestionMarkCircleIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import LanguageSwitcher from './LanguageSwitcher';
import { TransliterationToggle } from './TransliterationToggle';
import BackButton from './BackButton';
// import AdvancedSearchModal from './AdvancedSearchModal';

const Layout = ({ children, isTrialMode = false }) => {
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
