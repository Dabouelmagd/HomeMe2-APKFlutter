import 'user.dart';

/// Tagged-union response from /api/mobile/auth/register and /login.
///
/// One of the following will be true:
///   - [accessToken] != null         → success, use [user]
///   - [twoFactorRequired] == true   → call /api/2fa/verify-login with [tempToken]
///   - [twoFactorSetupRequired] == true
///                                   → mandatory enrolment via [setupToken]
class AuthResponse {
  final String? accessToken;
  final String tokenType;
  final User? user;
  final String? companyId;

  // Post-register signals
  final bool otpRequired;
  final bool otpSent;
  final int otpTtlMinutes;

  // 2FA signals
  final bool twoFactorRequired;
  final String? tempToken;
  final int twoFaTtlMinutes;

  final bool twoFactorSetupRequired;
  final String? setupToken;
  final String? setupRole;

  final String? message;

  const AuthResponse({
    this.accessToken,
    this.tokenType = 'bearer',
    this.user,
    this.companyId,
    this.otpRequired = false,
    this.otpSent = false,
    this.otpTtlMinutes = 0,
    this.twoFactorRequired = false,
    this.tempToken,
    this.twoFaTtlMinutes = 0,
    this.twoFactorSetupRequired = false,
    this.setupToken,
    this.setupRole,
    this.message,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: json['access_token'] as String?,
      tokenType: (json['token_type'] ?? 'bearer') as String,
      user: json['user'] is Map<String, dynamic>
          ? User.fromJson(json['user'] as Map<String, dynamic>)
          : null,
      companyId: json['company_id'] as String?,
      otpRequired: (json['otp_required'] ?? false) as bool,
      otpSent: (json['otp_sent'] ?? false) as bool,
      otpTtlMinutes: (json['otp_ttl_minutes'] ?? 0) as int,
      twoFactorRequired: (json['two_factor_required'] ?? false) as bool,
      tempToken: json['temp_token'] as String?,
      twoFaTtlMinutes: (json['ttl_minutes'] ?? 0) as int,
      twoFactorSetupRequired:
          (json['two_factor_setup_required'] ?? false) as bool,
      setupToken: json['setup_token'] as String?,
      setupRole: json['role'] as String?,
      message: json['message'] as String?,
    );
  }

  bool get isAuthenticated => accessToken != null && user != null;
}

class MobileRegisterRequest {
  final String username;
  final String email;
  final String password;
  final String fullName;
  final String? phone;
  final String role; // resident | compound_admin | company_admin
  final String? compoundId;
  final String? unitNumber;
  final String? companyName;
  final String? deviceToken;
  final Map<String, dynamic>? deviceInfo;
  final String? referralCode;

  MobileRegisterRequest({
    required this.username,
    required this.email,
    required this.password,
    required this.fullName,
    required this.role,
    this.phone,
    this.compoundId,
    this.unitNumber,
    this.companyName,
    this.deviceToken,
    this.deviceInfo,
    this.referralCode,
  });

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{
      'username': username,
      'email': email,
      'password': password,
      'full_name': fullName,
      'role': role,
    };
    if (phone != null) m['phone'] = phone;
    if (compoundId != null) m['compound_id'] = compoundId;
    if (unitNumber != null) m['unit_number'] = unitNumber;
    if (companyName != null) m['company_name'] = companyName;
    if (deviceToken != null) m['device_token'] = deviceToken;
    if (deviceInfo != null) m['device_info'] = deviceInfo;
    if (referralCode != null) m['referral_code'] = referralCode;
    return m;
  }
}

class MobileLoginRequest {
  final String username;
  final String password;
  final String? deviceToken;
  final Map<String, dynamic>? deviceInfo;

  MobileLoginRequest({
    required this.username,
    required this.password,
    this.deviceToken,
    this.deviceInfo,
  });

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{'username': username, 'password': password};
    if (deviceToken != null) m['device_token'] = deviceToken;
    if (deviceInfo != null) m['device_info'] = deviceInfo;
    return m;
  }
}
