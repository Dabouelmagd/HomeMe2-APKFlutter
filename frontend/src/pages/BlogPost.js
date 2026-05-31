import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import useSEO from '../hooks/useSEO';
import { findPostBySlug, BLOG_POSTS } from '../content/blogPosts';
import InternalAdBanner from '../components/InternalAdBanner';
import CommentSection from '../components/CommentSection';
import { ArrowLongRightIcon, CalendarIcon, ClockIcon, UserIcon, TagIcon } from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Lightweight markdown-to-React renderer.
 * Supports: H2 (##), H3 (###), bold (**text**), bullets (- item), tables (| a | b |),
 * blockquote (>), and paragraphs. Intentionally minimal — no external deps.
 */
const renderMarkdown = (md, midAd) => {
  const lines = md.split('\n');
  const elements = [];
  let i = 0;
  let key = 0;
  let bulletBuffer = [];
  let tableBuffer = [];
  let midAdInserted = false;

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="list-disc pr-6 space-y-2 my-4 text-gray-700 leading-relaxed">
        {bulletBuffer.map((b, idx) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(b) }} />
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer
      .map((r) => r.trim())
      .filter((r) => r.length > 0 && !/^\|?[\s\-:|]+\|?$/.test(r))
      .map((r) =>
        r
          .split('|')
          .map((c) => c.trim())
          .filter((c) => c.length > 0)
      );
    if (rows.length > 0) {
      const [header, ...body] = rows;
      elements.push(
        <div key={key++} className="my-6 overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-indigo-50">
              <tr>
                {header.map((h, idx) => (
                  <th key={idx} className="px-4 py-3 text-right text-sm font-bold text-indigo-900 border-b border-indigo-100">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="odd:bg-white even:bg-gray-50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2.5 text-sm text-gray-700 border-b border-gray-100">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableBuffer = [];
  };

  const formatInline = (text) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-indigo-700 px-1.5 py-0.5 rounded text-sm">$1</code>');
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('## ')) {
      flushBullets();
      flushTable();
      elements.push(
        <h2 key={key++} className="text-2xl font-black text-gray-900 mt-10 mb-4 leading-tight" style={{ fontFamily: "'Cairo', sans-serif" }}>
          {trimmed.slice(3).trim()}
        </h2>
      );
      // Insert mid-article ad after the third H2 — always inside publisher content
      if (!midAdInserted && elements.filter((e) => e.type === 'h2').length === 3) {
        elements.push(<div key={key++}>{midAd}</div>);
        midAdInserted = true;
      }
    } else if (trimmed.startsWith('### ')) {
      flushBullets();
      flushTable();
      elements.push(
        <h3 key={key++} className="text-xl font-bold text-gray-900 mt-6 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>
          {trimmed.slice(4).trim()}
        </h3>
      );
    } else if (trimmed.startsWith('- ')) {
      flushTable();
      bulletBuffer.push(trimmed.slice(2).trim());
    } else if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushBullets();
      tableBuffer.push(trimmed);
    } else if (trimmed.startsWith('> ')) {
      flushBullets();
      flushTable();
      elements.push(
        <blockquote
          key={key++}
          className="border-r-4 border-indigo-400 bg-indigo-50 pr-4 py-3 my-4 text-gray-700 italic rounded-l-lg"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(2).trim()) }}
        />
      );
    } else if (trimmed.length === 0) {
      flushBullets();
      flushTable();
    } else {
      flushBullets();
      flushTable();
      elements.push(
        <p
          key={key++}
          className="text-gray-700 leading-loose mb-4 text-base"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
        />
      );
    }
    i++;
  }

  flushBullets();
  flushTable();

  return elements;
};

