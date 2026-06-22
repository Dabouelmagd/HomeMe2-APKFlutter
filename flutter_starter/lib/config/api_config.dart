/// HomeMe API Configuration
///
/// Switch environments via:
///   flutter run --dart-define=HOMEME_ENV=production
///   flutter run --dart-define=HOMEME_ENV=staging
///   flutter run --dart-define=HOMEME_ENV=local
library;

enum HomeMeEnv { production, staging, local }

class ApiConfig {
  // ─────────────────────────── Environment ───────────────────────────
  static const String _envName = String.fromEnvironment(
    'HOMEME_ENV',
    defaultValue: 'production',
  );

  static HomeMeEnv get env {
    switch (_envName) {
      case 'local':
        return HomeMeEnv.local;
      case 'staging':
        return HomeMeEnv.staging;
      default:
        return HomeMeEnv.production;
    }
  }

  static String get baseUrl {
    switch (env) {
      case HomeMeEnv.production:
        return 'https://homemeapp.net';
      case HomeMeEnv.staging:
        // Preview / QA backend (kept in sync with team)
        return 'https://profile-nav-debug.preview.emergentagent.com';
      case HomeMeEnv.local:
        return 'http://10.0.2.2:8001'; // Android emulator → host's localhost
    }
  }

  static String get apiBase => '$baseUrl/api';
  static String get wsBase =>
      baseUrl.replaceFirst(RegExp(r'^http'), 'ws') + '/ws';

  // ─────────────────────────── Timeouts ───────────────────────────
  static const Duration connectTimeout = Duration(seconds: 12);
  static const Duration receiveTimeout = Duration(seconds: 25);
  static const Duration sendTimeout = Duration(seconds: 30);

  // ─────────────────────────── Endpoints ───────────────────────────

  // Mobile Auth
  static String get registerEndpoint => '$apiBase/mobile/auth/register';
  static String get verifyOtpEndpoint => '$apiBase/mobile/auth/verify-otp';
  static String get resendOtpEndpoint => '$apiBase/mobile/auth/resend-otp';
  static String get loginEndpoint => '$apiBase/mobile/auth/login';
  static String get meEndpoint => '$apiBase/mobile/auth/me';

  // Web-shared
  static String get authMeEndpoint => '$apiBase/auth/me';
  static String get forgotPasswordEndpoint => '$apiBase/auth/forgot-password';
  static String get resetPasswordEndpoint => '$apiBase/auth/reset-password';

  // 2FA
  static String get twoFaSetupEnroll => '$apiBase/2fa/setup-enroll';
  static String get twoFaVerifyEnroll => '$apiBase/2fa/verify-enroll';
  static String get twoFaVerifyLogin => '$apiBase/2fa/verify-login';
  static String get twoFaStatus => '$apiBase/2fa/status';
  static String get twoFaDisable => '$apiBase/2fa/disable';

  // Dashboards
  static String get residentDashboard => '$apiBase/dashboard/resident';
  static String get adminDashboard => '$apiBase/dashboard/admin';
  static String dashboardKpis({String range = '30d'}) =>
      '$apiBase/dashboard/kpis?range=$range';

  // Notifications
  static String get notifications => '$apiBase/notifications';
  static String get myNotifications => '$apiBase/notifications/my';
  static String notificationRead(String id) =>
      '$apiBase/notifications/$id/read';
  static String get markAllRead => '$apiBase/notifications/mark-all-read';
  static String get notificationPrefs =>
      '$apiBase/notifications/preferences';

  // Maintenance
  static String get maintenanceRequests => '$apiBase/maintenance/requests';
  static String get maintenanceStats => '$apiBase/maintenance/stats';
  static String maintenanceStatus(String id) =>
      '$apiBase/maintenance/requests/$id/status';

  // Complaints
  static String get complaints => '$apiBase/complaints';
  static String complaintRespond(String id) =>
      '$apiBase/complaints/$id/respond';

  // Announcements
  static String get announcements => '$apiBase/announcements';

  // Facilities & Bookings
  static String get facilities => '$apiBase/facilities';
  static String facilityAvailability(String id, String date) =>
      '$apiBase/facilities/$id/availability?date=$date';
  static String get facilityBookings => '$apiBase/facility-bookings';
  static String facilityBooking(String id) =>
      '$apiBase/facility-bookings/$id';
  static String cancelBooking(String id) =>
      '$apiBase/facility-bookings/$id/cancel';

  // Guests / Visitors
  static String get guests => '$apiBase/guests';
  static String guestQrCode(String id) => '$apiBase/guests/$id/qr-code';
  static String get scanQr => '$apiBase/guests/scan-qr';
  static String guestCheckin(String id) => '$apiBase/guests/$id/checkin';
  static String guestCheckout(String id) => '$apiBase/guests/$id/checkout';

  // Invoices
  static String get myInvoices => '$apiBase/invoices/my';
  static String invoicePdf(String id) => '$apiBase/invoices/$id/pdf';

  // Payments
  static String get paymentMethods => '$apiBase/payments/methods';
  static String get paymentPlans => '$apiBase/payments/plans';
  static String get stripeCreateSession =>
      '$apiBase/payments/create-session';
  static String get paypalCreateOrder =>
      '$apiBase/payments/paypal/create-order';
  static String paypalCaptureOrder(String orderId) =>
      '$apiBase/payments/paypal/capture/$orderId';

  // Family
  static String get familyMembers => '$apiBase/family-members';
  static String familyMemberQr(String id) =>
      '$apiBase/family-members/$id/qr-code';
  static String get familyInvites => '$apiBase/family-invites';

  // Polls
  static String get polls => '$apiBase/polls';
  static String pollVote(String id) => '$apiBase/polls/$id/vote';
  static String pollResults(String id) => '$apiBase/polls/$id/results';

  // Documents
  static String get documents => '$apiBase/documents';
  static String document(String id) => '$apiBase/documents/$id';
  static String uploadDocument(String id) =>
      '$apiBase/documents/$id/upload';

  // Chats
  static String get chats => '$apiBase/chats';
  static String chat(String id) => '$apiBase/chats/$id';
  static String chatMessages(String id) => '$apiBase/chats/$id/messages';
  static String uploadChatFile(String id) => '$apiBase/chats/$id/upload';
  static String uploadChatVoice(String id) => '$apiBase/chats/$id/voice';
  static String readChat(String id) => '$apiBase/chats/$id/read';

  // Smart devices
  static String get smartDevices => '$apiBase/smart-devices';
  static String smartDeviceCommand(String id) =>
      '$apiBase/smart-devices/$id/command';
  static String get naturalCommand =>
      '$apiBase/smart-devices/natural-command';

  // AI Assistant
  static String get aiChat => '$apiBase/ai-assistant/chat';
  static String get aiHistory => '$apiBase/ai-assistant/history';
  static String get aiUsage => '$apiBase/ai-assistant/usage';

  // Feature flags
  static String get featureFlagsMe => '$apiBase/feature-flags/me';

  // Compound metadata
  static String compound(String id) => '$apiBase/compounds/$id';
  static String compoundBranding(String id) =>
      '$apiBase/compounds/$id/branding';
  static String compoundServices(String id) =>
      '$apiBase/compounds/$id/services';

  // Ratings
  static String get ratings => '$apiBase/ratings';
  static String ratingsTarget(String type, String id) =>
      '$apiBase/ratings/target/$type/$id';

  // WebSocket (real-time notifications + chat)
  static String wsNotifications(String token) =>
      '$wsBase/notifications?token=$token';
}
