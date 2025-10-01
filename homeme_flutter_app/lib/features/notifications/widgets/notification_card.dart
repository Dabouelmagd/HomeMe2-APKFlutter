import 'package:flutter/material.dart';
import '../models/notification_model.dart';
import '../../../core/l10n/app_localizations.dart';

class NotificationCard extends StatelessWidget {
  final NotificationModel notification;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;
  final bool showActions;

  const NotificationCard({
    super.key,
    required this.notification,
    this.onTap,
    this.onDelete,
    this.showActions = true,
  });

  IconData _getTypeIcon(NotificationType type) {
    switch (type) {
      case NotificationType.maintenance:
        return Icons.build;
      case NotificationType.visitor:
        return Icons.person;
      case NotificationType.event:
        return Icons.event;
      case NotificationType.payment:
        return Icons.payment;
      case NotificationType.system:
        return Icons.system_update;
      case NotificationType.security:
        return Icons.security;
      case NotificationType.announcement:
        return Icons.campaign;
      case NotificationType.general:
      default:
        return Icons.notifications;
    }
  }

  Color _getTypeColor(NotificationType type) {
    switch (type) {
      case NotificationType.maintenance:
        return Colors.orange;
      case NotificationType.visitor:
        return Colors.blue;
      case NotificationType.event:
        return Colors.green;
      case NotificationType.payment:
        return Colors.red;
      case NotificationType.system:
        return Colors.grey;
      case NotificationType.security:
        return Colors.purple;
      case NotificationType.announcement:
        return Colors.teal;
      case NotificationType.general:
      default:
        return Colors.indigo;
    }
  }

  Color _getPriorityColor(NotificationPriority priority) {
    switch (priority) {
      case NotificationPriority.urgent:
        return Colors.red;
      case NotificationPriority.high:
        return Colors.orange;
      case NotificationPriority.medium:
        return Colors.blue;
      case NotificationPriority.low:
      default:
        return Colors.grey;
    }
  }

  String _getPriorityText(NotificationPriority priority, AppLocalizations? l10n) {
    switch (priority) {
      case NotificationPriority.urgent:
        return l10n?.translate('urgent') ?? 'Urgent';
      case NotificationPriority.high:
        return l10n?.translate('high') ?? 'High';
      case NotificationPriority.medium:
        return l10n?.translate('medium') ?? 'Medium';
      case NotificationPriority.low:
      default:
        return l10n?.translate('low') ?? 'Low';
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final typeColor = _getTypeColor(notification.type);
    final priorityColor = _getPriorityColor(notification.priority);
    
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      elevation: notification.isRead ? 1 : 3,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: notification.isRead
            ? BorderSide.none
            : BorderSide(color: typeColor.withOpacity(0.3), width: 1),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Icon
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: typeColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _getTypeIcon(notification.type),
                      color: typeColor,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  
                  // Content
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Title Row
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                notification.title,
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: notification.isRead ? FontWeight.w500 : FontWeight.bold,
                                  color: notification.isRead ? Colors.grey[700] : null,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            // Unread indicator
                            if (!notification.isRead)
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: typeColor,
                                  shape: BoxShape.circle,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        
                        // Message
                        Text(
                          notification.message,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: notification.isRead ? Colors.grey[600] : Colors.grey[800],
                          ),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              
              // Footer Row
              Row(
                children: [
                  // Priority Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: priorityColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _getPriorityText(notification.priority, l10n),
                      style: TextStyle(
                        color: priorityColor,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  
                  // Time
                  Icon(
                    Icons.access_time,
                    size: 14,
                    color: Colors.grey[500],
                  ),
                  const SizedBox(width: 4),
                  Text(
                    notification.getRelativeTime(),
                    style: TextStyle(
                      color: Colors.grey[500],
                      fontSize: 12,
                    ),
                  ),
                  
                  const Spacer(),
                  
                  // Action Buttons
                  if (showActions) ...[
                    // Mark as read/unread button
                    IconButton(
                      icon: Icon(
                        notification.isRead ? Icons.mark_email_unread : Icons.mark_email_read,
                        size: 18,
                      ),
                      onPressed: onTap,
                      tooltip: notification.isRead 
                          ? l10n?.translate('mark_unread') ?? 'Mark as unread'
                          : l10n?.translate('mark_read') ?? 'Mark as read',
                      padding: const EdgeInsets.all(4),
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                    ),
                    
                    // Delete button
                    if (onDelete != null)
                      IconButton(
                        icon: const Icon(Icons.delete_outline, size: 18),
                        onPressed: () => _showDeleteConfirmation(context, l10n),
                        tooltip: l10n?.translate('delete') ?? 'Delete',
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDeleteConfirmation(BuildContext context, AppLocalizations? l10n) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n?.translate('delete_notification') ?? 'Delete Notification'),
        content: Text(l10n?.translate('delete_notification_confirm') ?? 'Are you sure you want to delete this notification?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n?.translate('cancel') ?? 'Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              onDelete?.call();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: Text(l10n?.translate('delete') ?? 'Delete'),
          ),
        ],
      ),
    );
  }
}