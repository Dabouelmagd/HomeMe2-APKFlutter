import '../../../core/models/user_model.dart';

class AuthState {
  final bool isLoading;
  final bool isLoggedIn;
  final User? user;
  final String? error;
  final String? token;

  const AuthState({
    this.isLoading = false,
    this.isLoggedIn = false,
    this.user,
    this.error,
    this.token,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isLoggedIn,
    User? user,
    String? error,
    String? token,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isLoggedIn: isLoggedIn ?? this.isLoggedIn,
      user: user ?? this.user,
      error: error ?? this.error,
      token: token ?? this.token,
    );
  }

  AuthState clearError() {
    return copyWith(error: null);
  }

  AuthState loading() {
    return copyWith(isLoading: true, error: null);
  }

  AuthState success({User? user, String? token}) {
    return copyWith(
      isLoading: false,
      isLoggedIn: true,
      user: user ?? this.user,
      token: token ?? this.token,
      error: null,
    );
  }

  AuthState failure(String error) {
    return copyWith(
      isLoading: false,
      isLoggedIn: false,
      error: error,
    );
  }

  AuthState logout() {
    return const AuthState(
      isLoading: false,
      isLoggedIn: false,
      user: null,
      error: null,
      token: null,
    );
  }
}