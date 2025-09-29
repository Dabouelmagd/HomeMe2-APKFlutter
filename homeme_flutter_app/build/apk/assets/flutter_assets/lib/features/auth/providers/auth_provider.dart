import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

import '../../../core/models/user_model.dart';
import '../../../core/services/api_service.dart';
import '../../../core/app_config.dart';
import '../models/auth_state.dart';

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _initializeAuth();
  }

  Future<void> _initializeAuth() async {
    state = state.loading();
    
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString(AppConfig.authTokenKey);
      final userDataString = prefs.getString(AppConfig.userDataKey);
      
      if (token != null && userDataString != null) {
        final userData = json.decode(userDataString);
        final user = User.fromJson(userData);
        state = state.success(user: user, token: token);
      } else {
        state = state.logout();
      }
    } catch (e) {
      state = state.failure('Failed to initialize authentication');
    }
  }

  Future<void> login(String email, String password) async {
    state = state.loading();
    
    try {
      final response = await ApiService.login(email, password);
      
      if (response['access_token'] != null && response['user'] != null) {
        final token = response['access_token'];
        final user = User.fromJson(response['user']);
        
        // Save to shared preferences
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(AppConfig.authTokenKey, token);
        await prefs.setString(AppConfig.userDataKey, json.encode(user.toJson()));
        
        state = state.success(user: user, token: token);
      } else {
        state = state.failure('Invalid login credentials');
      }
    } catch (e) {
      String errorMessage = 'Login failed';
      if (e.toString().contains('401')) {
        errorMessage = 'Invalid email or password';
      } else if (e.toString().contains('500')) {
        errorMessage = 'Server error. Please try again later';
      } else if (e.toString().contains('network') || e.toString().contains('timeout')) {
        errorMessage = 'Network error. Please check your connection';
      }
      state = state.failure(errorMessage);
    }
  }

  Future<void> register(Map<String, dynamic> userData) async {
    state = state.loading();
    
    try {
      final response = await ApiService.register(userData);
      
      if (response['access_token'] != null && response['user'] != null) {
        final token = response['access_token'];
        final user = User.fromJson(response['user']);
        
        // Save to shared preferences
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(AppConfig.authTokenKey, token);
        await prefs.setString(AppConfig.userDataKey, json.encode(user.toJson()));
        
        state = state.success(user: user, token: token);
      } else {
        state = state.failure('Registration failed');
      }
    } catch (e) {
      String errorMessage = 'Registration failed';
      if (e.toString().contains('400')) {
        errorMessage = 'Invalid registration data';
      } else if (e.toString().contains('409')) {
        errorMessage = 'Email already exists';
      } else if (e.toString().contains('500')) {
        errorMessage = 'Server error. Please try again later';
      }
      state = state.failure(errorMessage);
    }
  }

  Future<void> logout() async {
    try {
      await ApiService.clearAuthData();
      state = state.logout();
    } catch (e) {
      // Force logout even if API call fails
      state = state.logout();
    }
  }

  void clearError() {
    state = state.clearError();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});