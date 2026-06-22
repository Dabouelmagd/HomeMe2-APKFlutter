/// Generic API failure. Always inspect [statusCode] before reading [message].
class ApiException implements Exception {
  final int statusCode;
  final String message;
  final dynamic raw; // body / decoded JSON for advanced handling
  final String? code; // e.g. 'EMAIL_NOT_VERIFIED'

  ApiException(this.statusCode, this.message, {this.raw, this.code});

  @override
  String toString() => 'ApiException($statusCode): $message';

  bool get isAuthError => statusCode == 401 || statusCode == 403;
  bool get isRateLimited => statusCode == 429;
  bool get isValidation => statusCode == 422 || statusCode == 400;
  bool get isConflict => statusCode == 409;
  bool get isNotFound => statusCode == 404;
}

class NetworkException implements Exception {
  final String message;
  NetworkException(this.message);
  @override
  String toString() => 'NetworkException: $message';
}
