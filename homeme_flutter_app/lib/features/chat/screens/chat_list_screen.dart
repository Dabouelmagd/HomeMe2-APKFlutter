import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/app_localizations.dart';
import '../../../core/services/api_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/chat_models.dart';
import '../widgets/chat_list_tile.dart';
import 'chat_screen.dart';

class ChatListScreen extends ConsumerStatefulWidget {
  const ChatListScreen({super.key});

  @override
  ConsumerState<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends ConsumerState<ChatListScreen> 
    with TickerProviderStateMixin {
  late TabController _tabController;
  List<ChatRoom> _allChats = [];
  List<ChatRoom> _directChats = [];
  List<ChatRoom> _groupChats = [];
  List<ChatUser> _availableUsers = [];
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadChats();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadChats() async {
    try {
      // In real app, these would be separate API calls
      // final chats = await ApiService.getUserChats();
      // final users = await ApiService.getAvailableUsers();
      
      setState(() {
        _allChats = _getDummyChats();
        _availableUsers = _getDummyUsers();
        _directChats = _allChats.where((chat) => !chat.isGroup).toList();
        _groupChats = _allChats.where((chat) => chat.isGroup).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _allChats = _getDummyChats();
        _availableUsers = _getDummyUsers();
        _directChats = _allChats.where((chat) => !chat.isGroup).toList();
        _groupChats = _allChats.where((chat) => chat.isGroup).toList();
        _isLoading = false;
      });
    }
  }

  List<ChatRoom> _getDummyChats() {
    final currentUser = ref.read(authProvider).user;
    
    return [
      ChatRoom(
        id: '1',
        name: 'Building A Residents',
        description: 'Group chat for Building A residents',
        isGroup: true,
        participants: [
          ChatUser(id: 'user1', name: 'Ahmed Mohamed', unitNumber: 'A-101', isOnline: true),
          ChatUser(id: 'user2', name: 'Sarah Johnson', unitNumber: 'A-102', isOnline: false),
          ChatUser(id: 'user3', name: 'Omar Ali', unitNumber: 'A-103', isOnline: true),
          ChatUser(id: currentUser?.id ?? 'me', name: currentUser?.fullName ?? 'Me'),
        ],
        lastMessage: ChatMessage(
          id: 'msg1',
          senderId: 'user1',
          chatId: '1',
          content: 'The building entrance will be under maintenance tomorrow morning',
          type: MessageType.text,
          status: MessageStatus.read,
          timestamp: DateTime.now().subtract(const Duration(minutes: 15)),
        ),
        unreadCount: 2,
        lastActivity: DateTime.now().subtract(const Duration(minutes: 15)),
      ),
      ChatRoom(
        id: '2',
        name: 'Security Team',
        description: 'Direct communication with security',
        isGroup: false,
        participants: [
          ChatUser(id: 'security1', name: 'Mike Security', role: 'security', isOnline: true),
          ChatUser(id: currentUser?.id ?? 'me', name: currentUser?.fullName ?? 'Me'),
        ],
        lastMessage: ChatMessage(
          id: 'msg2',
          senderId: 'security1',
          chatId: '2',
          content: 'Your guest has been approved and directed to your unit',
          type: MessageType.text,
          status: MessageStatus.delivered,
          timestamp: DateTime.now().subtract(const Duration(hours: 1)),
        ),
        unreadCount: 0,
        lastActivity: DateTime.now().subtract(const Duration(hours: 1)),
      ),
      ChatRoom(
        id: '3',
        name: 'Community Events',
        description: 'Stay updated on community events and announcements',
        isGroup: true,
        participants: [
          ChatUser(id: 'admin1', name: 'Community Admin', role: 'admin', isOnline: false),
          ChatUser(id: 'user4', name: 'Lisa Brown', unitNumber: 'B-201', isOnline: true),
          ChatUser(id: 'user5', name: 'David Wilson', unitNumber: 'C-301', isOnline: false),
          ChatUser(id: currentUser?.id ?? 'me', name: currentUser?.fullName ?? 'Me'),
        ],
        lastMessage: ChatMessage(
          id: 'msg3',
          senderId: 'admin1',
          chatId: '3',
          content: 'Don\'t forget about the community BBQ this weekend! 🍖',
          type: MessageType.text,
          status: MessageStatus.read,
          timestamp: DateTime.now().subtract(const Duration(days: 1)),
        ),
        unreadCount: 1,
        lastActivity: DateTime.now().subtract(const Duration(days: 1)),
      ),
      ChatRoom(
        id: '4',
        name: 'Maintenance Team',
        description: 'Direct line to maintenance staff',
        isGroup: false,
        participants: [
          ChatUser(id: 'maintenance1', name: 'John Technician', role: 'maintenance', isOnline: false, lastSeen: DateTime.now().subtract(const Duration(hours: 2))),
          ChatUser(id: currentUser?.id ?? 'me', name: currentUser?.fullName ?? 'Me'),
        ],
        lastMessage: ChatMessage(
          id: 'msg4',
          senderId: currentUser?.id ?? 'me',
          chatId: '4',
          content: 'Thank you for fixing the AC so quickly!',
          type: MessageType.text,
          status: MessageStatus.sent,
          timestamp: DateTime.now().subtract(const Duration(days: 2)),
        ),
        unreadCount: 0,
        lastActivity: DateTime.now().subtract(const Duration(days: 2)),
      ),
    ];
  }

  List<ChatUser> _getDummyUsers() {
    return [
      const ChatUser(id: 'user6', name: 'Emma Watson', unitNumber: 'A-104', isOnline: true),
      const ChatUser(id: 'user7', name: 'James Bond', unitNumber: 'B-205', isOnline: false),
      const ChatUser(id: 'user8', name: 'Alice Cooper', unitNumber: 'C-302', isOnline: true),
      const ChatUser(id: 'admin2', name: 'Property Manager', role: 'admin', isOnline: true),
    ];
  }

  List<ChatRoom> _getFilteredChats(List<ChatRoom> chats) {
    if (_searchQuery.isEmpty) {
      return chats;
    }
    
    return chats.where((chat) {
      final currentUserId = ref.read(authProvider).user?.id ?? '';
      final displayName = chat.getDisplayName(currentUserId).toLowerCase();
      final lastMessageContent = chat.lastMessage?.content.toLowerCase() ?? '';
      
      return displayName.contains(_searchQuery.toLowerCase()) ||
             lastMessageContent.contains(_searchQuery.toLowerCase());
    }).toList();
  }

  void _openChat(ChatRoom chatRoom) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ChatScreen(chatRoom: chatRoom),
      ),
    );
  }

  void _startNewChat() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _NewChatBottomSheet(
        availableUsers: _availableUsers,
        onUserSelected: (user) {
          Navigator.pop(context);
          _createDirectChat(user);
        },
        onCreateGroup: () {
          Navigator.pop(context);
          _showCreateGroupDialog();
        },
      ),
    );
  }

  void _createDirectChat(ChatUser user) {
    final currentUser = ref.read(authProvider).user;
    
    // Check if chat already exists
    final existingChat = _directChats.where((chat) {
      return chat.participants.any((p) => p.id == user.id);
    }).firstOrNull;
    
    if (existingChat != null) {
      _openChat(existingChat);
      return;
    }
    
    // Create new chat room
    final newChatRoom = ChatRoom(
      id: 'new_${DateTime.now().millisecondsSinceEpoch}',
      name: user.name,
      participants: [
        user,
        ChatUser(id: currentUser?.id ?? 'me', name: currentUser?.fullName ?? 'Me'),
      ],
      isGroup: false,
      lastActivity: DateTime.now(),
    );
    
    _openChat(newChatRoom);
  }

  void _showCreateGroupDialog() {
    showDialog(
      context: context,
      builder: (context) => _CreateGroupDialog(
        availableUsers: _availableUsers,
        onGroupCreated: (groupName, selectedUsers) {
          final currentUser = ref.read(authProvider).user;
          
          final newGroupChat = ChatRoom(
            id: 'group_${DateTime.now().millisecondsSinceEpoch}',
            name: groupName,
            isGroup: true,
            participants: [
              ...selectedUsers,
              ChatUser(id: currentUser?.id ?? 'me', name: currentUser?.fullName ?? 'Me'),
            ],
            lastActivity: DateTime.now(),
          );
          
          _openChat(newGroupChat);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n?.translate('chats') ?? 'Chats'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              showSearch(
                context: context,
                delegate: _ChatSearchDelegate(_allChats, ref),
              );
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              icon: Badge(
                isLabelVisible: _directChats.any((chat) => chat.unreadCount > 0),
                label: Text('${_directChats.fold(0, (sum, chat) => sum + chat.unreadCount)}'),
                child: const Icon(Icons.person),
              ),
              text: l10n?.translate('direct') ?? 'Direct',
            ),
            Tab(
              icon: Badge(
                isLabelVisible: _groupChats.any((chat) => chat.unreadCount > 0),
                label: Text('${_groupChats.fold(0, (sum, chat) => sum + chat.unreadCount)}'),
                child: const Icon(Icons.group),
              ),
              text: l10n?.translate('groups') ?? 'Groups',
            ),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildChatList(_getFilteredChats(_directChats)),
                _buildChatList(_getFilteredChats(_groupChats)),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _startNewChat,
        child: const Icon(Icons.chat),
      ),
    );
  }

  Widget _buildChatList(List<ChatRoom> chats) {
    if (chats.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.chat_bubble_outline,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              AppLocalizations.of(context)?.translate('no_chats') ?? 'No chats yet',
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              AppLocalizations.of(context)?.translate('start_conversation') ?? 'Start a conversation',
              style: TextStyle(
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadChats,
      child: ListView.builder(
        itemCount: chats.length,
        itemBuilder: (context, index) {
          final chatRoom = chats[index];
          return ChatListTile(
            chatRoom: chatRoom,
            currentUserId: ref.read(authProvider).user?.id ?? '',
            onTap: () => _openChat(chatRoom),
          );
        },
      ),
    );
  }
}

