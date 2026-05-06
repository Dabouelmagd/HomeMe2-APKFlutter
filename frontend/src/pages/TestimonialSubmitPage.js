import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * TestimonialSubmitPage — public form for anyone to share their review.
 * Submissions are saved with status=pending and wait for owner moderation.
 */
const TestimonialSubmitPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    role: '',
    stars: 5,
    comment: '',
    email: '',
    company_name: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const canSubmit = () =>
    form.name.trim().length >= 2 &&
    form.comment.trim().length >= 10 &&
    form.stars >= 1 && form.stars <= 5;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit()) {
      toast.error('الاسم والتقييم مطلوبان (التعليق ١٠ أحرف على الأقل)');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role.trim() || null,
        stars: form.stars,
        comment: form.comment.trim(),
        email: form.email.trim() || null,
        company_name: form.company_name.trim() || null,
      };
      await axios.post(`${API}/testimonials/submit`, payload);
      toast.success('شكراً لك! سيُراجع تقييمك قبل النشر');
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل الإرسال');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 flex items-center justify-center p-6" dir="rtl" data-testid="testimonial-thanks-page">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center border border-violet-100">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>
            شكراً لتقييمك!
          </h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            تم استلام رأيك بنجاح، وسيُراجع من قبل إدارة المنصة خلال ٢٤–٤٨ ساعة قبل النشر على الصفحة الرئيسية.
          </p>
          <div className="flex flex-col gap-2">
            <Link to="/" className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all" data-testid="back-to-home">
              العودة للرئيسية
            </Link>
            <button
              onClick={() => {
                setForm({ name: '', role: '', stars: 5, comment: '', email: '', company_name: '' });
                setSubmitted(false);
              }}
              className="px-6 py-3 text-violet-600 border-2 border-violet-200 rounded-xl font-bold text-sm hover:bg-violet-50 transition-all"
              data-testid="submit-another"
            >
              إرسال تقييم آخر
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 py-12 px-4" dir="rtl" data-testid="testimonial-submit-page">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold mb-3">
            ⭐ شارك تجربتك
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>
            رأيك يهمّنا
          </h1>
          <p className="text-gray-600 text-sm max-w-lg mx-auto">
            ساعد غيرك من أصحاب المجمعات والشركات باختيار المنصة المناسبة — شارك تجربتك الحقيقية مع HomeMe.
          </p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-3xl shadow-xl border border-violet-100 p-6 md:p-8 space-y-5" data-testid="testimonial-form">
          {/* Stars */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">تقييمك العام <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-1" data-testid="stars-selector">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => update('stars', n)}
                  onMouseEnter={() => setHoveredStar(n)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110"
                  data-testid={`star-${n}`}
                  aria-label={`${n} نجوم`}
                >
                  {n <= (hoveredStar || form.stars) ? (
                    <StarIcon className="w-10 h-10 text-amber-400 drop-shadow-sm" />
                  ) : (
                    <StarOutline className="w-10 h-10 text-gray-300" />
                  )}
                </button>
              ))}
              <span className="mr-3 text-sm font-bold text-gray-600">{form.stars} / 5</span>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">اسمك <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="مثال: مهندس أحمد محمد"
              maxLength={80}
              required
              className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none transition"
              data-testid="name-input"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">صفتك (اختياري)</label>
            <input
              type="text"
              value={form.role}
              onChange={e => update('role', e.target.value)}
              placeholder="مثال: مدير كمبوند، ساكن، مدير شركة إدارة"
              maxLength={80}
              className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none transition"
              data-testid="role-input"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">اسم الشركة/المجمع (اختياري)</label>
            <input
              type="text"
              value={form.company_name}
              onChange={e => update('company_name', e.target.value)}
              placeholder="مثال: شركة الفجر العقارية"
              maxLength={120}
              className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none transition"
              data-testid="company-input"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">
              تقييمك <span className="text-red-500">*</span>
              <span className="text-xs text-gray-400 font-normal mr-1.5">({form.comment.length}/1000)</span>
            </label>
            <textarea
              value={form.comment}
              onChange={e => update('comment', e.target.value)}
              placeholder="اكتب تجربتك مع HomeMe بالتفصيل... ما الميزات اللي أعجبتك؟ ما الذي ساعدك في تبسيط عملك؟ (١٠ أحرف على الأقل)"
              maxLength={1000}
              rows={5}
              required
              className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none transition leading-loose resize-y"
              data-testid="comment-input"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">بريدك الإلكتروني (اختياري)</label>
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="لن ينشر — للتواصل معك في حال الحاجة فقط"
              maxLength={120}
              className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none transition"
              data-testid="email-input"
            />
            <p className="text-[11px] text-gray-400 mt-1">بريدك سيبقى خاصاً — لن نعرضه علناً.</p>
          </div>

          {/* Submit */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 px-5 py-3 text-gray-700 border-2 border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
              data-testid="cancel-btn"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting || !canSubmit()}
              className="flex-1 px-5 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-lg text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="submit-testimonial-btn"
            >
              {submitting ? '⏳ جاري الإرسال...' : '🚀 إرسال التقييم'}
            </button>
          </div>

          <p className="text-[11px] text-gray-400 text-center pt-2 border-t border-gray-100">
            بإرسال التقييم، أنت توافق على نشره علناً على الصفحة الرئيسية بعد موافقة الإدارة.
          </p>
        </form>
      </div>
    </div>
  );
};

export default TestimonialSubmitPage;
