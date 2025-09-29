import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/dashboard/screens/admin_dashboard_screen.dart';
import '../../features/dashboard/screens/resident_dashboard_screen.dart';
import '../../features/guests/screens/guests_screen.dart';
import '../../features/maintenance/screens/maintenance_screen.dart';
import '../../features/events/screens/events_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/splash/screens/splash_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isLoggedIn = authState.isLoggedIn;
      final isLoading = authState.isLoading;
      
      // Show splash while loading
      if (isLoading && state.location == '/splash') {
        return null;
      }
      
      // Redirect to login if not authenticated
      if (!isLoggedIn && state.location != '/login' && state.location != '/register') {
        return '/login';
      }
      
      // Redirect to dashboard if logged in and trying to access auth pages
      if (isLoggedIn && (state.location == '/login' || state.location == '/register')) {
        return authState.user?.role == 'admin' ? '/admin-dashboard' : '/resident-dashboard';
      }
      
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/admin-dashboard',
        builder: (context, state) => const AdminDashboardScreen(),
      ),
      GoRoute(
        path: '/resident-dashboard',
        builder: (context, state) => const ResidentDashboardScreen(),
      ),
      GoRoute(
        path: '/guests',
        builder: (context, state) => const GuestsScreen(),
      ),
      GoRoute(
        path: '/maintenance',
        builder: (context, state) => const MaintenanceScreen(),
      ),
      GoRoute(
        path: '/events',
        builder: (context, state) => const EventsScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
    ],
  );
});