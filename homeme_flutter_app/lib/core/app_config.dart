class AppConfig {
  // Backend URL - This should match REACT_APP_BACKEND_URL from the React frontend
  static const String baseUrl = 'https://homeme-i18n.preview.emergentagent.com';
  
  // API endpoints
  static const String apiPrefix = '/api';
  
  // Auth endpoints
  static const String loginEndpoint = '$apiPrefix/auth/login';
  static const String registerEndpoint = '$apiPrefix/auth/register';
  static const String refreshTokenEndpoint = '$apiPrefix/auth/refresh';
  
  // Dashboard endpoints
  static const String adminDashboardEndpoint = '$apiPrefix/admin/dashboard';
  static const String residentDashboardEndpoint = '$apiPrefix/resident/dashboard';
  
  // Guest management endpoints
  static const String guestsEndpoint = '$apiPrefix/guests';
  static const String visitRequestsEndpoint = '$apiPrefix/visit-requests';
  
  // Maintenance endpoints
  static const String maintenanceEndpoint = '$apiPrefix/maintenance';
  
  // Events endpoints
  static const String eventsEndpoint = '$apiPrefix/events';
  
  // Notifications endpoints
  static const String notificationsEndpoint = '$apiPrefix/notifications';
  
  // Smart home endpoints
  static const String smartDevicesEndpoint = '$apiPrefix/smart-devices';
  
  // Storage keys
  static const String authTokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userDataKey = 'user_data';
  static const String languageKey = 'selected_language';
  
  // Default values
  static const int apiTimeoutSeconds = 30;
  static const int maxRetryAttempts = 3;
}