const BlogPost = () => {
  const { slug } = useParams();
  const [dbPost, setDbPost] = useState(null);
  const [loadingDb, setLoadingDb] = useState(false);
  const hardcodedPost = findPostBySlug(slug);

  // If not in hardcoded list, try the DB.
  useEffect(() => {
    if (hardcodedPost) return; // already found
    setLoadingDb(true);
    axios
      .get(`${API}/blog/posts/${slug}`)
      .then((res) => {
        setDbPost({
          ...res.data,
          readingMinutes: res.data.reading_minutes || 5,
        });
      })
      .catch(() => setDbPost(null))
      .finally(() => setLoadingDb(false));
  }, [slug, hardcodedPost]);

  const post = hardcodedPost || dbPost;

  if (!post && !loadingDb && !hardcodedPost) {
    // Wait for fetch to complete before redirecting
    if (dbPost === null && !loadingDb) {
      return <Navigate to="/blog" replace />;
    }
  }
  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Related posts (same category, exclude current) — from hardcoded only
  const related = BLOG_POSTS.filter((p) => p.category === post.category && p.slug !== post.slug).slice(0, 3);

  // Schema.org Article
  const articleLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.cover,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'HomeMe',
      logo: { '@type': 'ImageObject', url: 'https://homemeapp.net/logo.png' },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://homemeapp.net/blog/${post.slug}`,
    },
    keywords: post.keywords.join(', '),
  }), [post]);

  useSEO({
    title: `${post.title} | مدوّنة HomeMe`,
    description: post.excerpt,
    keywords: post.keywords.join(', '),
    canonical: `https://homemeapp.net/blog/${post.slug}`,
    og: {
      title: post.title,
      description: post.excerpt,
      image: post.cover,
      type: 'article',
      url: `https://homemeapp.net/blog/${post.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      image: post.cover,
    },
    jsonLd: articleLd,
    jsonLdId: `blog-post-${post.slug}`,
  });

  const midAd = (
    <div className="my-10 not-prose">
      <InternalAdBanner position="blog_inarticle" maxAds={1} variant="card" adsenseSlot="article-mid" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white" dir="rtl" data-testid={`blog-post-${post.slug}`}>
      {/* Hero */}
      <article>
        <div className="relative aspect-[21/9] sm:aspect-[21/8] bg-gray-200 overflow-hidden">
          <img src={post.cover} alt={post.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
          <div className="absolute bottom-0 inset-x-0 p-6 sm:p-12 text-white">
            <div className="max-w-3xl mx-auto">
              <Link
                to="/blog"
                data-testid="blog-back-link"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4 font-medium"
              >
                <ArrowLongRightIcon className="w-4 h-4" />
                <span>الرجوع للمدوّنة</span>
              </Link>
              <span className="inline-block bg-indigo-500/90 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                {post.category}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>
                {post.title}
              </h1>
              <p className="text-lg text-white/90 mb-4 max-w-2xl">{post.excerpt}</p>
              <div className="flex items-center gap-4 text-sm text-white/80 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4" />
                  {post.author}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4" />
                  {new Date(post.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="w-4 h-4" />
                  {post.readingMinutes} دقيقة قراءة
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-3xl mx-auto px-4 py-12">
          {renderMarkdown(post.body, midAd)}

          {/* Keywords */}
          <div className="mt-12 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <TagIcon className="w-4 h-4" /> كلمات مفتاحية
            </h4>
            <div className="flex flex-wrap gap-2">
              {post.keywords.map((k) => (
                <span key={k} className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                  {k}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom Ad — surrounded by recommendations & footer CTA below */}
          <div className="my-10">
            <InternalAdBanner position="blog_footer" maxAds={1} variant="card" adsenseSlot="article-bottom" />
          </div>

          {/* Reader Comments — adds engagement signals */}
          <CommentSection postSlug={post.slug} />
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="bg-gradient-to-br from-slate-50 to-indigo-50 py-12 px-4">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-2xl font-black text-gray-900 mb-6 text-center" style={{ fontFamily: "'Cairo', sans-serif" }}>
              مقالات ذات صلة
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/blog/${r.slug}`}
                  data-testid={`related-post-${r.slug}`}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all group"
                >
                  <div className="aspect-[16/9] overflow-hidden">
                    <img src={r.cover} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-gray-900 leading-snug group-hover:text-indigo-600 transition-colors">{r.title}</h4>
                    <p className="text-xs text-gray-500 mt-2">{r.readingMinutes} دقيقة قراءة</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600 text-white py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl sm:text-3xl font-black mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>
            جاهز لتطبيق كل ما قرأت؟
          </h3>
          <p className="text-lg text-indigo-100 mb-6">
            HomeMe — منصة سحابية شاملة لإدارة مجمعك السكني من أول الفواتير لآخر زائر يدخل البوابة.
          </p>
          <Link
            to="/"
            data-testid="post-cta-home"
            className="inline-block bg-white text-indigo-700 font-bold px-8 py-3 rounded-xl hover:shadow-xl hover:scale-105 transition-all"
          >
            ابدأ مجانًا الآن ←
          </Link>
        </div>
      </section>
    </div>
  );
};

export default BlogPost;
