# Latest Changelog

## Iter 124 — May 7, 2026

**Title:** UX Polish + Performance Fixes + Login Speed

**Changes — ما الجديد للمستخدم:**

- 🚀 تسجيل الدخول أسرع 30 ضعفاً — تجربة فورية
- 🔔 صفحة التنبيهات بتصميم احترافي موحد ومريح للعين
- 🔐 إصلاح البصمة (WebAuthn) — تعمل بكفاءة على الإنتاج
- 📋 دليل التشغيل دلوقتي بنافذة منبثقة جذابة بدل Inline
- 📢 الإعلان في صفحة تسجيل الدخول أكبر وأوضح
- 🖼️ صور الإعلانات تظهر كاملة بدون قص (object-contain)
- 🎨 توحيد تصميم 35+ صفحة بنفس النمط الأنيق (PageHeader موحد)
- ⚡ إصلاح بطء `/api/search/saved` (من 13 ثانية → 0.14 ثانية)
- 📧 إيقاف bounce email من smoke tests الوهمية
- 📝 صفحة التقييمات الحقيقية: شارك رأيك في 30 ثانية
- 🌍 كشف العملة تلقائياً (USD افتراضياً للزوار الدوليين)
- ⭐ Schema.org SEO — Google يعرض النجوم في نتائج البحث
- 🏢 لوجو خاص لشركتك ولكل مجمع — هوية بصرية متكاملة
- 💰 توحيد الأسعار في كل أماكن العرض
- ♿ تحسينات Accessibility (ARIA + ESC + scroll lock)

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
