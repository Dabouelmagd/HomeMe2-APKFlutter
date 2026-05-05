import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  SparklesIcon,
  EyeIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import PageHero from '../components/shared/PageHero';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PAGES = [
  { slug: 'about',   icon: '🏢', name: 'من نحن' },
  { slug: 'privacy', icon: '🔐', name: 'سياسة الخصوصية' },
  { slug: 'terms',   icon: '📄', name: 'شروط الاستخدام' },
  { slug: 'contact', icon: '📞', name: 'اتصل بنا' },
];

const LANGS = [
  { code: 'ar', label: 'عربي', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
];

// Lightweight markdown preview (subset)
const renderPreview = (md) => {
  if (!md) return null;
  const lines = md.split('\n');
  const out = [];
  let key = 0;
  let i = 0;
  const inline = (text) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-rose-600 px-1 rounded">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-violet-600 underline">$1</a>');
  };
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) { i++; continue; }
    if (t.startsWith('### ')) out.push(<h3 key={key++} className="text-lg font-bold mt-4 mb-2" dangerouslySetInnerHTML={{__html: inline(t.slice(4))}} />);
    else if (t.startsWith('## ')) out.push(<h2 key={key++} className="text-xl font-black mt-5 mb-2 border-b pb-1" dangerouslySetInnerHTML={{__html: inline(t.slice(3))}} />);
    else if (t.startsWith('# ')) out.push(<h1 key={key++} className="text-2xl font-black mb-3" dangerouslySetInnerHTML={{__html: inline(t.slice(2))}} />);
    else if (t === '---') out.push(<hr key={key++} className="my-3" />);
    else if (t.startsWith('> ')) out.push(<blockquote key={key++} className="border-r-4 border-violet-400 bg-violet-50 px-3 py-2 my-2 italic" dangerouslySetInnerHTML={{__html: inline(t.slice(2))}} />);
    else if (t.startsWith('- ') || /^\d+\.\s/.test(t)) {
      const items = [];
      while (i < lines.length) {
        const tt = lines[i].trim();
        if (!tt) break;
        if (tt.startsWith('- ')) items.push(tt.slice(2));
        else if (/^\d+\.\s/.test(tt)) items.push(tt.replace(/^\d+\.\s/, ''));
        else break;
        i++;
      }
      out.push(<ul key={key++} className="list-disc pr-5 my-2 space-y-1">{items.map((x, idx) => <li key={idx} dangerouslySetInnerHTML={{__html: inline(x)}} />)}</ul>);
      continue;
    }
    else out.push(<p key={key++} className="my-2 leading-relaxed" dangerouslySetInnerHTML={{__html: inline(t)}} />);
    i++;
  }
  return out;
};

