# HomeMe Desktop Application - دليل النشر

## 📦 الملفات الجاهزة للنشر | Ready-to-Deploy Files

### ✅ 1. التطبيق المحمول (Portable Application)
**الملف**: `dist/HomeMe-Desktop-v1.0.0-Portable.zip` (105 MB)

**المحتويات**:
- ✅ HomeMe.exe - التطبيق الرئيسي
- ✅ Start-HomeMe.bat - ملف بدء التشغيل
- ✅ README.txt - دليل الاستخدام
- ✅ جميع المكتبات المطلوبة

**طريقة الاستخدام**:
1. استخراج الملف المضغوط
2. تشغيل `Start-HomeMe.bat`
3. أو تشغيل `HomeMe.exe` مباشرة

---

### ✅ 2. ملفات التطبيق الخام (Raw Application)
**المجلد**: `dist/win-unpacked/` (253 MB)

**الملف الرئيسي**: `HomeMe.exe`

**الاستخدام**: للمطورين أو النشر المخصص

---

## 🔧 إنشاء Installer مع نافذة تثبيت

### الخيار 1: Windows Batch Installer
```bash
# في نظام Windows
cd desktop-app
create-setup.bat
```

**النتيجة**:
- مجلد `dist/HomeMe-Setup/`
- ملف `Setup-HomeMe.bat` - معالج تثبيت تفاعلي
- إنشاء اختصارات تلقائية
- دعم اختيار مجلد التثبيت

### الخيار 2: NSIS Installer (مُستحسن)
```bash
# تثبيت NSIS (على Windows)
# إنشاء .exe installer احترافي
npm run build:installer-nsis
```

### الخيار 3: Inno Setup
```bash
# استخدام Inno Setup لإنشاء installer احترافي
npm run build:installer-inno
```

---

## 🌐 إعداد URL الخادم

### تحديث URL الإنتاج
في ملف `src/main.js`:

```javascript
const APP_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-domain.com'  // 👈 غيّر هذا للدومين الفعلي
  : 'http://localhost:3000';
```

### متغيرات البيئة
```bash
# للإنتاج
NODE_ENV=production
HOMEME_SERVER_URL=https://your-homeme-domain.com

# للتطوير  
NODE_ENV=development
HOMEME_SERVER_URL=http://localhost:3000
```

---

## 📋 مواصفات التطبيق

### معلومات أساسية
- **الاسم**: HomeMe Desktop
- **الإصدار**: 1.0.0
- **المنصة**: Windows x64
- **الحجم**: ~105-253 MB
- **النوع**: Electron Web App Wrapper

### متطلبات النظام
- **نظام التشغيل**: Windows 10/11 (64-bit)
- **الذاكرة**: 4 GB RAM (مُستحسن 8 GB)
- **الإنترنت**: ✅ مطلوب (Web App Wrapper)
- **مساحة القرص**: 300 MB

### الميزات
- ✅ واجهة مكتبية احترافية
- ✅ دعم متعدد اللغات (العربية، الإنجليزية، الفرنسية)
- ✅ نافذة مخصصة مع قوائم
- ✅ اختصارات لوحة المفاتيح
- ✅ إدارة الزووم والعرض
- ✅ حماية من الروابط الخارجية
- ✅ رسائل خطأ مخصصة

---

## 🚀 خيارات النشر

### 1. نشر مباشر (Direct Distribution)
```
📁 HomeMe-Desktop-v1.0.0-Portable.zip
├── 📄 HomeMe.exe
├── 📄 Start-HomeMe.bat
├── 📄 README.txt
└── 📁 (مكتبات أخرى)
```

### 2. نشر عبر موقع ويب
```html
<a href="/downloads/HomeMe-Desktop-v1.0.0-Portable.zip" 
   download="HomeMe-Desktop.zip">
   تحميل HomeMe لسطح المكتب (105 MB)
</a>
```

### 3. نشر عبر GitHub Releases
```bash
# إضافة للـ GitHub Release
gh release create v1.0.0 \
  dist/HomeMe-Desktop-v1.0.0-Portable.zip \
  --title "HomeMe Desktop v1.0.0" \
  --notes "أول إصدار من تطبيق HomeMe لسطح المكتب"
```

---

## 🔒 الأمان والتوقيع

### Code Signing (مُستحسن للإنتاج)
```javascript
// في package.json
"win": {
  "certificateFile": "path/to/certificate.p12",
  "certificatePassword": "certificate-password",
  "sign": true
}
```

### Digital Signature
- احصل على شهادة Code Signing
- وقّع الملف التنفيذي
- يمنع تحذيرات Windows SmartScreen

---

## 📈 تتبع الاستخدام

### Analytics Integration
```javascript
// في main.js
const { app } = require('electron');

app.on('ready', () => {
  // تتبع بدء التشغيل
  analytics.track('app_launched', {
    version: app.getVersion(),
    platform: process.platform
  });
});
```

### Auto-Updates
```javascript
// استخدام electron-updater
const { autoUpdater } = require('electron-updater');

autoUpdater.checkForUpdatesAndNotify();
```

---

## 🛠️ استكمال التطوير

### بناء إصدارات جديدة
```bash
# تحديث الإصدار
npm version patch  # 1.0.1
npm version minor  # 1.1.0  
npm version major  # 2.0.0

# بناء التطبيق
npm run dist

# إنشاء installer
node create-installer.js
```

### إضافة ميزات جديدة
1. تحديث `src/main.js`
2. تحديث `package.json` 
3. بناء واختبار
4. نشر الإصدار الجديد

---

## 📞 الدعم الفني

### معلومات الاتصال
- **البريد الإلكتروني**: support@homeme.com
- **الموقع**: https://homeme.com
- **التوثيق**: https://docs.homeme.com

### تقرير الأخطاء
```javascript
// إضافة crash reporting
const { crashReporter } = require('electron');

crashReporter.start({
  productName: 'HomeMe',
  companyName: 'HomeMe Team',
  submitURL: 'https://your-crash-server.com/crashes',
  uploadToServer: true
});
```

---

## ✅ Checklist النشر النهائي

- [ ] تحديث URL الخادم للإنتاج
- [ ] اختبار التطبيق على Windows نظيف
- [ ] التأكد من عمل جميع الميزات
- [ ] تحديث معلومات الإصدار
- [ ] إنشاء ملفات التوزيع
- [ ] اختبار عملية التثبيت
- [ ] إعداد صفحة التحميل
- [ ] توثيق طريقة الاستخدام
- [ ] تحضير مواد التسويق
- [ ] إطلاق الإصدار! 🚀

---

**HomeMe Team © 2025**  
*Building better communities, one app at a time* 🏠