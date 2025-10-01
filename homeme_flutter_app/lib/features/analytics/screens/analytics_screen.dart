import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../../core/l10n/app_localizations.dart';
import '../../../core/services/api_service.dart';
import '../widgets/metric_card.dart';
import '../widgets/chart_section.dart';

class AnalyticsScreen extends ConsumerStatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  ConsumerState<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends ConsumerState<AnalyticsScreen> 
    with TickerProviderStateMixin {
  late TabController _tabController;
  Map<String, dynamic> _analyticsData = {};
  bool _isLoading = true;
  String _selectedPeriod = '7d'; // 7d, 30d, 90d, 1y

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadAnalyticsData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAnalyticsData() async {
    try {
      // In real app: final data = await ApiService.getAnalyticsData(_selectedPeriod);
      setState(() {
        _analyticsData = _getDummyAnalyticsData();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _analyticsData = _getDummyAnalyticsData();
        _isLoading = false;
      });
    }
  }

  Map<String, dynamic> _getDummyAnalyticsData() {
    return {
      'overview': {
        'total_residents': 156,
        'total_families': 89,
        'active_visitors_today': 12,
        'maintenance_requests_pending': 3,
        'events_this_month': 8,
        'satisfaction_score': 4.2,
        'occupancy_rate': 0.87,
        'revenue_this_month': 125000,
      },
      'visitor_analytics': {
        'total_visitors_this_period': 145,
        'average_daily_visitors': 6.8,
        'peak_hours': [10, 14, 18], // 10AM, 2PM, 6PM
        'visitor_types': {
          'family': 45,
          'business': 23,
          'delivery': 67,
          'maintenance': 10,
        },
        'daily_visitors': [
          {'date': '2024-01-01', 'count': 8},
          {'date': '2024-01-02', 'count': 12},
          {'date': '2024-01-03', 'count': 6},
          {'date': '2024-01-04', 'count': 15},
          {'date': '2024-01-05', 'count': 9},
          {'date': '2024-01-06', 'count': 11},
          {'date': '2024-01-07', 'count': 7},
        ],
      },
      'maintenance_analytics': {
        'total_requests': 45,
        'completed_requests': 38,
        'pending_requests': 7,
        'average_resolution_time': 2.3, // days
        'categories': {
          'electrical': 12,
          'plumbing': 18,
          'hvac': 8,
          'general': 7,
        },
        'monthly_trends': [
          {'month': 'Jan', 'requests': 38},
          {'month': 'Feb', 'requests': 45},
          {'month': 'Mar', 'requests': 52},
          {'month': 'Apr', 'requests': 41},
          {'month': 'May', 'requests': 49},
          {'month': 'Jun', 'requests': 45},
        ],
      },
      'financial_analytics': {
        'total_revenue': 125000,
        'collected_fees': 118500,
        'pending_payments': 6500,
        'collection_rate': 0.948,
        'monthly_revenue': [
          {'month': 'Jan', 'amount': 118000},
          {'month': 'Feb', 'amount': 121000},
          {'month': 'Mar', 'amount': 125000},
          {'month': 'Apr', 'amount': 119000},
          {'month': 'May', 'amount': 123000},
          {'month': 'Jun', 'amount': 125000},
        ],
        'expense_categories': {
          'maintenance': 25000,
          'security': 18000,
          'utilities': 15000,
          'administration': 12000,
          'insurance': 8000,
        },
      },
      'resident_satisfaction': {
        'overall_rating': 4.2,
        'total_responses': 67,
        'ratings_distribution': {
          '5': 28,
          '4': 21,
          '3': 12,
          '2': 4,
          '1': 2,
        },
        'satisfaction_trends': [
          {'month': 'Jan', 'rating': 4.0},
          {'month': 'Feb', 'rating': 4.1},
          {'month': 'Mar', 'rating': 4.2},
          {'month': 'Apr', 'rating': 4.0},
          {'month': 'May', 'rating': 4.3},
          {'month': 'Jun', 'rating': 4.2},
        ],
        'feedback_categories': {
          'maintenance_quality': 4.1,
          'security_service': 4.4,
          'communication': 3.9,
          'facilities': 4.2,
          'management_response': 4.0,
        },
      },
    };
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n?.translate('analytics') ?? 'Analytics'),
        actions: [
          // Period selector
          PopupMenuButton<String>(
            icon: const Icon(Icons.date_range),
            onSelected: (period) {
              setState(() {
                _selectedPeriod = period;
                _isLoading = true;
              });
              _loadAnalyticsData();
            },
            itemBuilder: (context) => [
              PopupMenuItem(value: '7d', child: Text(l10n?.translate('last_7_days') ?? 'Last 7 Days')),
              PopupMenuItem(value: '30d', child: Text(l10n?.translate('last_30_days') ?? 'Last 30 Days')),
              PopupMenuItem(value: '90d', child: Text(l10n?.translate('last_90_days') ?? 'Last 90 Days')),
              PopupMenuItem(value: '1y', child: Text(l10n?.translate('last_year') ?? 'Last Year')),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAnalyticsData,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: [
            Tab(
              icon: const Icon(Icons.dashboard),
              text: l10n?.translate('overview') ?? 'Overview',
            ),
            Tab(
              icon: const Icon(Icons.people),
              text: l10n?.translate('visitors') ?? 'Visitors',
            ),
            Tab(
              icon: const Icon(Icons.build),
              text: l10n?.translate('maintenance') ?? 'Maintenance',
            ),
            Tab(
              icon: const Icon(Icons.attach_money),
              text: l10n?.translate('financial') ?? 'Financial',
            ),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildOverviewTab(),
                _buildVisitorsTab(),
                _buildMaintenanceTab(),
                _buildFinancialTab(),
              ],
            ),
    );
  }

  Widget _buildOverviewTab() {
    final overview = _analyticsData['overview'] ?? {};
    
    return RefreshIndicator(
      onRefresh: _loadAnalyticsData,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Key Metrics Grid
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1.5,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              children: [
                MetricCard(
                  title: AppLocalizations.of(context)?.totalResidents ?? 'Total Residents',
                  value: '${overview['total_residents'] ?? 0}',
                  icon: Icons.people,
                  color: Colors.blue,
                  trend: '+5.2%',
                  isPositive: true,
                ),
                MetricCard(
                  title: AppLocalizations.of(context)?.totalFamilies ?? 'Total Families',
                  value: '${overview['total_families'] ?? 0}',
                  icon: Icons.family_restroom,
                  color: Colors.green,
                  trend: '+2.1%',
                  isPositive: true,
                ),
                MetricCard(
                  title: AppLocalizations.of(context)?.translate('active_visitors') ?? 'Active Visitors',
                  value: '${overview['active_visitors_today'] ?? 0}',
                  icon: Icons.how_to_reg,
                  color: Colors.orange,
                  trend: '-12.3%',
                  isPositive: false,
                ),
                MetricCard(
                  title: AppLocalizations.of(context)?.translate('occupancy_rate') ?? 'Occupancy Rate',
                  value: '${((overview['occupancy_rate'] ?? 0.0) * 100).toStringAsFixed(1)}%',
                  icon: Icons.home,
                  color: Colors.purple,
                  trend: '+1.8%',
                  isPositive: true,
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Satisfaction Score
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      AppLocalizations.of(context)?.translate('resident_satisfaction') ?? 'Resident Satisfaction',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Text(
                          '${overview['satisfaction_score'] ?? 0.0}',
                          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                            color: Colors.amber,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 8),
                        ...List.generate(5, (index) {
                          return Icon(
                            index < (overview['satisfaction_score'] ?? 0.0).floor()
                                ? Icons.star
                                : Icons.star_border,
                            color: Colors.amber,
                            size: 20,
                          );
                        }),
                        const Spacer(),
                        Text(
                          '${_analyticsData['resident_satisfaction']?['total_responses'] ?? 0} ${AppLocalizations.of(context)?.translate('responses') ?? 'responses'}',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Quick Stats
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      AppLocalizations.of(context)?.translate('quick_stats') ?? 'Quick Stats',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildQuickStat(
                          AppLocalizations.of(context)?.translate('events_this_month') ?? 'Events',
                          '${overview['events_this_month'] ?? 0}',
                          Icons.event,
                          Colors.teal,
                        ),
                        _buildQuickStat(
                          AppLocalizations.of(context)?.translate('pending_requests') ?? 'Pending',
                          '${overview['maintenance_requests_pending'] ?? 0}',
                          Icons.pending,
                          Colors.red,
                        ),
                        _buildQuickStat(
                          AppLocalizations.of(context)?.translate('revenue') ?? 'Revenue',
                          '\$${(overview['revenue_this_month'] ?? 0) ~/ 1000}K',
                          Icons.attach_money,
                          Colors.green,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickStat(String title, String value, IconData icon, Color color) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 24),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          title,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildVisitorsTab() {
    final visitorData = _analyticsData['visitor_analytics'] ?? {};
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Visitor Stats
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.5,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            children: [
              MetricCard(
                title: AppLocalizations.of(context)?.translate('total_visitors') ?? 'Total Visitors',
                value: '${visitorData['total_visitors_this_period'] ?? 0}',
                icon: Icons.people,
                color: Colors.blue,
              ),
              MetricCard(
                title: AppLocalizations.of(context)?.translate('daily_average') ?? 'Daily Average',
                value: '${visitorData['average_daily_visitors']?.toStringAsFixed(1) ?? '0'}',
                icon: Icons.trending_up,
                color: Colors.green,
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // Daily Visitors Chart
          ChartSection(
            title: AppLocalizations.of(context)?.translate('daily_visitors_trend') ?? 'Daily Visitors Trend',
            chart: _buildDailyVisitorsChart(visitorData['daily_visitors'] ?? []),
          ),
          
          const SizedBox(height: 24),
          
          // Visitor Types Pie Chart
          ChartSection(
            title: AppLocalizations.of(context)?.translate('visitor_types') ?? 'Visitor Types',
            chart: _buildVisitorTypesPieChart(visitorData['visitor_types'] ?? {}),
          ),
        ],
      ),
    );
  }

  Widget _buildMaintenanceTab() {
    final maintenanceData = _analyticsData['maintenance_analytics'] ?? {};
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Maintenance Stats
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.5,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            children: [
              MetricCard(
                title: AppLocalizations.of(context)?.translate('total_requests') ?? 'Total Requests',
                value: '${maintenanceData['total_requests'] ?? 0}',
                icon: Icons.build,
                color: Colors.orange,
              ),
              MetricCard(
                title: AppLocalizations.of(context)?.translate('completion_rate') ?? 'Completion Rate',
                value: '${(((maintenanceData['completed_requests'] ?? 0) / (maintenanceData['total_requests'] ?? 1)) * 100).toStringAsFixed(1)}%',
                icon: Icons.check_circle,
                color: Colors.green,
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // Monthly Requests Trend
          ChartSection(
            title: AppLocalizations.of(context)?.translate('monthly_requests') ?? 'Monthly Requests',
            chart: _buildMonthlyRequestsChart(maintenanceData['monthly_trends'] ?? []),
          ),
          
          const SizedBox(height: 24),
          
          // Categories Breakdown
          ChartSection(
            title: AppLocalizations.of(context)?.translate('request_categories') ?? 'Request Categories',
            chart: _buildCategoriesPieChart(maintenanceData['categories'] ?? {}),
          ),
        ],
      ),
    );
  }

  Widget _buildFinancialTab() {
    final financialData = _analyticsData['financial_analytics'] ?? {};
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Financial Stats
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.5,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            children: [
              MetricCard(
                title: AppLocalizations.of(context)?.translate('total_revenue') ?? 'Total Revenue',
                value: '\$${(financialData['total_revenue'] ?? 0) ~/ 1000}K',
                icon: Icons.attach_money,
                color: Colors.green,
              ),
              MetricCard(
                title: AppLocalizations.of(context)?.translate('collection_rate') ?? 'Collection Rate',
                value: '${((financialData['collection_rate'] ?? 0.0) * 100).toStringAsFixed(1)}%',
                icon: Icons.receipt,
                color: Colors.blue,
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // Revenue Trend
          ChartSection(
            title: AppLocalizations.of(context)?.translate('monthly_revenue') ?? 'Monthly Revenue',
            chart: _buildRevenueChart(financialData['monthly_revenue'] ?? []),
          ),
          
          const SizedBox(height: 24),
          
          // Expense Breakdown
          ChartSection(
            title: AppLocalizations.of(context)?.translate('expense_breakdown') ?? 'Expense Breakdown',
            chart: _buildExpensesPieChart(financialData['expense_categories'] ?? {}),
          ),
        ],
      ),
    );
  }

  Widget _buildDailyVisitorsChart(List<dynamic> data) {
    if (data.isEmpty) return const SizedBox(height: 200, child: Center(child: Text('No data available')));
    
    return SizedBox(
      height: 200,
      child: LineChart(
        LineChartData(
          gridData: FlGridData(show: true, drawHorizontalLine: true, drawVerticalLine: false),
          titlesData: FlTitlesData(
            leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40)),
            bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 30)),
            rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          borderData: FlBorderData(show: true, border: Border.all(color: Colors.grey.shade300)),
          lineBarsData: [
            LineChartBarData(
              spots: data.asMap().entries.map((entry) {
                return FlSpot(entry.key.toDouble(), (entry.value['count'] as num).toDouble());
              }).toList(),
              isCurved: true,
              color: Colors.blue,
              barWidth: 3,
              dotData: FlDotData(show: true),
              belowBarData: BarAreaData(show: true, color: Colors.blue.withOpacity(0.1)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVisitorTypesPieChart(Map<String, dynamic> data) {
    if (data.isEmpty) return const SizedBox(height: 200, child: Center(child: Text('No data available')));
    
    final colors = [Colors.blue, Colors.green, Colors.orange, Colors.red, Colors.purple];
    
    return SizedBox(
      height: 200,
      child: PieChart(
        PieChartData(
          sections: data.entries.map((entry) {
            final index = data.keys.toList().indexOf(entry.key);
            return PieChartSectionData(
              value: (entry.value as num).toDouble(),
              title: '${entry.key}\n${entry.value}',
              color: colors[index % colors.length],
              radius: 60,
              titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
            );
          }).toList(),
          sectionsSpace: 2,
          centerSpaceRadius: 40,
        ),
      ),
    );
  }

  Widget _buildMonthlyRequestsChart(List<dynamic> data) {
    if (data.isEmpty) return const SizedBox(height: 200, child: Center(child: Text('No data available')));
    
    return SizedBox(
      height: 200,
      child: BarChart(
        BarChartData(
          gridData: FlGridData(show: true, drawHorizontalLine: true, drawVerticalLine: false),
          titlesData: FlTitlesData(
            leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40)),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true, 
                reservedSize: 30,
                getTitlesWidget: (value, meta) {
                  final index = value.toInt();
                  if (index >= 0 && index < data.length) {
                    return Text(data[index]['month'] ?? '', style: const TextStyle(fontSize: 10));
                  }
                  return const Text('');
                },
              ),
            ),
            rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          borderData: FlBorderData(show: true, border: Border.all(color: Colors.grey.shade300)),
          barGroups: data.asMap().entries.map((entry) {
            return BarChartGroupData(
              x: entry.key,
              barRods: [
                BarChartRodData(
                  toY: (entry.value['requests'] as num).toDouble(),
                  color: Colors.orange,
                  width: 20,
                  borderRadius: BorderRadius.circular(4),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildCategoriesPieChart(Map<String, dynamic> data) {
    return _buildVisitorTypesPieChart(data); // Same structure
  }

  Widget _buildRevenueChart(List<dynamic> data) {
    if (data.isEmpty) return const SizedBox(height: 200, child: Center(child: Text('No data available')));
    
    return SizedBox(
      height: 200,
      child: LineChart(
        LineChartData(
          gridData: FlGridData(show: true, drawHorizontalLine: true, drawVerticalLine: false),
          titlesData: FlTitlesData(
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true, 
                reservedSize: 50,
                getTitlesWidget: (value, meta) {
                  return Text('\$${(value ~/ 1000)}K', style: const TextStyle(fontSize: 10));
                },
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true, 
                reservedSize: 30,
                getTitlesWidget: (value, meta) {
                  final index = value.toInt();
                  if (index >= 0 && index < data.length) {
                    return Text(data[index]['month'] ?? '', style: const TextStyle(fontSize: 10));
                  }
                  return const Text('');
                },
              ),
            ),
            rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          borderData: FlBorderData(show: true, border: Border.all(color: Colors.grey.shade300)),
          lineBarsData: [
            LineChartBarData(
              spots: data.asMap().entries.map((entry) {
                return FlSpot(entry.key.toDouble(), (entry.value['amount'] as num).toDouble());
              }).toList(),
              isCurved: true,
              color: Colors.green,
              barWidth: 3,
              dotData: FlDotData(show: true),
              belowBarData: BarAreaData(show: true, color: Colors.green.withOpacity(0.1)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExpensesPieChart(Map<String, dynamic> data) {
    return _buildVisitorTypesPieChart(data); // Same structure
  }
}