# HomeMe Flutter — API Integration Starter

This folder contains drop-in **Dart files** for the HomeMe Flutter app to talk to the backend.

```
flutter_starter/
├── lib/
│   ├── config/
│   │   └── api_config.dart          # Base URL, endpoints, timeouts
│   ├── models/
│   │   ├── user.dart                # User model + JSON serde
│   │   ├── auth_response.dart       # Login / register response envelopes
│   │   └── api_error.dart           # Error wrapper
│   ├── services/
│   │   ├── api_client.dart          # Dio-based HTTP client (interceptors, auth header)
│   │   ├── auth_service.dart        # register / verify / login / 2FA / me
│   │   ├── token_storage.dart       # Secure storage helpers
│   │   └── push_service.dart        # FCM registration helper
│   └── exceptions.dart              # ApiException, AuthException...
├── pubspec.deps.yaml                # Dependencies to add to pubspec.yaml
└── README.md                        # (this file)
```

## Setup

1. **Add dependencies** — copy the entries from `pubspec.deps.yaml` into your project's `pubspec.yaml` then run `flutter pub get`.

2. **Copy the `lib/` tree** into your Flutter project (keep the same nesting).

3. **Configure the environment** — edit `lib/config/api_config.dart` and uncomment the env you want, or wire it to `--dart-define`:

   ```
   flutter run --dart-define=HOMEME_ENV=production
   flutter run --dart-define=HOMEME_ENV=staging
   ```

4. **First call:**

   ```dart
   final auth = AuthService();

   final res = await auth.register(MobileRegisterRequest(
     username: 'new_user',
     email: 'new@example.com',
     password: 'StrongPass1A',
     fullName: 'اسم تجريبي',
     phone: '+201001234567',
     role: 'resident',
     compoundId: '<uuid>',
     unitNumber: 'A-101',
   ));

   print('Token: ${res.accessToken}');
   ```

5. **Read the full API reference:** [`/app/MOBILE_API.md`](../MOBILE_API.md).

## Production checklist

- [ ] Replace `production` URL once your real domain is wired.
- [ ] Initialise Firebase + grab the FCM token before calling `register()` / `login()`.
- [ ] Persist tokens with `flutter_secure_storage` (already wired in `token_storage.dart`).
- [ ] Add navigation handlers for the two 2FA response shapes (`two_factor_required` and `two_factor_setup_required`).
- [ ] Show the in-app banner / blocking screen while `user.emailVerified == false`.
