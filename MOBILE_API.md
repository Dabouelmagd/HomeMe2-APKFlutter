# HomeMe Flutter Mobile API — Developer Reference

> **Audience:** Flutter / native mobile developers integrating the HomeMe backend.
> **Version:** v1 (Feb 2026) — Mobile Auth Feature #55.
> **Language:** API messages are returned in **Arabic** (UI-ready). Error structure is stable across roles.

---

## 1. Environments

| Env | Base URL | Notes |
|---|---|---|
| **Production** | `https://homemeapp.net` | Live customer traffic |
| **Preview / Staging** | `https://profile-nav-debug.preview.emergentagent.com` | Build / QA only |
| **Local Backend** | `http://localhost:8001` | Direct hit — bypass nginx |

> ✅ **All API endpoints are prefixed with `/api`.** Example: `POST https://homemeapp.net/api/mobile/auth/login`.

---

## 2. Authentication Model

### 2.1 Token type
- **JWT Bearer**, signed HS256, payload `{ "sub": user_id, "exp": <epoch> }`.
- **Default TTL:** 24 hours.
- Header required on every authenticated call:
  ```
  Authorization: Bearer <access_token>
  ```

### 2.2 Mobile auth flow (recommended for Flutter)

```
┌──────────────┐       POST /api/mobile/auth/register
│   Flutter    │──────────────────────────────────────────► access_token (immediate)
│   app        │                                            otp_required = true
│              │       POST /api/mobile/auth/verify-otp
│              │──────────────────────────────────────────► email_verified = true
└──────────────┘
```

* `access_token` is returned **immediately** at register time so the app can hit profile/dashboard endpoints right away — but the user object will carry `email_verified=false` until the OTP is confirmed. Use that flag to render a yellow banner / blocking screen if your product wants email-gated flows.
* The web app uses an email **magic link**; mobile uses a **6-digit OTP** delivered to the same SMTP system.

### 2.3 Two-Factor Authentication (TOTP / Google Authenticator)

| Role | 2FA required? |
|---|---|
| `app_owner`, `super_admin` | **Mandatory** (enforced server-side) |
| `company_admin`, `compound_admin`, `resident`, others | Optional (user may enable from settings) |

If the login response shape contains `two_factor_setup_required: true`, the app must take the user through the enrolment flow (`/api/2fa/setup-enroll` → `/api/2fa/verify-enroll`).
If the login response shape contains `two_factor_required: true`, the app must prompt for the 6-digit TOTP code and call `/api/2fa/verify-login`.

---

## 3. Mobile Auth Endpoints (`/api/mobile/auth/*`)

### 3.1 `POST /api/mobile/auth/register` — Sign up

**Roles supported:** `resident`, `compound_admin`, `company_admin`.

**Request body:**
```json
{
  "username": "ahmad_99",
  "email": "ahmad@example.com",
  "password": "StrongPass1A",
  "full_name": "أحمد محمد",
  "phone": "+201001234567",
  "role": "resident",
  "compound_id": "REQUIRED if role=resident",
  "unit_number": "A-101  (REQUIRED if role=resident)",
  "company_name": "REQUIRED if role=company_admin",
  "device_token": "fcm_token_optional",
  "device_info": {
    "platform": "ios | android | web",
    "model": "iPhone 15 Pro",
    "os_version": "17.4",
    "app_version": "1.0.0"
  },
  "referral_code": "CO-AB12  (optional, only for company_admin)"
}
```

**Password policy:** ≥8 chars, must contain upper + lower + digit.