class _ChatSearchDelegate extends SearchDelegate<ChatRoom?> {
  final List<ChatRoom> chats;
  final WidgetRef ref;

  _ChatSearchDelegate(this.chats, this.ref);

  @override
  List<Widget> buildActions(BuildContext context) {
    return [
      IconButton(
        icon: const Icon(Icons.clear),
        onPressed: () => query = '',
      ),
    ];
  }

  @override
  Widget buildLeading(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.arrow_back),
      onPressed: () => close(context, null),
    );
  }

  @override
  Widget buildResults(BuildContext context) {
    return _buildSearchResults();
  }

  @override
  Widget buildSuggestions(BuildContext context) {
    return _buildSearchResults();
  }

  Widget _buildSearchResults() {
    final currentUserId = ref.read(authProvider).user?.id ?? '';
    final filteredChats = chats.where((chat) {
      final displayName = chat.getDisplayName(currentUserId).toLowerCase();
      return displayName.contains(query.toLowerCase());
    }).toList();

    return ListView.builder(
      itemCount: filteredChats.length,
      itemBuilder: (context, index) {
        final chatRoom = filteredChats[index];
        return ChatListTile(
          chatRoom: chatRoom,
          currentUserId: currentUserId,
          onTap: () => close(context, chatRoom),
        );
      },
    );
  }
}

