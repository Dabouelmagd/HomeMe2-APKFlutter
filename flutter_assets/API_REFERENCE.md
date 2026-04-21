# HomeMe API Reference — Flutter Integration

**Base URL**: set from `app_config.json → api.base_url_production`
**All endpoints**: prefixed with `/api`
**Auth**: `Authorization: Bearer <JWT_TOKEN>` (from login response `access_token`)

---

## 🔐 Auth

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| POST | `/api/auth/register` | `{username, email, password, full_name, phone?}` | `{user, access_token}` |
| POST | `/api/auth/login` | `{username, password}` | `{user, access_token}` |
| GET  | `/api/auth/me` | — | Current user profile |

## 🏘️ Compounds

| Method | Endpoint | Purpose |
|---|---|---|
| GET  | `/api/compounds/my` | Current user's compound info |
| GET  | `/api/compounds/{id}` | Single compound details |
| POST | `/api/compounds/{id}/users` | Register user to compound |

## 👨‍👩‍👧 Families

| Method | Endpoint |
|---|---|
| GET  | `/api/families/my` |
| POST | `/api/families` |
| POST | `/api/families/{id}/members` |
| DELETE | `/api/families/{id}/members/{user_id}` |

## 💬 Messaging

| Method | Endpoint |
|---|---|
| GET  | `/api/messages` |
| POST | `/api/messages` |
| PUT  | `/api/messages/{id}/read` |

## 📋 Invoices & Payments

| Method | Endpoint |
|---|---|
| GET  | `/api/invoices` |
| GET  | `/api/invoices/{id}` |
| POST | `/api/invoices/{id}/pay` (Stripe) |

## 🚪 Gate Access (QR)

| Method | Endpoint |
|---|---|
| POST | `/api/gate/generate-qr` |
| POST | `/api/gate/scan` (Security) |
| GET  | `/api/gate/logs` |

## 🚨 Emergency SOS

| Method | Endpoint |
|---|---|
| POST | `/api/sos/trigger` |
| GET  | `/api/sos/my-alerts` |
| PUT  | `/api/sos/{id}/resolve` |

## 🔔 Push Notifications (FCM)

| Method | Endpoint |
|---|---|
| POST | `/api/push/register-token` `{token, platform, device_info?}` |
| DELETE | `/api/push/unregister-token/{token}` |
| GET  | `/api/notifications` |
| PUT  | `/api/notifications/{id}/read` |

## 🏢 Company Admin (role=company_admin only)

| Method | Endpoint |
|---|---|
| GET  | `/api/company-admin/me` |
| GET  | `/api/company-admin/compounds` |
| POST | `/api/company-admin/compounds` |
| PUT  | `/api/company-admin/compounds/{id}` |
| DELETE | `/api/company-admin/compounds/{id}?force=bool` |
| GET  | `/api/company-admin/compounds/{id}/users` |
| POST | `/api/company-admin/compounds/{id}/users` |

## 🔗 Compound Invites (self-registration)

| Method | Endpoint | Auth? |
|---|---|---|
| POST | `/api/compound-invites` | Yes (admin) |
| GET  | `/api/compound-invites?compound_id=X` | Yes |
| DELETE | `/api/compound-invites/{id}` | Yes |
| GET  | `/api/compound-invites/token/{token}` | **Public** |
| POST | `/api/compound-invites/token/{token}/accept` | **Public** |

> Use the public endpoints for in-app QR scanning: scan the QR on a HomeMe invite poster → deep link to `yourapp://join/{token}` → fetch + show form → register.

## 🔔 Alerts Dashboard

| Method | Endpoint |
|---|---|
| GET  | `/api/alerts/dashboard` → `{alerts[], summary, by_type}` |
| GET  | `/api/sidebar-alerts/companies` (owner badges) |

## 📢 Advertiser Portal

| Method | Endpoint |
|---|---|
| POST | `/api/advertiser/register` (public) |
| GET/POST/PUT/DELETE | `/api/advertiser/ads` |
| POST | `/api/advertiser/ads/{id}/pay` (Stripe) |
| GET  | `/api/advertiser/ads/{id}/stats` |

---

## 🌐 Dart HTTP Client Example

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class ApiClient {
  static const String baseUrl = 'https://profile-nav-debug.preview.emergentagent.com';
  static String? token;

  static Map<String, String> get headers => {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  };

  static Future<dynamic> login(String username, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: headers,
      body: json.encode({'username': username, 'password': password}),
    );
    if (res.statusCode == 200) {
      final data = json.decode(res.body);
      token = data['access_token'];
      return data['user'];
    }
    throw Exception(json.decode(res.body)['detail'] ?? 'Login failed');
  }

  static Future<dynamic> get(String path) async {
    final res = await http.get(Uri.parse('$baseUrl$path'), headers: headers);
    if (res.statusCode == 200) return json.decode(res.body);
    throw Exception('API error: ${res.statusCode}');
  }
}
```

## 📡 WebSocket (Real-time)

- Endpoint: `wss://<base>/api/ws/{compound_id}?token=<JWT>`
- Messages: `{type: 'notification'|'chat'|'gate_event', data: {...}}`
