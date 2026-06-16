# Test Credentials

## App Owner (مالك التطبيق)
- Username: Owner_homeme
- Password: Dalia1234@
- Email: dalia@datalifeai.com
- Full Name: Dalia Abou El Magd
- Role: app_owner
- **🔒 2FA إجباري (Feature #54)**: عند أول تسجيل دخول بعد iter147، التطبيق يطلب إعداد Google Authenticator. للاختبار الـAutomated، استخدم Secret: `JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP` (مفعَّل تلقائياً عبر pytest fixtures في `test_iter145/146`).

## Super Admin (مساعد مالك التطبيق — بدون صلاحيات مالية)
- Username: superadmin
- Password: SuperAdmin2024!
- Email: superadmin@homeme.app
- Role: super_admin
- **🔒 2FA إجباري (Feature #54)**: مثل app_owner.

## Company Admin (مدير الشركة)
- Username: testcompany2
- Password: Company123!
- Role: company_admin
- company_id: ab8e7501-964c-4424-859f-af16ba8ad2e5 (شركة المعمار الحديث)
- Plan: company_enterprise (كل الـ feature_flags مفعّلة)
- Compounds: 2 (كمبوند مدينتي + كمبوند الرحاب)
- Dashboard: CompanyAdminDashboard (auto-routed on login)

## Company Admin — خطة مجانية (لاختبار Onboarding/feature gating)
- Username: newco_admin
- Password: NewCo123!
- Role: company_admin
- Company: شركة الاختبار للأونبوردنج (compound_ids: [] فارغة)
- Plan: starter (مجاني — pdf_excel_exports = false)
- يعرض Onboarding Wizard فوراً عند الدخول

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

## Secondary Test Advertiser (for end-to-end CRM/ads flow)
- Username: adtest_fork
- Password: AdTest123!
- Email: adtest_fork@test.com
- Role: advertiser

## Test Resident (for timeline/CRM tag/note testing)
- Username: test
- Password: test123
- user_id: d6012878-6794-4d9a-8196-8577da883f5d
- Role: resident
- Compound: 88ad3711-c9ae-45fe-a270-65f4524c071c

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
