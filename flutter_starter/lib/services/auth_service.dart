import '../config/api_config.dart';
import '../models/auth_response.dart';
import '../models/user.dart';
import 'api_client.dart';
import 'token_storage.dart';

/// All HomeMe authentication flows for the mobile app.
///
/// Typical lifecycle:
///   1.  [register] OR [login]
///       → if `twoFactorSetupRequired` → run [setup2faEnroll] then [verify2faEnroll]
///       → if `twoFactorRequired`      → call [verify2faLogin] with the user-entered TOTP
///       → otherwise persist token via [_persistAuth]
///   2.  [verifyOtp]  (only after register if you require verified email before letting the user in)
///   3.  [me] on app launch to validate the saved token
///   4.  [logout] to clear secure storage
class AuthService {
  AuthService({ApiClient? client}) : _client = client ?? ApiClient.instance;
  final ApiClient _client;

  // ─────────────────────────── Register ───────────────────────────
  Future<AuthResponse> register(MobileRegisterRequest req) async {
    final json = await _client.post(ApiConfig.registerEndpoint, req.toJson());
    final auth = AuthResponse.fromJson(json);
    await _persistAuth(auth);
    return auth;
  }

  // ─────────────────────────── Login ───────────────────────────
  Future<AuthResponse> login(MobileLoginRequest req) async {
    final json = await _client.post(ApiConfig.loginEndpoint, req.toJson());
    final auth = AuthResponse.fromJson(json);
    // For plain success we persist immediately.
    // For 2FA flows we DO NOT persist yet — wait until verify completes.
    if (auth.isAuthenticated) {
      await _persistAuth(auth);
    }
    return auth;
  }

  // ─────────────────────────── Email OTP ───────────────────────────
  Future<User> verifyOtp({required String email, required String otp}) async {
    final json = await _client.post(
      ApiConfig.verifyOtpEndpoint,
      {'email': email, 'otp': otp},
    );
    return User.fromJson(json['user'] as Map<String, dynamic>);
  }

  Future<bool> resendOtp(String email) async {
    final json = await _client
        .post(ApiConfig.resendOtpEndpoint, {'email': email});
    return (json['sent'] ?? false) as bool;
  }

  // ─────────────────────────── 2FA ───────────────────────────
  /// Step 1 of mandatory enrolment. Returns QR + secret.
  Future<Map<String, dynamic>> setup2faEnroll(String setupToken) async {
    return _client.post(ApiConfig.twoFaSetupEnroll, {
      'setup_token': setupToken,
    });
  }

  /// Step 2 of mandatory enrolment. Returns final access_token + backup_codes.
  Future<AuthResponse> verify2faEnroll({
    required String setupToken,
    required String code,
  }) async {
    final json = await _client.post(ApiConfig.twoFaVerifyEnroll, {
      'setup_token': setupToken,
      'code': code,
    });
    final auth = AuthResponse.fromJson(json);
    if (auth.isAuthenticated) await _persistAuth(auth);
    return auth;
  }

  /// Login-time 2FA challenge.
  Future<AuthResponse> verify2faLogin({
    required String tempToken,
    required String code,
  }) async {
    final json = await _client.post(ApiConfig.twoFaVerifyLogin, {
      'temp_token': tempToken,
      'code': code,
    });
    final auth = AuthResponse.fromJson(json);
    if (auth.isAuthenticated) await _persistAuth(auth);
    return auth;
  }

  // ─────────────────────────── Profile / lifecycle ───────────────────────────
  Future<User?> me() async {
    try {
      final json = await _client.get(ApiConfig.meEndpoint);
      return User.fromJson(json['user'] as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    await TokenStorage.instance.clear();
  }

  // ─────────────────────────── Internals ───────────────────────────
  Future<void> _persistAuth(AuthResponse auth) async {
    if (auth.accessToken == null) return;
    await TokenStorage.instance.save(
      token: auth.accessToken!,
      userId: auth.user?.id,
    );
  }
}
