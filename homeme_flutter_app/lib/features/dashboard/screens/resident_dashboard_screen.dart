import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/services/api_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../widgets/dashboard_card.dart';
import '../widgets/stats_card.dart';
import '../widgets/recent_activity_widget.dart';

class ResidentDashboardScreen extends ConsumerStatefulWidget {
  const ResidentDashboardScreen({super.key});

  @override
  ConsumerState<ResidentDashboardScreen> createState() => _ResidentDashboardScreenState();
}

class _ResidentDashboardScreenState extends ConsumerState<ResidentDashboardScreen> {
  Map<String, dynamic>? _dashboardData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    try {
      final data = await ApiService.getResidentDashboard();
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
      'unit_number': 'A-101',
      'family_members': 4,
      'pending_visits': 2,
      'maintenance_requests': 1,
      'monthly_fees_due': 250.0,
      'upcoming_events': 3,
      'recent_activities': [
        {
          'id': '1',
          'type': 'visitor',
          'message': 'Guest Ahmed visited your unit',
          'time': '2 hours ago',
          'icon': 'how_to_reg',
        },
        {
          'id': '2',
          'type': 'maintenance',
          'message': 'AC maintenance scheduled for tomorrow',
          'time': '1 day ago',
          'icon': 'build',
        },
        {
          'id': '3',
          'type': 'event',
          'message': 'Community BBQ event this weekend',
          'time': '2 days ago',
          'icon': 'event',
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
        title: const Text('My Dashboard'),
        actions: [
          PopupMenuButton(
            icon: CircleAvatar(
              backgroundColor: Colors.white,
              child: Text(
                user?.fullName.substring(0, 1).toUpperCase() ?? 'R',
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
                  title: const Text('Profile'),
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
                            'Welcome home, ${user?.fullName ?? 'Resident'}! 🏠',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Unit ${_dashboardData?['unit_number'] ?? 'A-101'}',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.white.withOpacity(0.9),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.home,
                      color: Colors.white,
                      size: 48,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Quick Stats
              Text(
                'Quick Overview',
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
                    title: 'Family Members',
                    value: '${_dashboardData?['family_members'] ?? 0}',
                    icon: Icons.family_restroom,
                    color: Colors.blue,
                  ),
                  StatsCard(
                    title: 'Pending Visits',
                    value: '${_dashboardData?['pending_visits'] ?? 0}',
                    icon: Icons.pending_actions,
                    color: Colors.orange,
                  ),
                  StatsCard(
                    title: 'Maintenance',
                    value: '${_dashboardData?['maintenance_requests'] ?? 0}',
                    icon: Icons.build,
                    color: Colors.red,
                  ),
                  StatsCard(
                    title: 'Monthly Fees',
                    value: '\$${_dashboardData?['monthly_fees_due'] ?? 0}',
                    icon: Icons.payment,
                    color: Colors.green,
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
                    title: 'Invite Guests',
                    icon: Icons.person_add,
                    color: Colors.blue,
                    onTap: () => context.push('/guests'),
                  ),
                  DashboardCard(
                    title: 'Maintenance Request',
                    icon: Icons.build_circle,
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