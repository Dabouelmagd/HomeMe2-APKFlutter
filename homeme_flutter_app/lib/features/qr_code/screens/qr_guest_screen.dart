import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:qr_code_scanner/qr_code_scanner.dart';

import '../../../core/l10n/app_localizations.dart';
import '../../../core/services/api_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../widgets/guest_qr_card.dart';

class QRGuestScreen extends ConsumerStatefulWidget {
  const QRGuestScreen({super.key});

  @override
  ConsumerState<QRGuestScreen> createState() => _QRGuestScreenState();
}

class _QRGuestScreenState extends ConsumerState<QRGuestScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  List<Map<String, dynamic>> _guestQRCodes = [];
  bool _isLoading = true;
  QRViewController? qrController;
  final GlobalKey qrKey = GlobalKey(debugLabel: 'QR');
  bool _isScanning = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadGuestQRCodes();
  }

  @override
  void dispose() {
    qrController?.dispose();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadGuestQRCodes() async {
    try {
      // In real app: final codes = await ApiService.getGuestQRCodes();
      setState(() {
        _guestQRCodes = _getDummyQRCodes();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _guestQRCodes = _getDummyQRCodes();
        _isLoading = false;
      });
    }
  }

  List<Map<String, dynamic>> _getDummyQRCodes() {
    final user = ref.read(authProvider).user;
    
    return [
      {
        'id': '1',
        'guest_name': 'Ahmed Mohamed',
        'guest_phone': '+971 50 123 4567',
        'purpose': 'Family Visit',
        'valid_from': DateTime.now(),
        'valid_until': DateTime.now().add(const Duration(hours: 4)),
        'qr_data': 'GUEST_ACCESS|1|${user?.id}|${DateTime.now().millisecondsSinceEpoch}',
        'status': 'active',
        'used_count': 0,
        'max_uses': 1,
      },
      {
        'id': '2',
        'guest_name': 'Sarah Johnson',
        'guest_phone': '+971 55 987 6543',
        'purpose': 'Business Meeting',
        'valid_from': DateTime.now().add(const Duration(hours: 2)),
        'valid_until': DateTime.now().add(const Duration(hours: 6)),
        'qr_data': 'GUEST_ACCESS|2|${user?.id}|${DateTime.now().add(const Duration(hours: 2)).millisecondsSinceEpoch}',
        'status': 'scheduled',
        'used_count': 0,
        'max_uses': 2,
      },
      {
        'id': '3',
        'guest_name': 'Omar Ali',
        'guest_phone': '+971 52 456 7890',
        'purpose': 'Delivery',
        'valid_from': DateTime.now().subtract(const Duration(hours: 2)),
        'valid_until': DateTime.now().subtract(const Duration(minutes: 30)),
        'qr_data': 'GUEST_ACCESS|3|${user?.id}|${DateTime.now().subtract(const Duration(hours: 2)).millisecondsSinceEpoch}',
        'status': 'expired',
        'used_count': 1,
        'max_uses': 1,
      },
    ];
  }

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

  Future<void> _generateQRCode() async {
    showDialog(
      context: context,
      builder: (context) => _GenerateQRDialog(
        onQRGenerated: (qrData) {
          setState(() {
            _guestQRCodes.insert(0, qrData);
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(AppLocalizations.of(context)?.translate('qr_generated') ?? 'QR code generated successfully'),
              backgroundColor: Colors.green,
            ),
          );
        },
      ),
    );
  }

  void _onQRViewCreated(QRViewController controller) {
    qrController = controller;
    controller.scannedDataStream.listen((scanData) {
      if (!_isScanning) return;
      
      setState(() {
        _isScanning = false;
      });
      
      _handleScannedQR(scanData.code);
    });
  }

  void _handleScannedQR(String? qrCode) {
    if (qrCode == null) return;
    
    try {
      // Parse QR code: GUEST_ACCESS|guestId|hostId|timestamp
      final parts = qrCode.split('|');
      if (parts.length >= 4 && parts[0] == 'GUEST_ACCESS') {
        _processGuestAccess(parts[1], parts[2], parts[3]);
      } else {
        _showInvalidQRDialog();
      }
    } catch (e) {
      _showInvalidQRDialog();
    }
  }

  void _processGuestAccess(String guestId, String hostId, String timestamp) {
    // In real app, call API to verify and process guest access
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(AppLocalizations.of(context)?.translate('guest_access') ?? 'Guest Access'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Guest ID: $guestId'),
            Text('Host ID: $hostId'),
            Text('Timestamp: ${DateTime.fromMillisecondsSinceEpoch(int.parse(timestamp))}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(AppLocalizations.of(context)?.translate('cancel') ?? 'Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(AppLocalizations.of(context)?.translate('access_granted') ?? 'Access granted successfully'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            child: Text(AppLocalizations.of(context)?.translate('grant_access') ?? 'Grant Access'),
          ),
        ],
      ),
    );
  }

  void _showInvalidQRDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(AppLocalizations.of(context)?.translate('invalid_qr') ?? 'Invalid QR Code'),
        content: Text(AppLocalizations.of(context)?.translate('invalid_qr_message') ?? 'This QR code is not valid for guest access.'),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: Text(AppLocalizations.of(context)?.translate('ok') ?? 'OK'),
          ),
        ],
      ),
    );
  }

  void _shareQRCode(Map<String, dynamic> qrData) {
    // In real app, implement sharing functionality
    Clipboard.setData(ClipboardData(text: qrData['qr_data']));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(AppLocalizations.of(context)?.translate('qr_copied') ?? 'QR code copied to clipboard'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n?.translate('guest_qr_codes') ?? 'Guest QR Codes'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              icon: const Icon(Icons.qr_code),
              text: l10n?.translate('my_codes') ?? 'My Codes',
            ),
            Tab(
              icon: const Icon(Icons.qr_code_scanner),
              text: l10n?.translate('scan') ?? 'Scan',
            ),
            Tab(
              icon: const Icon(Icons.history),
              text: l10n?.translate('history') ?? 'History',
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // My QR Codes Tab
          _buildMyCodesTab(),
          
          // QR Scanner Tab
          _buildScannerTab(),
          
          // History Tab
          _buildHistoryTab(),
        ],
      ),
      floatingActionButton: _tabController.index == 0
          ? FloatingActionButton.extended(
              onPressed: _generateQRCode,
              icon: const Icon(Icons.add),
              label: Text(l10n?.translate('generate_qr') ?? 'Generate QR'),
            )
          : null,
    );
  }

  Widget _buildMyCodesTab() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final activeCodes = _guestQRCodes.where((code) => 
        code['status'] == 'active' || code['status'] == 'scheduled').toList();

    if (activeCodes.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.qr_code,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              AppLocalizations.of(context)?.translate('no_qr_codes') ?? 'No QR codes yet',
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              AppLocalizations.of(context)?.translate('generate_first_qr') ?? 'Generate your first QR code',
              style: TextStyle(
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadGuestQRCodes,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: activeCodes.length,
        itemBuilder: (context, index) {
          final qrData = activeCodes[index];
          return GuestQRCard(
            qrData: qrData,
            onShare: () => _shareQRCode(qrData),
            onDelete: () => _deleteQRCode(qrData['id']),
          );
        },
      ),
    );
  }

  Widget _buildScannerTab() {
    return Column(
      children: [
        Expanded(
          flex: 4,
          child: QRView(
            key: qrKey,
            onQRViewCreated: _onQRViewCreated,
            overlay: QrScannerOverlayShape(
              borderColor: Colors.blue,
              borderRadius: 10,
              borderLength: 30,
              borderWidth: 10,
              cutOutSize: 250,
            ),
          ),
        ),
        Expanded(
          flex: 1,
          child: Container(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Text(
                  AppLocalizations.of(context)?.translate('scan_guest_qr') ?? 'Scan Guest QR Code',
                  style: Theme.of(context).textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  AppLocalizations.of(context)?.translate('scan_instruction') ?? 'Point your camera at the QR code to scan',
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.flash_on),
                      onPressed: () => qrController?.toggleFlash(),
                      tooltip: AppLocalizations.of(context)?.translate('toggle_flash') ?? 'Toggle Flash',
                    ),
                    ElevatedButton(
                      onPressed: () {
                        setState(() {
                          _isScanning = !_isScanning;
                        });
                      },
                      child: Text(_isScanning 
                          ? AppLocalizations.of(context)?.translate('stop_scanning') ?? 'Stop Scanning'
                          : AppLocalizations.of(context)?.translate('start_scanning') ?? 'Start Scanning'),
                    ),
                    IconButton(
                      icon: const Icon(Icons.flip_camera_ios),
                      onPressed: () => qrController?.flipCamera(),
                      tooltip: AppLocalizations.of(context)?.translate('flip_camera') ?? 'Flip Camera',
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildHistoryTab() {
    final expiredCodes = _guestQRCodes.where((code) => 
        code['status'] == 'expired' || code['status'] == 'used').toList();

    if (expiredCodes.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.history,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              AppLocalizations.of(context)?.translate('no_history') ?? 'No history yet',
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
      padding: const EdgeInsets.all(16),
      itemCount: expiredCodes.length,
      itemBuilder: (context, index) {
        final qrData = expiredCodes[index];
        return Card(
          child: ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _getStatusColor(qrData['status']).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.qr_code,
                color: _getStatusColor(qrData['status']),
              ),
            ),
            title: Text(qrData['guest_name']),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(qrData['purpose']),
                Text('${AppLocalizations.of(context)?.translate('used') ?? 'Used'}: ${qrData['used_count']}/${qrData['max_uses']}'),
              ],
            ),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _getStatusColor(qrData['status']).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _getStatusText(qrData['status'], AppLocalizations.of(context)),
                style: TextStyle(
                  color: _getStatusColor(qrData['status']),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  void _deleteQRCode(String id) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(AppLocalizations.of(context)?.translate('delete_qr') ?? 'Delete QR Code'),
        content: Text(AppLocalizations.of(context)?.translate('delete_qr_confirm') ?? 'Are you sure you want to delete this QR code?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(AppLocalizations.of(context)?.translate('cancel') ?? 'Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              setState(() {
                _guestQRCodes.removeWhere((code) => code['id'] == id);
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(AppLocalizations.of(context)?.translate('qr_deleted') ?? 'QR code deleted'),
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text(AppLocalizations.of(context)?.translate('delete') ?? 'Delete'),
          ),
        ],
      ),
    );
  }
}

class _GenerateQRDialog extends StatefulWidget {
  final Function(Map<String, dynamic>) onQRGenerated;

  const _GenerateQRDialog({required this.onQRGenerated});

  @override
  State<_GenerateQRDialog> createState() => _GenerateQRDialogState();
}

class _GenerateQRDialogState extends State<_GenerateQRDialog> {
  final _formKey = GlobalKey<FormState>();
  final _guestNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _purposeController = TextEditingController();
  
  DateTime _validFrom = DateTime.now();
  DateTime _validUntil = DateTime.now().add(const Duration(hours: 4));
  int _maxUses = 1;

  @override
  void dispose() {
    _guestNameController.dispose();
    _phoneController.dispose();
    _purposeController.dispose();
    super.dispose();
  }

  Future<void> _selectDateTime(bool isStart) async {
    final date = await showDatePicker(
      context: context,
      initialDate: isStart ? _validFrom : _validUntil,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 30)),
    );
    
    if (date != null) {
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(isStart ? _validFrom : _validUntil),
      );
      
      if (time != null) {
        final dateTime = DateTime(date.year, date.month, date.day, time.hour, time.minute);
        setState(() {
          if (isStart) {
            _validFrom = dateTime;
            if (_validUntil.isBefore(_validFrom)) {
              _validUntil = _validFrom.add(const Duration(hours: 1));
            }
          } else {
            _validUntil = dateTime;
          }
        });
      }
    }
  }

  void _generateQR() {
    if (!_formKey.currentState!.validate()) return;

    final qrId = DateTime.now().millisecondsSinceEpoch.toString();
    final qrData = {
      'id': qrId,
      'guest_name': _guestNameController.text.trim(),
      'guest_phone': _phoneController.text.trim(),
      'purpose': _purposeController.text.trim(),
      'valid_from': _validFrom,
      'valid_until': _validUntil,
      'qr_data': 'GUEST_ACCESS|$qrId|current_user_id|${_validFrom.millisecondsSinceEpoch}',
      'status': DateTime.now().isAfter(_validFrom) ? 'active' : 'scheduled',
      'used_count': 0,
      'max_uses': _maxUses,
    };

    widget.onQRGenerated(qrData);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    
    return Dialog(
      insetPadding: const EdgeInsets.all(16),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n?.translate('generate_qr') ?? 'Generate QR Code',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 24),
                  
                  TextFormField(
                    controller: _guestNameController,
                    decoration: InputDecoration(
                      labelText: l10n?.translate('guest_name') ?? 'Guest Name',
                      prefixIcon: const Icon(Icons.person),
                      border: const OutlineInputBorder(),
                    ),
                    validator: (value) => value?.trim().isEmpty == true
                        ? l10n?.translate('required_field') ?? 'Required'
                        : null,
                  ),
                  const SizedBox(height: 16),
                  
                  TextFormField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      labelText: l10n?.translate('phone_number') ?? 'Phone Number',
                      prefixIcon: const Icon(Icons.phone),
                      border: const OutlineInputBorder(),
                    ),
                    validator: (value) => value?.trim().isEmpty == true
                        ? l10n?.translate('required_field') ?? 'Required'
                        : null,
                  ),
                  const SizedBox(height: 16),
                  
                  TextFormField(
                    controller: _purposeController,
                    decoration: InputDecoration(
                      labelText: l10n?.translate('purpose') ?? 'Purpose',
                      prefixIcon: const Icon(Icons.description),
                      border: const OutlineInputBorder(),
                    ),
                    validator: (value) => value?.trim().isEmpty == true
                        ? l10n?.translate('required_field') ?? 'Required'
                        : null,
                  ),
                  const SizedBox(height: 24),
                  
                  Text(
                    l10n?.translate('validity_period') ?? 'Validity Period',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 16),
                  
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => _selectDateTime(true),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  l10n?.translate('valid_from') ?? 'Valid From',
                                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                                ),
                                Text('${_validFrom.day}/${_validFrom.month} ${_validFrom.hour}:${_validFrom.minute.toString().padLeft(2, '0')}'),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: InkWell(
                          onTap: () => _selectDateTime(false),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  l10n?.translate('valid_until') ?? 'Valid Until',
                                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                                ),
                                Text('${_validUntil.day}/${_validUntil.month} ${_validUntil.hour}:${_validUntil.minute.toString().padLeft(2, '0')}'),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  DropdownButtonFormField<int>(
                    value: _maxUses,
                    decoration: InputDecoration(
                      labelText: l10n?.translate('max_uses') ?? 'Max Uses',
                      border: const OutlineInputBorder(),
                    ),
                    items: [1, 2, 3, 5, 10].map((uses) {
                      return DropdownMenuItem(
                        value: uses,
                        child: Text('$uses ${uses == 1 ? 'use' : 'uses'}'),
                      );
                    }).toList(),
                    onChanged: (value) => setState(() => _maxUses = value!),
                  ),
                  const SizedBox(height: 32),
                  
                  Row(
                    children: [
                      Expanded(
                        child: TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: Text(l10n?.translate('cancel') ?? 'Cancel'),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _generateQR,
                          child: Text(l10n?.translate('generate') ?? 'Generate'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}