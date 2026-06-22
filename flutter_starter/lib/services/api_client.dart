import 'package:dio/dio.dart';

import '../config/api_config.dart';
import '../exceptions.dart';
import 'token_storage.dart';

/// Singleton Dio client configured with:
///   - base URL pointing at `/api`
///   - timeouts
///   - automatic Bearer token injection from [TokenStorage]
///   - normalised error → [ApiException]
class ApiClient {
  ApiClient._() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.apiBase,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
      sendTimeout: ApiConfig.sendTimeout,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // App-version header — read from your package_info_plus init
        // and call ApiClient.instance.setAppVersion(...) at startup.
      },
      validateStatus: (_) => true, // we throw manually below
    ));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await TokenStorage.instance.readToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onResponse: (response, handler) {
        if (response.statusCode != null &&
            response.statusCode! >= 200 &&
            response.statusCode! < 300) {
          return handler.next(response);
        }
        return handler.reject(
          DioException(
            requestOptions: response.requestOptions,
            response: response,
            type: DioExceptionType.badResponse,
          ),
        );
      },
      onError: (e, handler) {
        return handler.next(e);
      },
    ));
  }

  static final ApiClient instance = ApiClient._();
  late final Dio _dio;

  Dio get dio => _dio;

  void setAppVersion(String version) {
    _dio.options.headers['X-App-Version'] = version;
  }

  // ───────────────────── Convenience wrappers ─────────────────────

  Future<Map<String, dynamic>> get(String url,
      {Map<String, dynamic>? query}) async {
    try {
      final r = await _dio.get(url, queryParameters: query);
      return _asMap(r.data);
    } on DioException catch (e) {
      throw _normalise(e);
    }
  }

  Future<Map<String, dynamic>> post(String url, Object? body) async {
    try {
      final r = await _dio.post(url, data: body);
      return _asMap(r.data);
    } on DioException catch (e) {
      throw _normalise(e);
    }
  }

  Future<Map<String, dynamic>> patch(String url, Object? body) async {
    try {
      final r = await _dio.patch(url, data: body);
      return _asMap(r.data);
    } on DioException catch (e) {
      throw _normalise(e);
    }
  }

  Future<Map<String, dynamic>> put(String url, Object? body) async {
    try {
      final r = await _dio.put(url, data: body);
      return _asMap(r.data);
    } on DioException catch (e) {
      throw _normalise(e);
    }
  }

  Future<Map<String, dynamic>> delete(String url) async {
    try {
      final r = await _dio.delete(url);
      return _asMap(r.data);
    } on DioException catch (e) {
      throw _normalise(e);
    }
  }

  // ───────────────────── Error normalisation ─────────────────────

  Exception _normalise(DioException e) {
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.connectionError) {
      return NetworkException(
          'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.');
    }
    final res = e.response;
    final status = res?.statusCode ?? 0;
    final body = res?.data;
    String message = 'حدث خطأ غير متوقع';
    String? code;
    if (body is Map) {
      final detail = body['detail'];
      if (detail is String) {
        message = detail;
      } else if (detail is List && detail.isNotEmpty) {
        final first = detail.first;
        if (first is Map && first['msg'] is String) {
          message = first['msg'] as String;
        }
      }
      if (body['code'] is String) code = body['code'] as String;
    }
    return ApiException(status, message, raw: body, code: code);
  }

  Map<String, dynamic> _asMap(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    return {'raw': data};
  }
}
