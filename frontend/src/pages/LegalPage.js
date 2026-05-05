import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeftIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Minimal Markdown → React renderer (no external deps).
 * Supports: # h1, ## h2, ### h3, **bold**, *italic*, `code`, lists, tables (basic),
 * blockquotes, hr, paragraphs.
 */
const renderMarkdown = (md) => {
  if (!md) return null;
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  let key = 0;

  const inline = (text) => {
    // Process inline: links [txt](url), bold **x**, italic *x*, inline code `x`
    const tokens = [];
    let remaining = text;
    let tk = 0;
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/;
    const boldRe = /\*\*([^*]+)\*\*/;
    const codeRe = /`([^`]+)`/;
    while (remaining.length) {
      const linkMatch = remaining.match(linkRe);
      const boldMatch = remaining.match(boldRe);
      const codeMatch = remaining.match(codeRe);
      const candidates = [linkMatch, boldMatch, codeMatch].filter(Boolean);
      if (!candidates.length) {
        tokens.push(remaining);
        break;
      }
      const next = candidates.reduce((a, b) => (a.index < b.index ? a : b));
      if (next.index > 0) tokens.push(remaining.slice(0, next.index));
      if (next === linkMatch) {
        tokens.push(<a key={`l${tk++}`} href={next[2]} target="_blank" rel="noreferrer" className="text-violet-600 hover:text-violet-800 underline">{next[1]}</a>);
      } else if (next === boldMatch) {
        tokens.push(<strong key={`b${tk++}`} className="font-bold">{next[1]}</strong>);
      } else if (next === codeMatch) {
        tokens.push(<code key={`c${tk++}`} className="bg-gray-100 text-rose-600 px-1.5 py-0.5 rounded text-sm">{next[1]}</code>);
      }
      remaining = remaining.slice(next.index + next[0].length);
    }
    return tokens;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip blank lines
    if (!trimmed) { i++; continue; }

    // Headings
    if (trimmed.startsWith('### ')) {
      out.push(<h3 key={key++} className="text-xl font-bold text-gray-900 mt-8 mb-3">{inline(trimmed.slice(4))}</h3>);
      i++; continue;
    }
    if (trimmed.startsWith('## ')) {
      out.push(<h2 key={key++} className="text-2xl font-black text-gray-900 mt-10 mb-4 pb-2 border-b-2 border-violet-100">{inline(trimmed.slice(3))}</h2>);
      i++; continue;
    }
    if (trimmed.startsWith('# ')) {
      out.push(<h1 key={key++} className="text-3xl font-black text-gray-900 mb-6">{inline(trimmed.slice(2))}</h1>);
      i++; continue;
    }

    // Horizontal rule
    if (trimmed === '---') {
      out.push(<hr key={key++} className="my-6 border-gray-200" />);
      i++; continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      const block = [trimmed.slice(2)];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        block.push(lines[i].trim().slice(2));
        i++;
      }
      out.push(
        <blockquote key={key++} className="border-r-4 border-violet-500 bg-violet-50 px-4 py-3 my-4 italic text-gray-700 rounded-l-lg">
          {block.map((b, idx) => <p key={idx}>{inline(b)}</p>)}
        </blockquote>
      );
      continue;
    }

    // Tables
    if (trimmed.startsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const headerCells = trimmed.slice(1, -1).split('|').map(c => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim().slice(1, -1).split('|').map(c => c.trim()));
        i++;
      }
      out.push(
        <div key={key++} className="overflow-x-auto my-4">
          <table className="w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
            <thead className="bg-violet-50">
              <tr>{headerCells.map((c, idx) => <th key={idx} className="px-4 py-2 text-right font-bold text-gray-800 border-b border-gray-200">{inline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 ? 'bg-gray-50' : 'bg-white'}>
                  {r.map((c, cIdx) => <td key={cIdx} className="px-4 py-2 text-gray-700 border-b border-gray-100">{inline(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Lists (ul)
    if (trimmed.startsWith('- ') || trimmed.startsWith('✅ ') || trimmed.startsWith('❌ ') || /^\d+\.\s/.test(trimmed)) {
      const items = [];
      const isOrdered = /^\d+\.\s/.test(trimmed);
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) break;
        if (t.startsWith('- ')) items.push(t.slice(2));
        else if (t.startsWith('✅ ') || t.startsWith('❌ ')) items.push(t);
        else if (/^\d+\.\s/.test(t)) items.push(t.replace(/^\d+\.\s/, ''));
        else break;
        i++;
      }
      const Tag = isOrdered ? 'ol' : 'ul';
      out.push(
        <Tag key={key++} className={`${isOrdered ? 'list-decimal' : 'list-disc'} pr-6 my-3 space-y-1.5 text-gray-700`}>
          {items.map((it, idx) => <li key={idx} className="leading-relaxed">{inline(it)}</li>)}
        </Tag>
      );
      continue;
    }

    // Default paragraph
    out.push(<p key={key++} className="text-gray-700 leading-loose my-3">{inline(trimmed)}</p>);
    i++;
  }
  return out;
};

const LegalPage = () => {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setError(null);
    axios.get(`${API}/legal/${slug}`)
      .then((res) => setData(res.data))
      .catch((e) => setError(e?.response?.data?.detail || 'فشل تحميل الصفحة'))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl">🏠</span>
            <span className="text-lg font-black text-gray-900 group-hover:text-violet-600 transition-colors">HomeMe</span>
          </Link>
          <Link to="/" className="text-sm text-violet-700 hover:text-violet-900 font-semibold inline-flex items-center gap-1">
            <ArrowLeftIcon className="w-4 h-4 rtl:rotate-180" />
            العودة للرئيسية
          </Link>
        </div>
      </header>

      {/* Hero */}
      {data && (
        <section className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white py-12">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <div className="text-5xl mb-3">{data.icon}</div>
            <h1 className="text-3xl md:text-4xl font-black mb-2">{data.title}</h1>
            <p className="text-sm md:text-base opacity-90">{data.subtitle}</p>
          </div>
        </section>
      )}

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-10" data-testid={`legal-page-${slug}`}>
        {loading && (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm">...جاري التحميل</div>
        )}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-12 text-center text-rose-700">
            {error}
          </div>
        )}
        {data && (
          <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
            {renderMarkdown(data.content)}
          </article>
        )}
      </main>

      {/* Quick Contact Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 mt-8">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <EnvelopeIcon className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white text-xs mb-1">البريد</p>
              <a href="mailto:info@datalifeai.com" className="hover:text-white">info@datalifeai.com</a>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <PhoneIcon className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white text-xs mb-1">الهاتف / واتساب</p>
              <a href="tel:+201012625529" className="hover:text-white" dir="ltr">+20 101 262 5529</a>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <GlobeAltIcon className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white text-xs mb-1">الموقع</p>
              <a href="https://www.datalifeai.com" target="_blank" rel="noreferrer" className="hover:text-white">www.datalifeai.com</a>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPinIcon className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white text-xs mb-1">العنوان</p>
              <span className="text-xs leading-relaxed">القاهرة - مدينة نصر - عمارات نقابة المهندسين</span>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 mt-6 pt-4 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© 2026 Data Life for Artificial Intelligence Services. جميع الحقوق محفوظة.</p>
          <div className="flex gap-4">
            <Link to="/legal/about" className="hover:text-white">من نحن</Link>
            <Link to="/legal/privacy" className="hover:text-white">سياسة الخصوصية</Link>
            <Link to="/legal/terms" className="hover:text-white">شروط الاستخدام</Link>
            <Link to="/legal/contact" className="hover:text-white">اتصل بنا</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LegalPage;