const LegalEditorPage = () => {
  const [activeSlug, setActiveSlug] = useState('about');
  const [activeLang, setActiveLang] = useState('ar');
  const [versions, setVersions] = useState({ ar: '', en: '', fr: '' });
  const [original, setOriginal] = useState({ ar: '', en: '', fr: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(null);
  const [showPreview, setShowPreview] = useState(true);

  const fetchPage = async (slug) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/legal/${slug}/raw`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setVersions(res.data.versions || { ar: '', en: '', fr: '' });
      setOriginal(res.data.versions || { ar: '', en: '', fr: '' });
    } catch (e) {
      toast.error('فشل تحميل الصفحة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(activeSlug);
  }, [activeSlug]);

  const isDirty = useMemo(() => {
    return versions[activeLang] !== original[activeLang];
  }, [versions, original, activeLang]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API}/legal/${activeSlug}?lang=${activeLang}`,
        { content: versions[activeLang] },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success(`✅ تم الحفظ — سيظهر فوراً للزوار`);
      setOriginal((prev) => ({ ...prev, [activeLang]: versions[activeLang] }));
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleTranslate = async (target) => {
    if (!versions.ar) {
      toast.error('احفظ النسخة العربية أولاً قبل الترجمة');
      return;
    }
    if (!window.confirm(`سيتم توليد ${target === 'en' ? 'النسخة الإنجليزية' : 'النسخة الفرنسية'} تلقائياً من العربية بواسطة AI. سيستبدل أي محتوى موجود. متابعة؟`)) return;
    setTranslating(target);
    try {
      const res = await axios.post(
        `${API}/legal/${activeSlug}/translate?source_lang=ar&target_lang=${target}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      const translated = res.data?.translated_content || '';
      setVersions((prev) => ({ ...prev, [target]: translated }));
      setOriginal((prev) => ({ ...prev, [target]: translated }));
      setActiveLang(target);
      toast.success(`✨ تم توليد ${target === 'en' ? 'EN' : 'FR'} بنجاح (${res.data?.char_count} حرف)`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'فشلت الترجمة');
    } finally {
      setTranslating(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="legal-editor-page">
      <PageHero
        icon="✏️"
        title="محرّر الصفحات القانونية"
        subtitle="عدّل محتوى من نحن / الخصوصية / الشروط / اتصل بنا — مع ترجمة تلقائية بـ AI"
        accent="violet"
      />

      {/* Page selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {PAGES.map((p) => (
          <button
            key={p.slug}
            onClick={() => setActiveSlug(p.slug)}
            className={`p-3 rounded-xl border-2 font-semibold text-sm transition-all ${
              activeSlug === p.slug
                ? 'bg-violet-600 border-violet-700 text-white shadow-md'
                : 'bg-white border-gray-200 text-gray-700 hover:border-violet-300'
            }`}
            data-testid={`editor-page-${p.slug}`}
          >
            <span className="text-xl block mb-1">{p.icon}</span>
            {p.name}
          </button>
        ))}
      </div>

      {/* Language tabs */}
      <div className="bg-white rounded-t-2xl border border-gray-200 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setActiveLang(l.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                activeLang === l.code
                  ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-300'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              data-testid={`editor-lang-${l.code}`}
            >
              {l.label}
              {versions[l.code] && versions[l.code].length > 0 ? (
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {(activeLang === 'en' || activeLang === 'fr') && (
            <button
              onClick={() => handleTranslate(activeLang)}
              disabled={translating === activeLang || !versions.ar}
              className="text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 px-3 py-1.5 rounded-lg shadow disabled:opacity-50 inline-flex items-center gap-1.5"
              title="توليد من العربية باستخدام Gemini AI"
              data-testid={`editor-translate-${activeLang}`}
            >
              {translating === activeLang ? (
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <SparklesIcon className="w-3.5 h-3.5" />
              )}
              ترجم من AR بـ AI
            </button>
          )}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs font-semibold text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
            data-testid="editor-toggle-preview"
          >
            {showPreview ? <PencilSquareIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
            {showPreview ? 'تحرير فقط' : 'مع المعاينة'}
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg shadow inline-flex items-center gap-1.5 transition-all ${
              isDirty
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
            data-testid="editor-save-btn"
          >
            {saving ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <CloudArrowUpIcon className="w-3.5 h-3.5" />}
            {isDirty ? 'حفظ التغييرات' : '✓ محفوظ'}
          </button>
        </div>
      </div>

      {/* Editor + Preview */}
      <div className={`grid ${showPreview ? 'grid-cols-1 lg:grid-cols-2 gap-0' : 'grid-cols-1'} bg-white rounded-b-2xl border-x border-b border-gray-200 overflow-hidden`}>
        {/* Editor */}
        <div className="border-l border-gray-200">
          {loading ? (
            <div className="h-96 flex items-center justify-center text-gray-400 text-sm">...جاري التحميل</div>
          ) : (
            <textarea
              value={versions[activeLang] || ''}
              onChange={(e) => setVersions((prev) => ({ ...prev, [activeLang]: e.target.value }))}
              dir={LANGS.find((l) => l.code === activeLang)?.dir}
              placeholder={
                activeLang === 'ar'
                  ? 'اكتب محتوى الصفحة بصيغة Markdown...'
                  : activeLang === 'fr'
                  ? "Écrivez le contenu de la page en Markdown..."
                  : 'Write page content in Markdown...'
              }
              className="w-full px-5 py-4 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-inset focus:ring-violet-300 resize-none border-none"
              style={{ minHeight: '600px' }}
              data-testid={`editor-textarea-${activeLang}`}
            />
          )}
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="bg-gray-50 px-5 py-4 overflow-y-auto" style={{ maxHeight: '700px' }} dir={LANGS.find((l) => l.code === activeLang)?.dir}>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-3">📖 معاينة مباشرة</div>
            <div className="prose prose-sm max-w-none">
              {renderPreview(versions[activeLang])}
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mt-4 text-xs text-indigo-800">
        <div className="font-bold mb-2 flex items-center gap-1.5">
          <DocumentTextIcon className="w-4 h-4" />
          نصائح Markdown سريعة:
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <code className="bg-white px-2 py-1 rounded">## عنوان رئيسي</code>
          <code className="bg-white px-2 py-1 rounded">**نص غامق**</code>
          <code className="bg-white px-2 py-1 rounded">- نقطة قائمة</code>
          <code className="bg-white px-2 py-1 rounded">[نص الرابط](url)</code>
        </div>
      </div>
    </div>
  );
};

export default LegalEditorPage;
