import 'package:flutter/material.dart';

class RecentActivityWidget extends StatelessWidget {
  final List<dynamic> activities;

  const RecentActivityWidget({
    super.key,
    required this.activities,
  });

  IconData _getIconFromString(String iconName) {
    switch (iconName) {
      case 'person_add':
        return Icons.person_add;
      case 'build':
        return Icons.build;
      case 'how_to_reg':
        return Icons.how_to_reg;
      case 'event':
        return Icons.event;
      case 'payment':
        return Icons.payment;
      case 'message':
        return Icons.message;
      default:
        return Icons.info;
    }
  }

  Color _getColorFromType(String type) {
    switch (type) {
      case 'new_resident':
        return Colors.green;
      case 'maintenance':
        return Colors.orange;
      case 'visitor':
        return Colors.blue;
      case 'event':
        return Colors.purple;
      case 'payment':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (activities.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Icon(
                Icons.inbox,
                size: 48,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 16),
              Text(
                'No recent activity',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Column(
        children: activities.map<Widget>((activity) {
          final iconName = activity['icon'] ?? 'info';
          final type = activity['type'] ?? '';
          final message = activity['message'] ?? '';
          final time = activity['time'] ?? '';
          
          return ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _getColorFromType(type).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                _getIconFromString(iconName),
                color: _getColorFromType(type),
                size: 20,
              ),
            ),
            title: Text(
              message,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
            subtitle: Text(
              time,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 4,
            ),
          );
        }).toList(),
      ),
    );
  }
}