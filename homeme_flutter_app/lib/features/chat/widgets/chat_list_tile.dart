import 'package:flutter/material.dart';
import '../models/chat_models.dart';

class ChatListTile extends StatelessWidget {
  final ChatRoom chatRoom;
  final String currentUserId;
  final VoidCallback onTap;

  const ChatListTile({
    super.key,
    required this.chatRoom,
    required this.currentUserId,
    required this.onTap,
  });

  Widget _buildAvatar() {
    final avatarUrl = chatRoom.getDisplayAvatar(currentUserId);
    
    if (chatRoom.isGroup) {
      return CircleAvatar(
        backgroundColor: Colors.blue,
        backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
        child: avatarUrl == null
            ? const Icon(Icons.group, color: Colors.white)
            : null,
      );
    } else {
      final otherParticipant = chatRoom.participants.firstWhere(
        (p) => p.id != currentUserId,
        orElse: () => chatRoom.participants.first,
      );
      
      return Stack(
        children: [
          CircleAvatar(
            backgroundColor: otherParticipant.getRoleColor(),
            backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
            child: avatarUrl == null
                ? Text(
                    otherParticipant.name[0].toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  )
                : null,
          ),
          // Online status indicator
          if (otherParticipant.isOnline)
            Positioned(
              bottom: 0,
              right: 0,
              child: Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  color: Colors.green,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
              ),
            ),
        ],
      );
    }
  }

  String _getMessagePreview() {
    if (chatRoom.lastMessage == null) {
      return 'No messages yet';
    }

    final message = chatRoom.lastMessage!;
    String prefix = '';

    // Add sender name for group chats
    if (chatRoom.isGroup && message.senderId != currentUserId) {
      final sender = chatRoom.participants.firstWhere(
        (p) => p.id == message.senderId,
        orElse: () => ChatUser(id: message.senderId, name: 'Unknown'),
      );
      prefix = '${sender.name}: ';
    } else if (message.senderId == currentUserId) {
      prefix = 'You: ';
    }

    // Handle different message types
    switch (message.type) {
      case MessageType.image:
        return '${prefix}📷 Photo';
      case MessageType.file:
        return '${prefix}📎 File';
      case MessageType.audio:
        return '${prefix}🎵 Audio';
      case MessageType.location:
        return '${prefix}📍 Location';
      case MessageType.system:
        return message.content;
      case MessageType.text:
      default:
        return prefix + message.content;
    }
  }

  Widget _getMessageStatusIcon() {
    final message = chatRoom.lastMessage;
    if (message == null || message.senderId != currentUserId) {
      return const SizedBox.shrink();
    }

    switch (message.status) {
      case MessageStatus.sending:
        return const SizedBox(
          width: 12,
          height: 12,
          child: CircularProgressIndicator(strokeWidth: 1),
        );
      case MessageStatus.sent:
        return const Icon(Icons.check, size: 16, color: Colors.grey);
      case MessageStatus.delivered:
        return const Icon(Icons.done_all, size: 16, color: Colors.grey);
      case MessageStatus.read:
        return const Icon(Icons.done_all, size: 16, color: Colors.blue);
      case MessageStatus.failed:
        return const Icon(Icons.error_outline, size: 16, color: Colors.red);
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayName = chatRoom.getDisplayName(currentUserId);
    final messagePreview = _getMessagePreview();
    final lastMessageTime = chatRoom.lastMessage?.getRelativeTime() ?? '';
    final hasUnread = chatRoom.unreadCount > 0;

    return ListTile(
      onTap: onTap,
      leading: _buildAvatar(),
      title: Row(
        children: [
          Expanded(
            child: Text(
              displayName,
              style: TextStyle(
                fontWeight: hasUnread ? FontWeight.bold : FontWeight.normal,
                fontSize: 16,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (chatRoom.isGroup)
            Container(
              margin: const EdgeInsets.only(left: 4),
              child: const Icon(Icons.group, size: 14, color: Colors.grey),
            ),
        ],
      ),
      subtitle: Row(
        children: [
          Expanded(
            child: Text(
              messagePreview,
              style: TextStyle(
                color: hasUnread ? Colors.black87 : Colors.grey[600],
                fontWeight: hasUnread ? FontWeight.w500 : FontWeight.normal,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 4),
          _getMessageStatusIcon(),
        ],
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            lastMessageTime,
            style: TextStyle(
              color: hasUnread ? Theme.of(context).primaryColor : Colors.grey[500],
              fontSize: 12,
              fontWeight: hasUnread ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
          if (hasUnread) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor,
                borderRadius: BorderRadius.circular(10),
              ),
              constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
              child: Text(
                chatRoom.unreadCount > 99 ? '99+' : '${chatRoom.unreadCount}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ],
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    );
  }
}