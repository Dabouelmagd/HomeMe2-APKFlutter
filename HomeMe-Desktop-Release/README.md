# HomeMe Desktop App

نظام إدارة المجتمعات السكنية - تطبيق سطح المكتب  
Community Management Platform - Desktop Application

## المميزات | Features

- 🏠 **إدارة المجتمعات السكنية** - Community Management
- 🌐 **دعم متعدد اللغات** - Multi-language Support (العربية, English, Français)
- 💳 **إدارة مالية متقدمة** - Advanced Financial Management  
- 🔔 **نظام إشعارات فوري** - Real-time Notifications
- 📱 **تصميم متجاوب** - Responsive Design
- 🔒 **نظام صلاحيات متقدم** - Advanced Permission System

## التثبيت | Installation

### تحميل التطبيق | Download App
1. قم بتحميل ملف `HomeMe-Setup-1.0.0.exe` من مجلد `dist`
2. شغل الملف كمدير (Run as Administrator) 
3. اتبع تعليمات التثبيت
4. شغل التطبيق من سطح المكتب أو قائمة Start

### متطلبات النظام | System Requirements
- **نظام التشغيل**: Windows 10/11 (64-bit)
- **الذاكرة**: 4 GB RAM (مُستحسن 8 GB)
- **مساحة القرص**: 200 MB للتثبيت
- **الإنترنت**: مطلوب للاستخدام

## التطوير | Development

### إعداد البيئة | Environment Setup
```bash
# تثبيت Dependencies
npm install

# تشغيل في وضع التطوير
npm start

# بناء للتوزيع
npm run dist
```

### البناء للمنصات المختلفة | Build for Different Platforms
```bash
# Windows
npm run build:win

# macOS  
npm run build:mac

# Linux
npm run build:linux
```

## الاستخدام | Usage

### الدخول الأول | First Login
1. افتح التطبيق
2. استخدم بيانات الدخول:
   - **المستخدم**: admin
   - **كلمة المرور**: admin123
3. اختر لغة الواجهة من أعلى اليمين

### الميزات الرئيسية | Main Features

#### إدارة المجمع | Compound Management
- إضافة وإدارة الوحدات السكنية
- تسجيل المقيمين والأسر
- إدارة الخدمات والمرافق

#### الإدارة المالية | Financial Management  
- تتبع المدفوعات والفواتير
- تقارير مالية شاملة
- إشعارات الدفع المستحقة

#### إدارة الضيوف | Guest Management
- نظام دعوة الضيوف
- رموز QR للدخول
- تتبع الزيارات

#### الصيانة | Maintenance System
- طلبات الصيانة
- تتبع حالة الطلبات  
- جدولة الأعمال

## الدعم الفني | Technical Support

### المشاكل الشائعة | Common Issues

**🔌 مشكلة الاتصال بالإنترنت**
- تأكد من اتصال الإنترنت
- تحقق من إعدادات Firewall
- أعد تشغيل التطبيق

**🖼️ مشاكل العرض**
- استخدم Ctrl+0 لإعادة تعيين التكبير
- جرب Ctrl+R لإعادة التحميل
- أعد تشغيل التطبيق

**🌐 تغيير اللغة**
- استخدم القائمة أعلى اليمين
- التطبيق يدعم العربية والإنجليزية والفرنسية
- يحفظ التطبيق اختيار اللغة تلقائياً

### تقرير الأخطاء | Bug Reports
إذا واجهت أي مشاكل، يرجى تقديم تقرير يحتوي على:
- وصف المشكلة
- خطوات إعادة إنتاج المشكلة  
- لقطة شاشة إن أمكن
- إصدار التطبيق

## معلومات الإصدار | Version Information

- **الإصدار الحالي**: 1.0.0
- **تاريخ الإصدار**: 2025
- **المطور**: HomeMe Team
- **الترخيص**: MIT License

## الاختصارات | Shortcuts

| الاختصار | الوظيفة | Shortcut | Function |
|----------|---------|-----------|-----------|
| Ctrl+H | الصفحة الرئيسية | Ctrl+H | Home Page |
| Ctrl+R | إعادة التحميل | Ctrl+R | Reload |
| Ctrl+Q | إغلاق التطبيق | Ctrl+Q | Quit App |
| Ctrl++ | تكبير | Ctrl++ | Zoom In |
| Ctrl+- | تصغير | Ctrl+- | Zoom Out |
| Ctrl+0 | حجم طبيعي | Ctrl+0 | Reset Zoom |

---

📧 **للدعم الفني**: support@homeme.com  
🌐 **الموقع الإلكتروني**: https://homeme.com  
📱 **التطبيق المحمول**: متوفر قريباً

**HomeMe Team © 2025**