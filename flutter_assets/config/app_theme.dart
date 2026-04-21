// HomeMe Flutter Theme — Drop-in ready Dart file
// Place at: lib/theme/app_theme.dart
// Depends on: fonts (Cairo, Inter) in pubspec.yaml

import 'package:flutter/material.dart';

class AppColors {
  // Brand
  static const Color primary = Color(0xFF4F46E5);
  static const Color primaryDark = Color(0xFF3730A3);
  static const Color primaryLight = Color(0xFF818CF8);
  static const Color secondary = Color(0xFF9333EA);
  static const Color accent = Color(0xFFEC4899);

  // Semantic
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);
  static const Color critical = Color(0xFFDC2626);

  // Neutral (light)
  static const Color backgroundLight = Color(0xFFF9FAFB);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color borderLight = Color(0xFFE5E7EB);
  static const Color textPrimaryLight = Color(0xFF111827);
  static const Color textSecondaryLight = Color(0xFF6B7280);

  // Neutral (dark)
  static const Color backgroundDark = Color(0xFF0F172A);
  static const Color surfaceDark = Color(0xFF1E293B);
  static const Color borderDark = Color(0xFF334155);
  static const Color textPrimaryDark = Color(0xFFF9FAFB);
  static const Color textSecondaryDark = Color(0xFF9CA3AF);

  // Role badges
  static const Color roleAppOwner = Color(0xFF7C3AED);
  static const Color roleSuperAdmin = Color(0xFF2563EB);
  static const Color roleCompanyAdmin = Color(0xFF10B981);
  static const Color roleAdmin = Color(0xFFF59E0B);
  static const Color roleManager = Color(0xFF8B5CF6);
  static const Color roleSecurity = Color(0xFFEF4444);
  static const Color roleResident = Color(0xFF06B6D4);
  static const Color roleFamilyHead = Color(0xFFEC4899);

  // Alert severity
  static const Color severityCritical = Color(0xFFDC2626);
  static const Color severityHigh = Color(0xFFF97316);
  static const Color severityMedium = Color(0xFFF59E0B);
  static const Color severityLow = Color(0xFF0EA5E9);
}

class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double base = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
  static const double xxxl = 64;
}

class AppRadius {
  static const double sm = 6;
  static const double md = 8;
  static const double lg = 12;
  static const double xl = 16;
  static const double xxl = 20;
  static const double full = 9999;
}

class AppTextStyles {
  static const String fontAr = 'Cairo';
  static const String fontEn = 'Inter';

  static TextStyle base({required bool isArabic, Color? color, double size = 14, FontWeight weight = FontWeight.w400}) =>
      TextStyle(
        fontFamily: isArabic ? fontAr : fontEn,
        fontSize: size,
        fontWeight: weight,
        color: color,
        height: 1.5,
      );
}

ThemeData buildHomeMeTheme({required Brightness brightness, required bool isArabic}) {
  final isDark = brightness == Brightness.dark;
  final bg = isDark ? AppColors.backgroundDark : AppColors.backgroundLight;
  final surface = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
  final textPrimary = isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
  final textSecondary = isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;
  final border = isDark ? AppColors.borderDark : AppColors.borderLight;
  final fontFamily = isArabic ? AppTextStyles.fontAr : AppTextStyles.fontEn;

  return ThemeData(
    brightness: brightness,
    primaryColor: AppColors.primary,
    scaffoldBackgroundColor: bg,
    fontFamily: fontFamily,
    colorScheme: ColorScheme(
      brightness: brightness,
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.secondary,
      onSecondary: Colors.white,
      error: AppColors.error,
      onError: Colors.white,
      surface: surface,
      onSurface: textPrimary,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: surface,
      foregroundColor: textPrimary,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        fontFamily: fontFamily,
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: textPrimary,
      ),
    ),
    cardTheme: CardTheme(
      color: surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        side: BorderSide(color: border, width: 1),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
        textStyle: TextStyle(fontFamily: fontFamily, fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.base, vertical: AppSpacing.md),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: BorderSide(color: border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
      labelStyle: TextStyle(color: textSecondary, fontFamily: fontFamily),
    ),
    dividerColor: border,
    textTheme: TextTheme(
      headlineLarge: TextStyle(fontFamily: fontFamily, fontSize: 36, fontWeight: FontWeight.w800, color: textPrimary),
      headlineMedium: TextStyle(fontFamily: fontFamily, fontSize: 30, fontWeight: FontWeight.w700, color: textPrimary),
      headlineSmall: TextStyle(fontFamily: fontFamily, fontSize: 24, fontWeight: FontWeight.w700, color: textPrimary),
      titleLarge: TextStyle(fontFamily: fontFamily, fontSize: 20, fontWeight: FontWeight.w700, color: textPrimary),
      titleMedium: TextStyle(fontFamily: fontFamily, fontSize: 18, fontWeight: FontWeight.w600, color: textPrimary),
      bodyLarge: TextStyle(fontFamily: fontFamily, fontSize: 16, color: textPrimary),
      bodyMedium: TextStyle(fontFamily: fontFamily, fontSize: 14, color: textPrimary),
      bodySmall: TextStyle(fontFamily: fontFamily, fontSize: 12, color: textSecondary),
      labelSmall: TextStyle(fontFamily: fontFamily, fontSize: 11, color: textSecondary),
    ),
  );
}

// Helper: role → color
Color colorForRole(String role) {
  switch (role) {
    case 'app_owner': return AppColors.roleAppOwner;
    case 'super_admin': return AppColors.roleSuperAdmin;
    case 'company_admin': return AppColors.roleCompanyAdmin;
    case 'admin': return AppColors.roleAdmin;
    case 'manager': return AppColors.roleManager;
    case 'security': return AppColors.roleSecurity;
    case 'resident': return AppColors.roleResident;
    case 'family_head': return AppColors.roleFamilyHead;
    default: return AppColors.primary;
  }
}

// Helper: severity → color
Color colorForSeverity(String sev) {
  switch (sev) {
    case 'critical': return AppColors.severityCritical;
    case 'high': return AppColors.severityHigh;
    case 'medium': return AppColors.severityMedium;
    case 'low': return AppColors.severityLow;
    default: return AppColors.info;
  }
}
