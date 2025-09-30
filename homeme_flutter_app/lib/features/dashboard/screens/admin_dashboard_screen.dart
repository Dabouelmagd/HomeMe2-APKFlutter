import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/services/api_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../widgets/dashboard_card.dart';
import '../widgets/stats_card.dart';
import '../widgets/recent_activity_widget.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/widgets/language_switcher.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  Map<String, dynamic>? _dashboardData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    try {
      final data = await ApiService.getAdminDashboard();
      setState(() {
        _dashboardData = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _dashboardData = _getDummyData();
        _isLoading = false;
      });
    }
  }

  Map<String, dynamic> _getDummyData() {
    return {
      'total_residents': 125,
      'total_families': 45,
      'total_services': 17,
      'open_messages': 8,
      'total_compounds': 3,
      'active_visitors': 12,
      'pending_approvals': 5,
      'maintenance_requests': 23,
      'recent_activities': [
        {
          'id': '1',
          'type': 'new_resident',
          'message': 'Ahmed Mohamed joined Unit 101',
          'time': '2 minutes ago',
          'icon': 'person_add',
        },
        {
          'id': '2',
          'type': 'maintenance',
          'message': 'Plumbing repair completed in Building A',
          'time': '15 minutes ago',
          'icon': 'build',
        },
        {
          'id': '3',
          'type': 'visitor',
          'message': 'New visitor checked in at Gate 1',
          'time': '1 hour ago',
          'icon': 'how_to_reg',
        },
      ],
    };
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;

    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)?.translate('admin_dashboard') ?? 'Admin Dashboard'),
        actions: [
          PopupMenuButton(
            icon: CircleAvatar(
              backgroundColor: Colors.white,
              child: Text(
                user?.fullName.substring(0, 1).toUpperCase() ?? 'A',
                style: TextStyle(
                  color: Theme.of(context).primaryColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            itemBuilder: (context) => [
              PopupMenuItem(
                child: ListTile(
                  leading: const Icon(Icons.person),
                  title: Text(AppLocalizations.of(context)?.profile ?? 'Profile'),
                  onTap: () {
                    Navigator.pop(context);
                    // Navigate to profile
                  },
                ),
              ),
              PopupMenuItem(
                child: ListTile(
                  leading: const Icon(Icons.settings),
                  title: const Text('Settings'),
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/settings');
                  },
                ),
              ),
              PopupMenuItem(
                child: ListTile(
                  leading: const Icon(Icons.logout, color: Colors.red),
                  title: const Text('Logout', style: TextStyle(color: Colors.red)),
                  onTap: () {
                    Navigator.pop(context);
                    ref.read(authProvider.notifier).logout();
                  },
                ),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDashboardData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Welcome Section
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Theme.of(context).primaryColor,
                      Theme.of(context).primaryColor.withOpacity(0.8),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Welcome back, ${user?.fullName ?? 'Admin'}! 👋',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            "Here's what's happening in your compound today",
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.white.withOpacity(0.9),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.dashboard,
                      color: Colors.white,
                      size: 48,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Statistics Cards
              Text(
                'Overview',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 1.5,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                children: [
                  StatsCard(
                    title: 'Total Residents',
                    value: '${_dashboardData?['total_residents'] ?? 0}',
                    icon: Icons.people,
                    color: Colors.blue,
                  ),
                  StatsCard(
                    title: 'Total Families',
                    value: '${_dashboardData?['total_families'] ?? 0}',
                    icon: Icons.family_restroom,
                    color: Colors.green,
                  ),
                  StatsCard(
                    title: 'Active Visitors',
                    value: '${_dashboardData?['active_visitors'] ?? 0}',
                    icon: Icons.how_to_reg,
                    color: Colors.orange,
                  ),
                  StatsCard(
                    title: 'Open Messages',
                    value: '${_dashboardData?['open_messages'] ?? 0}',
                    icon: Icons.message,
                    color: Colors.purple,
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Quick Actions
              Text(
                'Quick Actions',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 1.2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                children: [
                  DashboardCard(
                    title: 'Guest Management',
                    icon: Icons.how_to_reg,
                    color: Colors.blue,
                    onTap: () => context.push('/guests'),
                  ),
                  DashboardCard(
                    title: 'Maintenance',
                    icon: Icons.build,
                    color: Colors.orange,
                    onTap: () => context.push('/maintenance'),
                  ),
                  DashboardCard(
                    title: 'Community Events',
                    icon: Icons.event,
                    color: Colors.green,
                    onTap: () => context.push('/events'),
                  ),
                  DashboardCard(
                    title: 'Settings',
                    icon: Icons.settings,
                    color: Colors.purple,
                    onTap: () => context.push('/settings'),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Recent Activity
              Text(
                'Recent Activity',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              RecentActivityWidget(
                activities: _dashboardData?['recent_activities'] ?? [],
              ),
            ],
          ),
        ),
      ),
    );
  }
}