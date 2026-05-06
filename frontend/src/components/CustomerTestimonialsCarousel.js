import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from '@heroicons/react/24/solid';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Customer Testimonials Carousel — fetches PUBLISHED reviews from the backend.
 * Owners moderate submissions before they appear here (POST /api/testimonials/submit
 * → GET /api/testimonials/published once approved).
 * Users can click "شارك تقييمك" to navigate to /testimonials/submit.
 */
const CustomerTestimonialsCarousel = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axios.get(`${API}/testimonials/published?limit=12`).then(res => {
      if (!alive) return;
      setTestimonials(res.data.testimonials || []);
    }).catch(() => {
      if (!alive) return;
      setTestimonials([]);
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (paused || testimonials.length < 2) return;
    const iv = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(iv);
  }, [paused, testimonials.length]);

  const goPrev = () => setActiveIdx((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  const goNext = () => setActiveIdx((prev) => (prev + 1) % testimonials.length);

  // Avatar color palette — rotate through these for each testimonial
  const AVATAR_COLORS = [
    'from-violet-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-indigo-500 to-blue-600',
    'from-cyan-500 to-sky-600',
  ];
  const initialsOf = (name) => {
    if (!name) return '؟';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}.${parts[1][0]}`;
    return parts[0].slice(0, 2);
  };

  const t = testimonials[activeIdx];

  return (
    <section
      className="py-16 bg-gradient-to-b from-white via-violet-50/30 to-white relative overflow-hidden"
      id="testimonials"
      data-testid="testimonials-section"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Decorative quote marks */}
      <div className="absolute top-8 left-8 text-9xl text-violet-200/40 font-serif select-none">&ldquo;</div>
      <div className="absolute bottom-8 right-8 text-9xl text-violet-200/40 font-serif select-none rotate-180">&ldquo;</div>

      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold mb-3">
            ⭐ شهادات عملائنا
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>
            ماذا يقول عملاؤنا؟
          </h2>
          <Link
            to="/testimonials/submit"
            className="inline-flex items-center gap-2 mt-2 px-5 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-lg hover:shadow-violet-500/30 text-white rounded-xl font-bold text-sm transition-all"
            data-testid="share-testimonial-btn"
          >
            <StarIcon className="w-4 h-4" />
            شارك تقييمك
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">جاري تحميل التقييمات...</div>
        ) : testimonials.length === 0 ? (
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 rounded-3xl p-10 text-center">
            <div className="text-5xl mb-3">💬</div>
            <p className="text-lg font-bold text-gray-900 mb-2">كن أول من يشارك تجربته معنا!</p>
            <p className="text-sm text-gray-600 mb-5">نقدّر آراء عملائنا ونعرضها بفخر على المنصة — تقييمك يساعد غيرك يتخذ القرار الصحيح.</p>
            <Link
              to="/testimonials/submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-lg text-white rounded-xl font-bold text-sm transition-all"
              data-testid="first-testimonial-btn"
            >
              <StarIcon className="w-4 h-4" /> اكتب أول تقييم
            </Link>
          </div>
        ) : (
          <>
            {/* Main testimonial card */}
            <div className="relative max-w-3xl mx-auto">
              <div
                key={activeIdx}
                className="bg-white border-2 border-violet-100 rounded-3xl p-8 md:p-10 shadow-xl animate-in fade-in"
                data-testid={`testimonial-${activeIdx}`}
              >
                <div className="flex justify-center gap-1 mb-4">
                  {Array.from({ length: t.stars || 5 }).map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-amber-400" />
                  ))}
                </div>
                <blockquote className="text-base md:text-lg text-gray-800 text-center leading-loose mb-6 font-medium" style={{ fontFamily: "'Cairo', sans-serif" }}>
                  <span className="text-violet-500 text-3xl mr-1">&ldquo;</span>
                  {t.comment}
                  <span className="text-violet-500 text-3xl mr-1">&rdquo;</span>
                </blockquote>
                {t.company_name && (
                  <div className="flex justify-center mb-5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-700 rounded-full text-xs font-bold">
                      🏢 {t.company_name}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-center gap-3">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${AVATAR_COLORS[activeIdx % AVATAR_COLORS.length]} flex items-center justify-center text-white text-base font-black shadow-md`}>
                    {initialsOf(t.name)}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 text-base">{t.name}</p>
                    {t.role && <p className="text-xs text-gray-500">{t.role}</p>}
                  </div>
                </div>
              </div>

              {testimonials.length > 1 && (
                <>
                  <button onClick={goPrev} className="absolute top-1/2 -translate-y-1/2 right-0 -mr-4 md:-mr-6 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-violet-50 hover:border-violet-300 transition-all" data-testid="testimonial-prev" aria-label="السابق">
                    <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                  </button>
                  <button onClick={goNext} className="absolute top-1/2 -translate-y-1/2 left-0 -ml-4 md:-ml-6 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-violet-50 hover:border-violet-300 transition-all" data-testid="testimonial-next" aria-label="التالي">
                    <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </>
              )}
            </div>

            {testimonials.length > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === activeIdx ? 'w-8 bg-gradient-to-r from-violet-600 to-fuchsia-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                    }`}
                    data-testid={`testimonial-dot-${i}`}
                    aria-label={`عرض الشهادة رقم ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default CustomerTestimonialsCarousel;
