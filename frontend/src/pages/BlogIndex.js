import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import useSEO from '../hooks/useSEO';
import { BLOG_POSTS, BLOG_CATEGORIES } from '../content/blogPosts';
import { CalendarIcon, ClockIcon, UserIcon, TagIcon } from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BlogIndex = () => {
  const [category, setCategory] = useState('all');
  const [dbPosts, setDbPosts] = useState([]);

  // Fetch DB-stored posts and merge with hardcoded.
  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API}/blog/posts`)
      .then((res) => {
        if (cancelled) return;
        const normalized = (res.data?.posts || []).map((p) => ({
          ...p,
          readingMinutes: p.reading_minutes || 5,
        }));
        setDbPosts(normalized);
      })
      .catch(() => setDbPosts([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const allPosts = useMemo(() => {
    // DB posts first (newest), then hardcoded (already sorted desc by date)
    const merged = [...dbPosts, ...BLOG_POSTS];
    // De-dup by slug — DB takes priority
    const seen = new Set();
    return merged.filter((p) => {
      if (seen.has(p.slug)) return false;
      seen.add(p.slug);
      return true;
    });
  }, [dbPosts]);

  const filtered = useMemo(() => {
    if (category === 'all') return allPosts;
    return allPosts.filter((p) => p.category === category);
  }, [category, allPosts]);

  // Structured data for the blog listing
  const blogLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'مدوّنة HomeMe — إدارة المجمعات السكنية',
    description: 'مقالات متخصصة في إدارة المجمعات السكنية، الأمن، المالية، والتحوّل الرقمي',
    publisher: {
      '@type': 'Organization',
      name: 'HomeMe',
      url: 'https://homemeapp.net',
    },
    blogPost: allPosts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      datePublished: p.date,
      author: { '@type': 'Person', name: p.author },
      url: `https://homemeapp.net/blog/${p.slug}`,
      image: p.cover,
      description: p.excerpt,
    })),
  }), [allPosts]);

  useSEO({
    title: 'المدوّنة — HomeMe | دليلك في إدارة المجمعات السكنية',
    description:
      'مقالات تعليمية متخصصة في إدارة المجمعات السكنية، حساب رسوم الصيانة، أمن الكمباوندات، رضا السكان، والتحوّل الرقمي. كل ما يحتاجه مدير المجمع الحديث.',
    keywords:
      'إدارة كمباوند, إدارة مجمعات سكنية, رسوم صيانة, أمن سكني, تطبيق كمباوند, إدارة عقارات, رضا السكان',
    canonical: 'https://homemeapp.net/blog',
    og: {
      title: 'مدوّنة HomeMe — دليلك في إدارة المجمعات السكنية',
      description: 'مقالات متخصصة لمديري الكمباوندات والمجمعات السكنية',
      type: 'website',
      url: 'https://homemeapp.net/blog',
    },
    jsonLd: blogLd,
    jsonLdId: 'blog-index',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50" dir="rtl" data-testid="blog-index-page">      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600 text-white py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-block bg-white/15 backdrop-blur px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-white/20">
            مدوّنة HomeMe
          </span>
          <h1 className="text-4xl sm:text-5xl font-black mb-4" style={{ fontFamily: "'Cairo', sans-serif" }}>
            دليلك الكامل في إدارة المجمعات السكنية
          </h1>
          <p className="text-lg text-indigo-100 max-w-2xl mx-auto">
            مقالات عملية مبنية على خبرة حقيقية — للمديرين، المُلاك، والسكان المهتمين بفهم كل تفاصيل الحياة في الكمباوند
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="bg-white border-b border-gray-200 sticky top-0 z-10 backdrop-blur bg-white/90">
        <div className="max-w-5xl mx-auto px-4 py-4 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {BLOG_CATEGORIES.map((c) => (
              <button
                key={c.slug}
                onClick={() => setCategory(c.slug)}
                data-testid={`blog-category-${c.slug}`}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  category === c.slug
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              data-testid={`blog-post-card-${post.slug}`}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 transition-all"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                <img
                  src={post.cover}
                  alt={post.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 right-3 bg-white/90 backdrop-blur text-indigo-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  {post.category}
                </span>
              </div>
              <div className="p-5">
                <h2 className="text-lg font-black text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors leading-snug">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    {post.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {new Date(post.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {post.readingMinutes} دقيقة قراءة
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <TagIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>لا توجد مقالات في هذا التصنيف بعد. عد قريبًا!</p>
          </div>
        )}
      </section>

      {/* Footer CTA */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl font-black text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>
            هل تدير مجمعًا سكنيًا؟
          </h3>
          <p className="text-gray-600 mb-6">
            HomeMe منصة سحابية شاملة تساعدك على تطبيق كل ما قرأت في هذه المقالات — بضغطة زر.
          </p>
          <Link
            to="/"
            data-testid="blog-cta-home"
            className="inline-block bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold px-8 py-3 rounded-xl hover:shadow-lg transition-all"
          >
            تعرّف على المنصة ←
          </Link>
        </div>
      </section>
    </div>
  );
};

export default BlogIndex;
