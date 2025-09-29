import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../app_config.dart';

class ApiService {
  static late Dio _dio;
  static late SharedPreferences _prefs;

  static void initialize() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: Duration(seconds: AppConfig.apiTimeoutSeconds),
      receiveTimeout: Duration(seconds: AppConfig.apiTimeoutSeconds),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Add auth token if available
          final token = await getAuthToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          // Handle 401 - Unauthorized
          if (error.response?.statusCode == 401) {
            await clearAuthData();
            // Could redirect to login here
          }
          handler.next(error);
        },
      ),
    );

    _initPrefs();
  }

  static Future<void> _initPrefs() async {
    _prefs = await SharedPreferences.getInstance();
  }

  // Auth methods
  static Future<String?> getAuthToken() async {
    return _prefs.getString(AppConfig.authTokenKey);
  }

  static Future<void> saveAuthToken(String token) async {
    await _prefs.setString(AppConfig.authTokenKey, token);
  }

  static Future<void> clearAuthData() async {
    await _prefs.remove(AppConfig.authTokenKey);
    await _prefs.remove(AppConfig.refreshTokenKey);
    await _prefs.remove(AppConfig.userDataKey);
  }

  static Future<bool> isLoggedIn() async {
    final token = await getAuthToken();
    return token != null && token.isNotEmpty;
  }

  // HTTP methods
  static Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } catch (e) {
      rethrow;
    }
  }

  static Future<Response> post(String path, {dynamic data}) async {
    try {
      return await _dio.post(path, data: data);
    } catch (e) {
      rethrow;
    }
  }

  static Future<Response> put(String path, {dynamic data}) async {
    try {
      return await _dio.put(path, data: data);
    } catch (e) {
      rethrow;
    }
  }

  static Future<Response> delete(String path) async {
    try {
      return await _dio.delete(path);
    } catch (e) {
      rethrow;
    }
  }

  // Auth API calls
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await post(AppConfig.loginEndpoint, data: {
      'email': email,
      'password': password,
    });
    return response.data;
  }

  static Future<Map<String, dynamic>> register(Map<String, dynamic> userData) async {
    final response = await post(AppConfig.registerEndpoint, data: userData);
    return response.data;
  }

  // Dashboard API calls
  static Future<Map<String, dynamic>> getAdminDashboard() async {
    final response = await get(AppConfig.adminDashboardEndpoint);
    return response.data;
  }

  static Future<Map<String, dynamic>> getResidentDashboard() async {
    final response = await get(AppConfig.residentDashboardEndpoint);
    return response.data;
  }

  // Guest management API calls
  static Future<List<dynamic>> getGuests() async {
    final response = await get(AppConfig.guestsEndpoint);
    return response.data;
  }

  static Future<Map<String, dynamic>> createVisitRequest(Map<String, dynamic> requestData) async {
    final response = await post(AppConfig.visitRequestsEndpoint, data: requestData);
    return response.data;
  }

  // Maintenance API calls
  static Future<List<dynamic>> getMaintenanceRequests() async {
    final response = await get(AppConfig.maintenanceEndpoint);
    return response.data;
  }

  static Future<Map<String, dynamic>> createMaintenanceRequest(Map<String, dynamic> requestData) async {
    final response = await post(AppConfig.maintenanceEndpoint, data: requestData);
    return response.data;
  }

  // Events API calls
  static Future<List<dynamic>> getEvents() async {
    final response = await get(AppConfig.eventsEndpoint);
    return response.data;
  }

  // Notifications API calls
  static Future<List<dynamic>> getNotifications() async {
    final response = await get(AppConfig.notificationsEndpoint);
    return response.data;
  }
}