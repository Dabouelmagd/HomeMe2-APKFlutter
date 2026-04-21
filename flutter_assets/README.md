# HomeMe Flutter Assets Package

This folder contains all shared assets, configuration, and reference data needed to build the **HomeMe** Flutter mobile app consistent with the web app.

## 📂 Structure

```
flutter_assets/
├── logos/                         # Brand logos (PNG + SVG)
│   ├── homeme-logo.png            # Main horizontal logo
│   ├── homeme-logo-ar.jpg         # Arabic variant
│   ├── datalife-logo.png          # Parent brand
│   └── datalife-logo-{ar,en}{,-dark}.svg
├── locales/                       # i18n translations (JSON)
│   ├── ar.json                    # Arabic (primary)
│   ├── en.json                    # English
│   └── fr.json                    # French
├── config/
│   ├── app_config.json            # App metadata, API endpoints, features, roles
│   ├── design_tokens.json         # Colors, typography, spacing, radius
│   └── webapp-manifest.json       # PWA manifest (reference)
├── icons/                         # Place your custom icons here
├── images/                        # Place onboarding/illustration assets here
├── fonts/                         # Place Cairo (AR) + Inter (EN) fonts here
├── API_REFERENCE.md               # Complete backend API endpoint list
└── README.md                      # This file
```

## 🚀 Using in Flutter

### 1. Add to `pubspec.yaml`

```yaml
flutter:
  assets:
    - assets/logos/
    - assets/locales/
    - assets/config/
    - assets/images/
    - assets/icons/

  fonts:
    - family: Cairo
      fonts:
        - asset: assets/fonts/Cairo-Regular.ttf
        - asset: assets/fonts/Cairo-Bold.ttf
          weight: 700
    - family: Inter
      fonts:
        - asset: assets/fonts/Inter-Regular.ttf
        - asset: assets/fonts/Inter-Bold.ttf
          weight: 700
```

> Download Cairo from Google Fonts: https://fonts.google.com/specimen/Cairo
> Download Inter from Google Fonts: https://fonts.google.com/specimen/Inter

### 2. Load Config

```dart
import 'package:flutter/services.dart' show rootBundle;
import 'dart:convert';

Future<Map<String, dynamic>> loadAppConfig() async {
  final raw = await rootBundle.loadString('assets/config/app_config.json');
  return json.decode(raw);
}

Future<Map<String, dynamic>> loadDesignTokens() async {
  final raw = await rootBundle.loadString('assets/config/design_tokens.json');
  return json.decode(raw);
}
```

### 3. Load i18n

Use `flutter_localizations` + `easy_localization` package:

```yaml
dependencies:
  easy_localization: ^3.0.3
```

```dart
await EasyLocalization.ensureInitialized();

runApp(
  EasyLocalization(
    supportedLocales: const [Locale('ar'), Locale('en'), Locale('fr')],
    path: 'assets/locales',
    fallbackLocale: const Locale('ar'),
    startLocale: const Locale('ar'),
    child: MyApp(),
  ),
);
```

Usage: `Text('login'.tr())`

### 4. Apply Design Tokens

```dart
// lib/theme/app_theme.dart
class AppColors {
  static const Color primary = Color(0xFF4F46E5);
  static const Color secondary = Color(0xFF9333EA);
  static const Color accent = Color(0xFFEC4899);
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  // ... see design_tokens.json for all values
}

ThemeData buildAppTheme() => ThemeData(
  primaryColor: AppColors.primary,
  fontFamily: 'Cairo', // for Arabic; use Inter for English
  scaffoldBackgroundColor: const Color(0xFFF9FAFB),
  // ...
);
```

## 🌐 API Configuration

- **Base URL**: set in your `lib/config/api.dart` from `app_config.json.api.base_url_production`
- **Authentication**: JWT via `POST /api/auth/login` → store token → send as `Authorization: Bearer <token>`
- **Full endpoint reference**: see `API_REFERENCE.md`

## 🔑 Key Roles (for role-based UI)

| Role | Arabic | Landing Page |
|---|---|---|
| `app_owner` | مالك التطبيق | `/app/dashboard` → OwnerDashboard |
| `super_admin` | سوبر أدمن | `/app/super-admin` |
| `company_admin` | مدير شركة | `/app/dashboard` → CompanyAdminDashboard |
| `admin` | أدمن المجمع | Admin dashboard |
| `manager` | إداري | Manager tools |
| `security` | أمن | Security panel |
| `resident` | ساكن | Resident dashboard |
| `family_head` | رب أسرة | Family dashboard |
| `advertiser` | معلن | Advertiser portal |

## 📱 RTL Support

Arabic is the primary language. Always:
- Set `Directionality(textDirection: TextDirection.rtl, ...)` for Arabic
- Use `EdgeInsetsDirectional` instead of `EdgeInsets` for margins/padding
- Mirror icons that have direction (arrows, chevrons) using `Directionality`-aware widgets

## ✅ Checklist Before Publishing

- [ ] Replaced `api.base_url_production` with your production domain
- [ ] Added Cairo + Inter font files to `assets/fonts/`
- [ ] Generated app icons from `logos/homeme-logo.png` via `flutter_launcher_icons`
- [ ] Tested all 3 locales (ar/en/fr)
- [ ] Verified RTL layout in Arabic
- [ ] FCM push notifications configured (backend endpoint: `POST /api/push/register-token`)

## 📞 Support

- Backend API base: see `app_config.json`
- Design guidelines: `design_tokens.json`
- Translations: `locales/*.json` (same keys as web app)
