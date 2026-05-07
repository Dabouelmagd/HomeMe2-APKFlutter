# Latest Changelog

## Iter 125 — May 7, 2026

**Title:** Plan Sync + Enhanced Feature Gates

**Changes — ما الجديد:**

- ✅ توحيد الخطط السعرية: حدود السكان والمجمعات تتطابق 100% بين الواجهة والـ Backend
- 🔒 الميزات المقفلة دلوقتي تظهر **بلون رمادي فاتح** + شارة "🔒 ترقية" بدل ما تختفي
- 🎨 Modal احترافي عند الضغط على ميزة مقفلة — يعرض خطتك الحالية والمطلوبة + زر مباشر للترقية
- 🌐 ترجمة كاملة لصفحة التحليلات (Analytics) للعربي — لا مزيد من "Run engagement campaigns"
- 🛡️ إصلاح Popup التحديثات: يظهر مرة واحدة فقط بعد deploy جديد
- ⚡ تحسين أداء `/api/search/saved` (من 13 ثانية إلى 0.14 ثانية)
- 📧 إيقاف bounce emails من smoke tests
- 🔐 إصلاح البصمة WebAuthn

---

## Iter 124 — May 7, 2026

**Title:** UX Polish + Performance Fixes + Login Speed

- 🚀 تسجيل الدخول أسرع 30 ضعفاً
- 🔔 صفحة التنبيهات بتصميم احترافي موحد
- 🔐 إصلاح البصمة (WebAuthn)
- 📋 دليل التشغيل بنافذة منبثقة جذابة
- 📢 الإعلان في صفحة تسجيل الدخول أكبر وأوضح
- 🖼️ صور الإعلانات تظهر كاملة بدون قص
- 🎨 توحيد تصميم 35+ صفحة بنفس النمط الأنيق
- 📝 صفحة التقييمات الحقيقية
- 🌍 كشف العملة تلقائياً
- ⭐ Schema.org SEO
- 🏢 لوجو خاص للشركة والمجمعات
- 💰 توحيد الأسعار
- ♿ تحسينات Accessibility

---

## Iter 116 — Feb 6, 2026

**Title:** Pricing Fixes + GeoIP Currency + HomePage Refactor + Portfolio PDF Auto-Schedule

**Changes:**
1. ✅ Fixed old pricing in residential & company comparison tables.
2. ✅ Added EGP/USD + Monthly/Yearly toggles to the company plans section.
3. ✅ Removed fake stats from CustomerTestimonialsCarousel.
4. ✅ Added GeoIP-based currency auto-detection via timezone.
5. ✅ Refactored HomePage.js from 1717 → 1064 lines into homepage/* modules.
6. ✅ Added Company Portfolio PDF auto-generation to monthly_reports_scheduler.

---
