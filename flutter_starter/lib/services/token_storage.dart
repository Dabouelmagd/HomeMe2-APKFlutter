import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Tiny wrapper around flutter_secure_storage so the rest of the app
/// doesn't import the dependency directly.
class TokenStorage {
  TokenStorage._();
  static final TokenStorage instance = TokenStorage._();

  static const _kAccessToken = 'homeme.access_token';
  static const _kRefreshHint = 'homeme.refresh_hint';
  static const _kUserId = 'homeme.user_id';

  final _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  Future<void> save({required String token, String? userId}) async {
    await _storage.write(key: _kAccessToken, value: token);
    if (userId != null) {
      await _storage.write(key: _kUserId, value: userId);
    }
  }

  Future<String?> readToken() => _storage.read(key: _kAccessToken);
  Future<String?> readUserId() => _storage.read(key: _kUserId);

  Future<void> clear() async {
    await _storage.delete(key: _kAccessToken);
    await _storage.delete(key: _kRefreshHint);
    await _storage.delete(key: _kUserId);
  }
}
