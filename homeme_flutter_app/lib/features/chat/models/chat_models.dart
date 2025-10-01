import 'package:flutter/material.dart';

enum MessageType {
  text,
  image,
  file,
  audio,
  location,
  system
}

enum MessageStatus {
  sending,
  sent,
  delivered,
  read,
  failed
}

class ChatUser {
  final String id;
  final String name;
  final String? avatarUrl;
  final String? unitNumber;
  final bool isOnline;
  final DateTime? lastSeen;
  final String role; // admin, resident, security

  const ChatUser({
    required this.id,
    required this.name,
    this.avatarUrl,
    this.unitNumber,
    this.isOnline = false,
    this.lastSeen,
    this.role = 'resident',
  });

  factory ChatUser.fromJson(Map<String, dynamic> json) {
    return ChatUser(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      avatarUrl: json['avatar_url'],
      unitNumber: json['unit_number'],
      isOnline: json['is_online'] ?? false,
      lastSeen: json['last_seen'] != null ? DateTime.tryParse(json['last_seen']) : null,
      role: json['role'] ?? 'resident',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'avatar_url': avatarUrl,
      'unit_number': unitNumber,
      'is_online': isOnline,
      'last_seen': lastSeen?.toIso8601String(),
      'role': role,
    };
  }

  String getDisplayName() {
    if (unitNumber != null) {
      return '$name (Unit $unitNumber)';
    }
    return name;
  }

  Color getRoleColor() {
    switch (role) {
      case 'admin':
        return Colors.red;
      case 'security':
        return Colors.orange;
      default:
        return Colors.blue;
    }
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ChatUser && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}

class ChatMessage {
  final String id;
  final String senderId;
  final String chatId;
  final String content;
  final MessageType type;
  final MessageStatus status;
  final DateTime timestamp;
  final String? replyToMessageId;
  final Map<String, dynamic>? metadata;
  final List<String>? attachments;

  const ChatMessage({
    required this.id,
    required this.senderId,
    required this.chatId,
    required this.content,
    required this.type,
    required this.status,
    required this.timestamp,
    this.replyToMessageId,
    this.metadata,
    this.attachments,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] ?? '',
      senderId: json['sender_id'] ?? '',
      chatId: json['chat_id'] ?? '',
      content: json['content'] ?? '',
      type: _parseMessageType(json['type']),
      status: _parseMessageStatus(json['status']),
      timestamp: DateTime.tryParse(json['timestamp'] ?? '') ?? DateTime.now(),
      replyToMessageId: json['reply_to_message_id'],
      metadata: json['metadata'],
      attachments: json['attachments'] != null ? List<String>.from(json['attachments']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sender_id': senderId,
      'chat_id': chatId,
      'content': content,
      'type': type.toString().split('.').last,
      'status': status.toString().split('.').last,
      'timestamp': timestamp.toIso8601String(),
      'reply_to_message_id': replyToMessageId,
      'metadata': metadata,
      'attachments': attachments,
    };
  }

  static MessageType _parseMessageType(String? type) {
    switch (type?.toLowerCase()) {
      case 'image':
        return MessageType.image;
      case 'file':
        return MessageType.file;
      case 'audio':
        return MessageType.audio;
      case 'location':
        return MessageType.location;
      case 'system':
        return MessageType.system;
      default:
        return MessageType.text;
    }
  }

  static MessageStatus _parseMessageStatus(String? status) {
    switch (status?.toLowerCase()) {
      case 'sent':
        return MessageStatus.sent;
      case 'delivered':
        return MessageStatus.delivered;
      case 'read':
        return MessageStatus.read;
      case 'failed':
        return MessageStatus.failed;
      default:
        return MessageStatus.sending;
    }
  }

  String getRelativeTime() {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else {
      return '${timestamp.day}/${timestamp.month}';
    }
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ChatMessage && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}

class ChatRoom {
  final String id;
  final String name;
  final String? description;
  final List<ChatUser> participants;
  final ChatMessage? lastMessage;
  final int unreadCount;
  final DateTime? lastActivity;
  final bool isGroup;
  final String? avatarUrl;
  final Map<String, dynamic>? metadata;

  const ChatRoom({
    required this.id,
    required this.name,
    this.description,
    required this.participants,
    this.lastMessage,
    this.unreadCount = 0,
    this.lastActivity,
    this.isGroup = false,
    this.avatarUrl,
    this.metadata,
  });

  factory ChatRoom.fromJson(Map<String, dynamic> json) {
    return ChatRoom(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      participants: (json['participants'] as List?)
              ?.map((p) => ChatUser.fromJson(p))
              .toList() ?? [],
      lastMessage: json['last_message'] != null 
          ? ChatMessage.fromJson(json['last_message']) 
          : null,
      unreadCount: json['unread_count'] ?? 0,
      lastActivity: json['last_activity'] != null 
          ? DateTime.tryParse(json['last_activity']) 
          : null,
      isGroup: json['is_group'] ?? false,
      avatarUrl: json['avatar_url'],
      metadata: json['metadata'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'participants': participants.map((p) => p.toJson()).toList(),
      'last_message': lastMessage?.toJson(),
      'unread_count': unreadCount,
      'last_activity': lastActivity?.toIso8601String(),
      'is_group': isGroup,
      'avatar_url': avatarUrl,
      'metadata': metadata,
    };
  }

  String getDisplayName(String currentUserId) {
    if (isGroup) {
      return name;
    }
    
    // For direct chats, show the other participant's name
    final otherParticipant = participants.firstWhere(
      (p) => p.id != currentUserId,
      orElse: () => participants.first,
    );
    return otherParticipant.getDisplayName();
  }

  String? getDisplayAvatar(String currentUserId) {
    if (isGroup) {
      return avatarUrl;
    }
    
    // For direct chats, show the other participant's avatar
    final otherParticipant = participants.firstWhere(
      (p) => p.id != currentUserId,
      orElse: () => participants.first,
    );
    return otherParticipant.avatarUrl;
  }

  bool getOnlineStatus(String currentUserId) {
    if (isGroup) {
      return participants.any((p) => p.id != currentUserId && p.isOnline);
    }
    
    // For direct chats, show the other participant's online status
    final otherParticipant = participants.firstWhere(
      (p) => p.id != currentUserId,
      orElse: () => participants.first,
    );
    return otherParticipant.isOnline;
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ChatRoom && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}