**Success response (201):**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "username": "ahmad_99",
    "email": "ahmad@example.com",
    "full_name": "أحمد محمد",
    "phone": "+201001234567",
    "role": "resident",
    "compound_id": "uuid",
    "company_id": null,
    "unit_number": "A-101",
    "email_verified": false,
    "two_factor_enabled": false
  },
  "company_id": null,
  "otp_required": true,
  "otp_sent": true,
  "otp_ttl_minutes": 15,
  "message": "تم إنشاء الحساب. أرسلنا رمز التفعيل إلى بريدك الإلكتروني."
}
```

**Errors:**
| Status | Cause |
|---|---|
| `400` | Weak password / missing role-specific field (`compound_id`, `unit_number`, `company_name`) |
| `404` | `compound_id` not found (resident only) |
| `409` | username or email already exists |

---

### 3.2 `POST /api/mobile/auth/verify-otp` — Confirm email

**Request:**
```json
{ "email": "ahmad@example.com", "otp": "123456" }
```

**Success (200):**
```json
{
  "verified": true,
  "user": { "...same shape as register", "email_verified": true },
  "message": "✅ تم تفعيل بريدك الإلكتروني بنجاح"
}
```

**Errors:**
| Status | Cause |
|---|---|
| `400` | Wrong code (`detail` tells how many attempts remain) |
| `404` | Email not registered |
| `410` | OTP expired (>15 minutes since issue) |
| `429` | Too many failed attempts (≥5). Must call `resend-otp`. |

---

### 3.3 `POST /api/mobile/auth/resend-otp` — Re-issue code

**Request:** `{ "email": "ahmad@example.com" }`

**Behaviour:**
- Returns generic message regardless of whether the email exists (anti-enumeration).
- Enforces a **60-second cooldown** between sends.

**Success (200):**
```json
{ "sent": true, "otp_ttl_minutes": 15, "message": "أرسلنا كوداً جديداً إلى بريدك الإلكتروني" }
```

**Errors:** `429` if cooldown not elapsed — `detail` contains seconds remaining.

---

### 3.4 `POST /api/mobile/auth/login` — Sign in

**Request:**
```json
{
  "username": "ahmad_99",
  "password": "StrongPass1A",
  "device_token": "optional fcm token",
  "device_info": { "platform": "ios", "model": "...", "os_version": "...", "app_version": "..." }
}
```

**Possible responses:**

A. **Plain success (most users):**
```json
{ "access_token": "...", "token_type": "bearer", "user": { ... } }
```

B. **2FA challenge** (`user.two_factor_enabled == true`):
```json
{ "two_factor_required": true, "temp_token": "...", "ttl_minutes": 5 }
```
→ Caller must now POST `/api/2fa/verify-login` with `{ temp_token, code }`.

C. **Mandatory 2FA enrolment** (only `app_owner`/`super_admin` without 2FA set up):
```json
{
  "two_factor_setup_required": true,
  "setup_token": "...",
  "ttl_minutes": 10,
  "role": "super_admin",
  "message": "تفعيل المصادقة الثنائية إلزامي لهذا الحساب"
}
```
→ Caller proceeds with `/api/2fa/setup-enroll` → `/api/2fa/verify-enroll` (returns final `access_token`).

**Errors:** `401` wrong credentials · `403` deactivated account.

---

### 3.5 `GET /api/mobile/auth/me` — Whoami

Returns the same compact `user` object. Useful as an app-launch sanity check that the saved token is still valid.

```bash
GET /api/mobile/auth/me
Authorization: Bearer <access_token>
```

---

## 4. Two-Factor Endpoints (`/api/2fa/*`)

These are shared with the web app. Mobile uses the same endpoints.

| Endpoint | Body | Returns |
|---|---|---|
| `POST /api/2fa/setup-enroll` | `{ setup_token }` | `{ secret, qr_code_b64, otpauth_url }` |
| `POST /api/2fa/verify-enroll` | `{ setup_token, code }` | `{ access_token, user, backup_codes: [...] }` |
| `POST /api/2fa/verify-login` | `{ temp_token, code }` | `{ access_token, user }` |
| `GET /api/2fa/status` | _(authed)_ | `{ enabled, backup_codes_remaining }` |
| `POST /api/2fa/disable` | `{ password, code }` | `{ disabled: true }` |

The `qr_code_b64` is a base64 PNG; render it in `Image.memory(base64Decode(qr_code_b64))`.

---

## 5. Core Mobile Endpoints — Cheat Sheet

> All endpoints below require `Authorization: Bearer <token>`. Role gates handled server-side; the app does not need to send role explicitly.

### 5.1 Profile / Identity
- `GET /api/auth/me` — full user document (richer than `/mobile/auth/me`)
- `GET /api/feature-flags/me` — which features the current plan unlocks
- `GET /api/users/profile` / `PUT /api/users/profile`

### 5.2 Dashboards
- `GET /api/dashboard/resident` — KPIs for resident home screen
- `GET /api/dashboard/admin` — KPIs for compound/company admin
- `GET /api/dashboard/kpis?range=30d` — generic KPI bundle

### 5.3 Notifications
- `GET /api/notifications?limit=50&unread_only=false`
- `GET /api/notifications/my` (alias used by mobile)
- `PATCH /api/notifications/{id}/read`
- `PATCH /api/notifications/mark-all-read`
- `GET /api/notifications/preferences` / `PUT /api/notifications/preferences`

### 5.4 Maintenance
- `POST /api/maintenance/requests` — submit ticket
  ```json
  { "title": "...", "description": "...", "category": "electricity|plumbing|...", "priority": "low|medium|high|urgent" }
  ```
- `GET /api/maintenance/requests?status=open` — list (auto-scoped)
- `PATCH /api/maintenance/requests/{request_id}/status` — admin/security only
- `GET /api/maintenance/stats`

### 5.5 Complaints
- `POST /api/complaints` — submit
- `GET /api/complaints` — list
- `PUT /api/complaints/{complaint_id}/respond` — admin reply

### 5.6 Announcements
- `GET /api/announcements?limit=20`
- `POST /api/announcements` — admin only

### 5.7 Facilities & Bookings
- `GET /api/facilities` — list of pool / gym / hall in the compound
- `GET /api/facilities/{facility_id}/availability?date=YYYY-MM-DD`
- `POST /api/facility-bookings` — `{ facility_id, start_time, end_time, notes? }`
- `GET /api/facility-bookings?user_id=me`
- `POST /api/facility-bookings/{booking_id}/cancel`

### 5.8 Visitors / Guests
- `POST /api/guests` — pre-register a visitor; returns QR-code payload
- `GET /api/guests/{guest_id}/qr-code` — PNG bytes
- `POST /api/guests/scan-qr` — security gate scan (security role)
- `PATCH /api/guests/{guest_id}/checkin` · `/checkout`

### 5.9 Invoices & Payments
- `GET /api/invoices/my` — current resident's bills
- `GET /api/invoices/{invoice_id}/pdf` — PDF stream
- `POST /api/payments/create-session` — Stripe checkout URL
- `POST /api/payments/paypal/create-order` · `/paypal/capture/{order_id}`
- `GET /api/payments/methods` — list of saved methods

### 5.10 Family Management (resident only)
- `GET /api/family-members` — list of own family
- `POST /api/family-members` — add member
- `POST /api/family-invites` — invite extra member by email
- `POST /api/family-members/{member_id}/qr-code` — gate access

### 5.11 Polls / Surveys
- `GET /api/polls` — open polls in compound
- `POST /api/polls/{poll_id}/vote` — `{ option: "..." }`
- `GET /api/polls/{poll_id}/results`

### 5.12 Documents
- `GET /api/documents` — list (folders, contracts, etc.)
- `GET /api/documents/{document_id}` — metadata + download URL
- `POST /api/documents/{document_id}/upload` — multipart file

### 5.13 Chat / Messages
- `GET /api/chats` · `POST /api/chats`
- `GET /api/chats/{chat_id}/messages` (paginate with `?before=<iso>&limit=50`)
- `POST /api/chats/{chat_id}/messages` — `{ text }`
- `POST /api/chats/{chat_id}/upload` — multipart attachment
- `POST /api/chats/{chat_id}/voice` — voice message
- `PUT /api/chats/{chat_id}/read` — mark as read

### 5.14 Smart Devices
- `GET /api/smart-devices` — list of paired devices
- `POST /api/smart-devices/{device_id}/command` — `{ action, params }`
- `POST /api/smart-devices/natural-command` — `{ text: "افتح باب المرآب" }` (Gemini-powered)

### 5.15 AI Assistant (Pro / Premium plans only)
- `POST /api/ai-assistant/chat` — `{ message, session_id? }` → streamed assistant reply
- `GET /api/ai-assistant/history?session_id=...`
- `GET /api/ai-assistant/usage` — daily quota status

### 5.16 Compound metadata
- `GET /api/compounds/{compound_id}` — public info
- `GET /api/compounds/{compound_id}/branding` — logo / colours
- `GET /api/compounds/{compound_id}/services` — list of paid services

### 5.17 Ratings
- `POST /api/ratings` — `{ target_type, target_id, stars, comment }`
- `GET /api/ratings/target/{target_type}/{target_id}` — aggregated

---

## 6. Error Envelope

FastAPI standard:
```json
{ "detail": "human readable Arabic message" }
```
For 422 validation errors:
```json
{
  "detail": [
    { "loc": ["body","password"], "msg": "...", "type": "value_error" }
  ]
}
```

> ⚠️ Always read `response.statusCode` first. Status-code drives flow; the body is for UX text.

---

## 7. Security

- **Rate limiting:** login is throttled at **5 attempts / 15 minutes / username**. A 6th attempt → `HTTP 429`.
- **Auto-Ban:** any IP with **20+ failed logins / hour** is banned for 24h. Banned IPs see `HTTP 429` on `/api/auth/login` and `/api/mobile/auth/login`.
- **2FA enforcement:** see §2.3.
- **Anti-enumeration:** `/resend-otp`, `/forgot-password` return the same response whether the email is registered or not.

---

## 8. WebSocket (real-time)

Path: `/ws/notifications?token=<access_token>` (same JWT, query-string).

Server pushes JSON frames:
```json
{ "type": "notification", "data": { "id": "...", "message": "...", "created_at": "..." } }
{ "type": "chat_message", "data": { "chat_id": "...", "message": { ... } } }
{ "type": "ping" }            // keepalive, expect every 30s
```

Send `{"type":"pong"}` to keep the connection alive.

---

## 9. Roles & Permissions

| Role | What they can access |
|---|---|
| `resident` | Their own family, invoices, complaints, bookings, polls, compound docs |
| `family_member` | Subset of resident — view-only by default |
| `security` | Guests check-in/out, QR scans, gate logs |
| `compound_admin` | Everything inside their `compound_id` |
| `company_admin` | All compounds under `company_id` |
| `super_admin` | All companies + global moderation |
| `app_owner` | Everything (revenue, billing, system) |

RBAC is enforced server-side. The mobile app may hide UI per role, but **do not** depend on client-side checks for security.

---

## 10. Migration / Upgrades

When you bump `app_version`, set the header `X-App-Version: 1.0.42` on every request. The backend logs it and the Super Admin can correlate crashes / errors with versions.

---

## 11. Quick start — cURL

```bash
# 1. Register a resident
curl -X POST https://homemeapp.net/api/mobile/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"new_resident",
    "email":"new@example.com",
    "password":"Pass1234A",
    "full_name":"اسم ساكن",
    "phone":"+201001234567",
    "role":"resident",
    "compound_id":"<existing-compound-uuid>",
    "unit_number":"A-101"
  }'

# 2. Verify OTP
curl -X POST https://homemeapp.net/api/mobile/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","otp":"123456"}'

# 3. Authenticated request
curl https://homemeapp.net/api/dashboard/resident \
  -H "Authorization: Bearer <access_token>"
```

---

## 12. Support

Contact the API team (`homeme_residence@datalifeai.com`) for:
- New endpoint requests
- Schema changes (we keep a deprecation window of 60 days)
- Performance issues — please include `X-Request-Id` from the response headers
