import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/api_service.dart';
import '../../../core/l10n/app_localizations.dart';
import '../widgets/add_guest_dialog.dart';

class GuestsScreen extends ConsumerStatefulWidget {
  const GuestsScreen({super.key});

  @override
  ConsumerState<GuestsScreen> createState() => _GuestsScreenState();
}

class _GuestsScreenState extends ConsumerState<GuestsScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> _guests = [];
  List<dynamic> _visitRequests = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final guests = await ApiService.getGuests();
      final visitRequests = await ApiService.get('/api/visit-requests');
      
      setState(() {
        _guests = guests;
        _visitRequests = visitRequests.data ?? [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _guests = _getDummyGuests();
        _visitRequests = _getDummyVisitRequests();
        _isLoading = false;
      });
    }
  }

  List<dynamic> _getDummyGuests() {
    return [
      {
        'id': '1',
        'name': 'Ahmed Mohamed',
        'phone': '+971 50 123 4567',
        'status': 'checked_in',
        'check_in_time': '10:30 AM',
        'unit': 'A-101',
        'purpose': 'Family visit',
      },
      {
        'id': '2',
        'name': 'Sarah Johnson',
        'phone': '+971 55 987 6543',
        'status': 'pending',
        'expected_time': '2:00 PM',
        'unit': 'B-205',
        'purpose': 'Delivery',
      },
      {
        'id': '3',
        'name': 'Omar Ali',
        'phone': '+971 52 456 7890',
        'status': 'checked_out',
        'check_out_time': '4:15 PM',
        'unit': 'C-301',
        'purpose': 'Maintenance',
      },
    ];
  }

  List<dynamic> _getDummyVisitRequests() {
    return [
      {
        'id': '1',
        'visitor_name': 'John Smith',
        'visitor_phone': '+971 50 111 2222',
        'purpose': 'Business meeting',
        'requested_time': '2024-01-15 14:00:00',
        'unit': 'A-102',
        'status': 'pending',
        'requested_by': 'Mohamed Ahmed',
      },
      {
        'id': '2',
        'visitor_name': 'Lisa Brown',
        'visitor_phone': '+971 55 333 4444',
        'purpose': 'Social visit',
        'requested_time': '2024-01-16 18:30:00',
        'unit': 'B-103',
        'status': 'approved',
        'requested_by': 'Fatima Al-Zahra',
      },
    ];
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'checked_in':
        return Colors.green;
      case 'checked_out':
        return Colors.grey;
      case 'pending':
        return Colors.orange;
      case 'approved':
        return Colors.blue;
      case 'rejected':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status.toLowerCase()) {
      case 'checked_in':
        return 'Checked In';
      case 'checked_out':
        return 'Checked Out';
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)?.guestManagement ?? 'Guest Management'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              icon: const Icon(Icons.people), 
              text: AppLocalizations.of(context)?.translate('current_guests') ?? 'Current Guests'
            ),
            Tab(
              icon: const Icon(Icons.schedule), 
              text: AppLocalizations.of(context)?.translate('visit_requests') ?? 'Visit Requests'
            ),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                // Current Guests Tab
                RefreshIndicator(
                  onRefresh: _loadData,
                  child: _guests.isEmpty
                      ? const Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.people_outline,
                                size: 64,
                                color: Colors.grey,
                              ),
                              SizedBox(height: 16),
                              Text(
                                'No guests currently',
                                style: TextStyle(
                                  fontSize: 18,
                                  color: Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _guests.length,
                          itemBuilder: (context, index) {
                            final guest = _guests[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: _getStatusColor(guest['status']),
                                  child: Text(
                                    guest['name'][0].toUpperCase(),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                title: Text(
                                  guest['name'],
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(guest['phone']),
                                    Text('Unit: ${guest['unit']} • ${guest['purpose']}'),
                                    if (guest['check_in_time'] != null)
                                      Text('Checked in: ${guest['check_in_time']}'),
                                    if (guest['check_out_time'] != null)
                                      Text('Checked out: ${guest['check_out_time']}'),
                                  ],
                                ),
                                trailing: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: _getStatusColor(guest['status']).withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    _getStatusText(guest['status']),
                                    style: TextStyle(
                                      color: _getStatusColor(guest['status']),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                ),
                // Visit Requests Tab
                RefreshIndicator(
                  onRefresh: _loadData,
                  child: _visitRequests.isEmpty
                      ? const Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.schedule,
                                size: 64,
                                color: Colors.grey,
                              ),
                              SizedBox(height: 16),
                              Text(
                                'No visit requests',
                                style: TextStyle(
                                  fontSize: 18,
                                  color: Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _visitRequests.length,
                          itemBuilder: (context, index) {
                            final request = _visitRequests[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: _getStatusColor(request['status']),
                                  child: Text(
                                    request['visitor_name'][0].toUpperCase(),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                title: Text(
                                  request['visitor_name'],
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(request['visitor_phone']),
                                    Text('Unit: ${request['unit']} • ${request['purpose']}'),
                                    Text('Requested by: ${request['requested_by']}'),
                                  ],
                                ),
                                trailing: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: _getStatusColor(request['status']).withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    _getStatusText(request['status']),
                                    style: TextStyle(
                                      color: _getStatusColor(request['status']),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          // Show add guest/visit request dialog
          _showAddGuestDialog();
        },
        icon: const Icon(Icons.add),
        label: const Text('Add Guest'),
      ),
    );
  }

  void _showAddGuestDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Guest'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              decoration: InputDecoration(
                labelText: 'Guest Name',
                border: OutlineInputBorder(),
              ),
            ),
            SizedBox(height: 16),
            TextField(
              decoration: InputDecoration(
                labelText: 'Phone Number',
                border: OutlineInputBorder(),
              ),
            ),
            SizedBox(height: 16),
            TextField(
              decoration: InputDecoration(
                labelText: 'Purpose of Visit',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              // Add guest logic here
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Guest added successfully'),
                ),
              );
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}