import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/l10n/app_localizations.dart';

class GuestQRCard extends StatelessWidget {
  final Map<String, dynamic> qrData;
  final VoidCallback onShare;
  final VoidCallback onDelete;

  const GuestQRCard({
    super.key,
    required this.qrData,
    required this.onShare,
    required this.onDelete,
  });

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return Colors.green;
      case 'scheduled':
        return Colors.blue;
      case 'expired':
        return Colors.grey;
      case 'used':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status, AppLocalizations? l10n) {
    switch (status.toLowerCase()) {
      case 'active':
        return l10n?.translate('active') ?? 'Active';
      case 'scheduled':
        return l10n?.translate('scheduled') ?? 'Scheduled';
      case 'expired':
        return l10n?.translate('expired') ?? 'Expired';
      case 'used':
        return l10n?.translate('used') ?? 'Used';
      default:
        return status;
    }
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day}/${dateTime.month} at ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
  }

  String _getTimeRemaining(DateTime validUntil) {
    final now = DateTime.now();
    final difference = validUntil.difference(now);
    
    if (difference.isNegative) {
      return 'Expired';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m left';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h left';
    } else {
      return '${difference.inDays}d left';
    }
  }

  void _showQRCodeDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                AppLocalizations.of(context)?.translate('guest_qr_code') ?? 'Guest QR Code',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 24),
              
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: QrImageView(
                  data: qrData['qr_data'] ?? '',
                  version: QrVersions.auto,
                  size: 250.0,
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black,
                  errorCorrectionLevel: QrErrorCorrectLevel.M,
                ),
              ),
              
              const SizedBox(height: 24),
              
              Text(
                qrData['guest_name'] ?? '',
                style: Theme.of(context).textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              Text(
                qrData['purpose'] ?? '',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 24),
              
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: Text(AppLocalizations.of(context)?.translate('close') ?? 'Close'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        onShare();
                      },
                      icon: const Icon(Icons.share),
                      label: Text(AppLocalizations.of(context)?.translate('share') ?? 'Share'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final statusColor = _getStatusColor(qrData['status']);
    final validFrom = qrData['valid_from'] as DateTime;
    final validUntil = qrData['valid_until'] as DateTime;
    final isActive = qrData['status'] == 'active';
    final timeRemaining = _getTimeRemaining(validUntil);
    
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: isActive ? 4 : 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: isActive 
            ? BorderSide(color: statusColor.withOpacity(0.3), width: 2)
            : BorderSide.none,
      ),
      child: InkWell(
        onTap: () => _showQRCodeDialog(context),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row
              Row(
                children: [
                  // QR Code Preview
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: QrImageView(
                      data: qrData['qr_data'] ?? '',
                      version: QrVersions.auto,
                      size: 60.0,
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.black,
                    ),
                  ),
                  const SizedBox(width: 16),
                  
                  // Guest Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          qrData['guest_name'] ?? '',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          qrData['guest_phone'] ?? '',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          qrData['purpose'] ?? '',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontStyle: FontStyle.italic,
                            color: Colors.grey[700],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  
                  // Status Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _getStatusText(qrData['status'], l10n),
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Time Info
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Icon(Icons.access_time, size: 16, color: Colors.grey[600]),
                        const SizedBox(width: 8),
                        Text(
                          '${l10n?.translate('valid_from') ?? 'Valid from'}: ${_formatDateTime(validFrom)}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.schedule, size: 16, color: Colors.grey[600]),
                        const SizedBox(width: 8),
                        Text(
                          '${l10n?.translate('valid_until') ?? 'Valid until'}: ${_formatDateTime(validUntil)}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isActive ? Colors.orange.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            timeRemaining,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: isActive ? Colors.orange : Colors.grey,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 12),
              
              // Usage Info
              Row(
                children: [
                  Icon(Icons.confirmation_number, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 8),
                  Text(
                    '${l10n?.translate('uses') ?? 'Uses'}: ${qrData['used_count']}/${qrData['max_uses']}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                  const Spacer(),
                  
                  // Action Buttons
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.share, size: 20),
                        onPressed: onShare,
                        tooltip: l10n?.translate('share') ?? 'Share',
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, size: 20),
                        onPressed: onDelete,
                        tooltip: l10n?.translate('delete') ?? 'Delete',
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}