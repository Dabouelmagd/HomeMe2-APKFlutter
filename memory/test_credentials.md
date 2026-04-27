# Test Credentials

## App Owner (مالك التطبيق)
- Username: Owner_homeme
- Password: Dalia1234@
- Email: dalia@datalifeai.com
- Full Name: Dalia Abou El Magd
- Role: app_owner

## Super Admin (مساعد مالك التطبيق — بدون صلاحيات مالية)
- Username: superadmin
- Password: SuperAdmin2024!
- Email: superadmin@homeme.app
- Role: super_admin
- **ملاحظة:** هذا الحساب يدير كل شيء (مجمعات، مستخدمين، إعلانات، شركات، ترجمات) لكنه **لا يرى أي بيانات مالية** (إيرادات، مصروفات، الإدارة المالية، إيرادات الإعلانات، إيرادات الشركات). الماليات مقصورة على `app_owner` فقط.

## Company Admin (مدير الشركة)
- Username: testcompany2
- Password: Company123!
- Role: company_admin
- company_id: ab8e7501-964c-4424-859f-af16ba8ad2e5 (شركة المعمار الحديث)
- Dashboard: CompanyAdminDashboard (auto-routed on login)

## Test Admin (if created)
- Username: admin
- Password: admin123
- Role: admin

## Security (حارس)
- Username: security
- Password: Security2024!
- Role: security

## Test Advertiser (معلن — للاختبار)
- Username: test_advertiser
- Password: TestAd123!
- Email: test_advertiser@homeme.app
- Full Name: Test Advertiser
- Company: HomeMe QA
- Role: advertiser

## Email (SMTP) — mail.datalifeai.com (Port 465 SSL, Port 993 IMAP)
- **Main / System emails** (welcome, password-reset, invites, daily reports) → `homeme_superadmin@datalifeai.com`
- **Security alerts** (emergency, intrusion) → `homeme_security@datalifeai.com`
- **Support / Technical Support inbox** (receives complaints via `/api/support/contact`) → `homeme_residence@datalifeai.com`
- Passwords are configured in `backend/.env`: `SMTP_PASSWORD`, `SMTP_SECURITY_PASSWORD`, `SMTP_SUPPORT_PASSWORD`

## Payment Integrations
- Stripe: Test key in environment
- PayPal: Client ID starts with: AR3tOJr9moFV4c99gTjx... (sandbox, user-provided)

## Google AdSense
- Publisher ID: ca-pub-5928973437129941
