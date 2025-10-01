enum NotificationType {
  maintenance,
  visitor,
  event,
  payment,
  system,
  general,
  security,
  announcement
}

enum NotificationPriority {
  low,
  medium,
  high,
  urgent
}

class NotificationModel {
  final String id;
  final String title;
  final String message;
  final NotificationType type;
  final NotificationPriority priority;
  final bool isRead;
  final DateTime timestamp;
  final String? actionUrl;
  final Map<String, dynamic>? metadata;
  final String? imageUrl;

  const NotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.priority,
    required this.isRead,
    required this.timestamp,
    this.actionUrl,
    this.metadata,
    this.imageUrl,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      type: _parseNotificationType(json['type']),
      priority: _parseNotificationPriority(json['priority']),
      isRead: json['is_read'] ?? false,
      timestamp: DateTime.tryParse(json['timestamp'] ?? '') ?? DateTime.now(),
      actionUrl: json['action_url'],
      metadata: json['metadata'],
      imageUrl: json['image_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'message': message,
      'type': type.toString().split('.').last,
      'priority': priority.toString().split('.').last,
      'is_read': isRead,
      'timestamp': timestamp.toIso8601String(),
      'action_url': actionUrl,
      'metadata': metadata,
      'image_url': imageUrl,
    };
  }

  NotificationModel copyWith({
    String? id,
    String? title,
    String? message,
    NotificationType? type,
    NotificationPriority? priority,
    bool? isRead,
    DateTime? timestamp,
    String? actionUrl,
    Map<String, dynamic>? metadata,
    String? imageUrl,
  }) {
    return NotificationModel(
      id: id ?? this.id,
      title: title ?? this.title,
      message: message ?? this.message,
      type: type ?? this.type,
      priority: priority ?? this.priority,
      isRead: isRead ?? this.isRead,
      timestamp: timestamp ?? this.timestamp,
      actionUrl: actionUrl ?? this.actionUrl,
      metadata: metadata ?? this.metadata,
      imageUrl: imageUrl ?? this.imageUrl,
    );
  }

  static NotificationType _parseNotificationType(String? type) {
    switch (type?.toLowerCase()) {
      case 'maintenance':
        return NotificationType.maintenance;
      case 'visitor':
        return NotificationType.visitor;
      case 'event':
        return NotificationType.event;
      case 'payment':
        return NotificationType.payment;
      case 'system':
        return NotificationType.system;
      case 'security':
        return NotificationType.security;
      case 'announcement':
        return NotificationType.announcement;
      default:
        return NotificationType.general;
    }
  }

  static NotificationPriority _parseNotificationPriority(String? priority) {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return NotificationPriority.urgent;
      case 'high':
        return NotificationPriority.high;
      case 'medium':
        return NotificationPriority.medium;
      default:
        return NotificationPriority.low;
    }
  }

  String getRelativeTime() {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${timestamp.day}/${timestamp.month}/${timestamp.year}';
    }
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is NotificationModel && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'NotificationModel{id: $id, title: $title, type: $type, priority: $priority, isRead: $isRead}';
  }
}