class _NewChatBottomSheet extends StatelessWidget {
  final List<ChatUser> availableUsers;
  final Function(ChatUser) onUserSelected;
  final VoidCallback onCreateGroup;

  const _NewChatBottomSheet({
    required this.availableUsers,
    required this.onUserSelected,
    required this.onCreateGroup,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                AppLocalizations.of(context)?.translate('new_chat') ?? 'New Chat',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Create Group option
          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.group_add, color: Colors.green),
            ),
            title: Text(AppLocalizations.of(context)?.translate('create_group') ?? 'Create Group'),
            subtitle: Text(AppLocalizations.of(context)?.translate('start_group_conversation') ?? 'Start a group conversation'),
            onTap: onCreateGroup,
          ),
          
          const Divider(),
          
          Text(
            AppLocalizations.of(context)?.translate('available_users') ?? 'Available Users',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          
          // Available users list
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: availableUsers.length,
              itemBuilder: (context, index) {
                final user = availableUsers[index];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: user.getRoleColor(),
                    child: Text(user.name[0].toUpperCase()),
                  ),
                  title: Text(user.getDisplayName()),
                  subtitle: Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: user.isOnline ? Colors.green : Colors.grey,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(user.isOnline ? 'Online' : 'Offline'),
                    ],
                  ),
                  trailing: Text(
                    user.role.toUpperCase(),
                    style: TextStyle(
                      color: user.getRoleColor(),
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  onTap: () => onUserSelected(user),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _CreateGroupDialog extends StatefulWidget {
  final List<ChatUser> availableUsers;
  final Function(String, List<ChatUser>) onGroupCreated;

  const _CreateGroupDialog({
    required this.availableUsers,
    required this.onGroupCreated,
  });

  @override
  State<_CreateGroupDialog> createState() => _CreateGroupDialogState();
}

class _CreateGroupDialogState extends State<_CreateGroupDialog> {
  final _groupNameController = TextEditingController();
  final List<ChatUser> _selectedUsers = [];

  @override
  void dispose() {
    _groupNameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    
    return AlertDialog(
      title: Text(l10n?.translate('create_group') ?? 'Create Group'),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _groupNameController,
              decoration: InputDecoration(
                labelText: l10n?.translate('group_name') ?? 'Group Name',
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            
            Text(
              l10n?.translate('select_participants') ?? 'Select Participants',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: widget.availableUsers.length,
                itemBuilder: (context, index) {
                  final user = widget.availableUsers[index];
                  final isSelected = _selectedUsers.contains(user);
                  
                  return CheckboxListTile(
                    value: isSelected,
                    onChanged: (selected) {
                      setState(() {
                        if (selected == true) {
                          _selectedUsers.add(user);
                        } else {
                          _selectedUsers.remove(user);
                        }
                      });
                    },
                    title: Text(user.getDisplayName()),
                    subtitle: Text(user.role.toUpperCase()),
                    secondary: CircleAvatar(
                      backgroundColor: user.getRoleColor(),
                      child: Text(user.name[0].toUpperCase()),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(l10n?.translate('cancel') ?? 'Cancel'),
        ),
        ElevatedButton(
          onPressed: _groupNameController.text.trim().isNotEmpty && _selectedUsers.isNotEmpty
              ? () {
                  Navigator.pop(context);
                  widget.onGroupCreated(_groupNameController.text.trim(), _selectedUsers);
                }
              : null,
          child: Text(l10n?.translate('create') ?? 'Create'),
        ),
      ],
    );
  }
}