import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:convert';

import '../../../core/services/api_service.dart';
import '../../../core/l10n/app_localizations.dart';
import '../models/notification_model.dart';
import '../widgets/notification_card.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  List<NotificationModel> _allNotifications = [];
  List<NotificationModel> _unreadNotifications = [];
  List<NotificationModel> _readNotifications = [];
  bool _isLoading = true;
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadNotifications();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadNotifications() async {
    try {
      final response = await ApiService.getNotifications();
      final notifications = (response as List)
          .map((json) => NotificationModel.fromJson(json))
          .toList();
      
      setState(() {
        _allNotifications = notifications;
        _unreadNotifications = notifications.where((n) => !n.isRead).toList();
        _readNotifications = notifications.where((n) => n.isRead).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _allNotifications = _getDummyNotifications();
        _unreadNotifications = _allNotifications.where((n) => !n.isRead).toList();
        _readNotifications = _allNotifications.where((n) => n.isRead).toList();
        _isLoading = false;
      });
    }
  }

  List<NotificationModel> _getDummyNotifications() {
    return [
      NotificationModel(
        id: '1',
        title: 'New Maintenance Request',
        message: 'Your maintenance request for AC repair has been approved and assigned to John Technician.',
        type: NotificationType.maintenance,
        priority: NotificationPriority.high,
        isRead: false,
        timestamp: DateTime.now().subtract(const Duration(minutes: 15)),
        actionUrl: '/maintenance/1',
      ),
      NotificationModel(
        id: '2',
        title: 'Guest Arrival',
        message: 'Ahmed Mohamed has arrived and is waiting at the gate for approval.',
        type: NotificationType.visitor,
        priority: NotificationPriority.urgent,
        isRead: false,
        timestamp: DateTime.now().subtract(const Duration(minutes: 30)),
        actionUrl: '/guests',
      ),
      NotificationModel(
        id: '3',
        title: 'Community BBQ Event',
        message: 'Don\'t forget! Community BBQ starts at 6 PM today in the garden area.',
        type: NotificationType.event,
        priority: NotificationPriority.medium,
        isRead: false,
        timestamp: DateTime.now().subtract(const Duration(hours: 2)),
        actionUrl: '/events/1',
      ),
      NotificationModel(
        id: '4',
        title: 'Monthly Fee Reminder',
        message: 'Your monthly fee of \$250 is due tomorrow. Please make the payment to avoid late fees.',
        type: NotificationType.payment,
        priority: NotificationPriority.high,
        isRead: true,
        timestamp: DateTime.now().subtract(const Duration(days: 1)),
        actionUrl: '/payments',
      ),
      NotificationModel(
        id: '5',
        title: 'System Update',
        message: 'HomeMe app has been updated with new features and improvements.',
        type: NotificationType.system,
        priority: NotificationPriority.low,
        isRead: true,
        timestamp: DateTime.now().subtract(const Duration(days: 2)),
      ),
      NotificationModel(
        id: '6',
        title: 'Welcome Message',
        message: 'Welcome to HomeMe! Your account has been successfully created.',
        type: NotificationType.general,
        priority: NotificationPriority.medium,
        isRead: true,
        timestamp: DateTime.now().subtract(const Duration(days: 7)),
      ),
    ];
  }

  List<NotificationModel> _getFilteredNotifications() {
    List<NotificationModel> notifications;
    
    switch (_tabController.index) {
      case 0:
        notifications = _allNotifications;
        break;
      case 1:
        notifications = _unreadNotifications;
        break;
      case 2:
        notifications = _readNotifications;
        break;
      default:
        notifications = _allNotifications;
    }

    if (_selectedFilter == 'all') {
      return notifications;
    }
    
    return notifications.where((n) => n.type.toString().split('.').last == _selectedFilter).toList();
  }

  Future<void> _markAsRead(String notificationId) async {
    try {
      // Call API to mark as read
      // await ApiService.markNotificationAsRead(notificationId);
      
      setState(() {
        final index = _allNotifications.indexWhere((n) => n.id == notificationId);
        if (index != -1) {
          _allNotifications[index] = _allNotifications[index].copyWith(isRead: true);
          _unreadNotifications = _allNotifications.where((n) => !n.isRead).toList();
          _readNotifications = _allNotifications.where((n) => n.isRead).toList();
        }
      });
    } catch (e) {
      // Handle error
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      // Call API to mark all as read
      // await ApiService.markAllNotificationsAsRead();
      
      setState(() {
        _allNotifications = _allNotifications.map((n) => n.copyWith(isRead: true)).toList();
        _unreadNotifications.clear();
        _readNotifications = _allNotifications;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)?.translate('all_notifications_marked_read') ?? 'All notifications marked as read'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      // Handle error
    }
  }

  Future<void> _deleteNotification(String notificationId) async {
    try {
      // Call API to delete notification
      // await ApiService.deleteNotification(notificationId);
      
      setState(() {
        _allNotifications.removeWhere((n) => n.id == notificationId);
        _unreadNotifications.removeWhere((n) => n.id == notificationId);
        _readNotifications.removeWhere((n) => n.id == notificationId);
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)?.translate('notification_deleted') ?? 'Notification deleted'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } catch (e) {
      // Handle error
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n?.notifications ?? 'Notifications'),
        actions: [
          // Filter button
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() {
                _selectedFilter = value;
              });
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'all',
                child: Text(l10n?.translate('all_types') ?? 'All Types'),
              ),
              PopupMenuItem(
                value: 'maintenance',
                child: Text(l10n?.translate('maintenance_notifications') ?? 'Maintenance'),
              ),
              PopupMenuItem(
                value: 'visitor',
                child: Text(l10n?.translate('visitor_notifications') ?? 'Visitors'),
              ),
              PopupMenuItem(
                value: 'event',
                child: Text(l10n?.translate('event_notifications') ?? 'Events'),
              ),
              PopupMenuItem(
                value: 'payment',
                child: Text(l10n?.translate('payment_notifications') ?? 'Payments'),
              ),
              PopupMenuItem(
                value: 'system',
                child: Text(l10n?.translate('system_notifications') ?? 'System'),
              ),
            ],
          ),
          // Mark all as read button
          if (_unreadNotifications.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.done_all),
              tooltip: l10n?.translate('mark_all_read') ?? 'Mark All Read',
              onPressed: _markAllAsRead,
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              icon: const Icon(Icons.notifications),
              text: l10n?.translate('all_notifications') ?? 'All',
              child: Badge(
                label: Text('${_allNotifications.length}'),
                child: Tab(
                  icon: const Icon(Icons.notifications),
                  text: l10n?.translate('all_notifications') ?? 'All',
                ),
              ),
            ),
            Tab(
              icon: Badge(
                isLabelVisible: _unreadNotifications.isNotEmpty,
                label: Text('${_unreadNotifications.length}'),
                child: const Icon(Icons.mark_email_unread),
              ),
              text: l10n?.translate('unread') ?? 'Unread',
            ),
            Tab(
              icon: const Icon(Icons.done),
              text: l10n?.translate('read') ?? 'Read',
            ),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadNotifications,
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildNotificationsList(_getFilteredNotifications()),
                  _buildNotificationsList(_unreadNotifications),
                  _buildNotificationsList(_readNotifications),
                ],
              ),
            ),
    );
  }

  Widget _buildNotificationsList(List<NotificationModel> notifications) {
    if (notifications.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.notifications_none,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              AppLocalizations.of(context)?.translate('no_notifications') ?? 'No notifications',
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(8),
      itemCount: notifications.length,
      itemBuilder: (context, index) {
        final notification = notifications[index];
        return NotificationCard(
          notification: notification,
          onTap: () => _markAsRead(notification.id),
          onDelete: () => _deleteNotification(notification.id),
        );
      },
    );
  }
}