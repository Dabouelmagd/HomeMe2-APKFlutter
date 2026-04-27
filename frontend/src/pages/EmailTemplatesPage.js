import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Save, RotateCcw, Eye, Loader2, CheckCircle2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [activeKind, setActiveKind] = useState(null);
  const [draft, setDraft] = useState({ subject: '', html: '' });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/email-templates`);
      setTemplates(r.data.templates || []);
      if (!activeKind && r.data.templates?.length) {
        const first = r.data.templates[0];
        setActiveKind(first.kind);
        setDraft({ subject: first.subject, html: first.html });
      }
    } catch (e) {
      toast.error('فشل تحميل القوالب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const selectTemplate = (t) => {
    setActiveKind(t.kind);
    setDraft({ subject: t.subject, html: t.html });
    setPreview(null);
  };

  const save = async () => {
    if (!draft.subject || !draft.html) {
      toast.error('subject و html مطلوبان');
      return;
    }
    setLoading(true);
    try {
      await axios.put(`${API}/email-templates/${activeKind}`, draft);
      toast.success('تم الحفظ');
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (!window.confirm('هل تريد استعادة القالب الافتراضي وفقد التعديلات؟')) return;
    setLoading(true);
    try {
      const r = await axios.post(`${API}/email-templates/${activeKind}/reset`);
      setDraft({ subject: r.data.subject, html: r.data.html });
      toast.success('تم استعادة الافتراضي');
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل');
    } finally {
      setLoading(false);
    }
  };

  const doPreview = async () => {
    setPreviewing(true);
    try {
      const r = await axios.post(`${API}/email-templates/${activeKind}/preview`, draft);
      setPreview(r.data);
    } catch (e) {
      toast.error('فشل المعاينة');
    } finally {
      setPreviewing(false);
    }
  };

  const active = templates.find((t) => t.kind === activeKind);

  return (
    <div className="min-h-screen p-6" data-testid="email-templates-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-pink-600 flex items-center justify-center text-white">
            <Mail className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">قوالب البريد الإلكتروني</h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              عدّل subject وhtml لكل بريد آلي. استخدم متغيرات <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{variable}}'}</code> للاستبدال الديناميكي.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Sidebar list */}
          <div className="md:col-span-3 space-y-2">
            {templates.map((t) => (
              <button
                key={t.kind}
                onClick={() => selectTemplate(t)}
                className={`w-full text-right p-3 rounded-lg border transition ${
                  activeKind === t.kind
                    ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-900/20 shadow'
                    : 'border-gray-200 dark:border-gray-700 hover:border-fuchsia-300 hover:shadow-sm'
                }`}
                data-testid={`tpl-${t.kind}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-gray-900 dark:text-white text-sm">{t.label}</div>
                  {t.is_customized && <CheckCircle2 className="w-4 h-4 text-emerald-600" title="مُخصَّص" />}
                </div>
                <div className="text-[10px] text-gray-500 font-mono">{t.kind}</div>
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="md:col-span-9 space-y-4">
            {active && (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-100 dark:border-gray-700">
                  <div className="mb-3">
                    <div className="text-xs text-gray-500">المتغيرات المتاحة</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(active.variables || []).map((v) => (
                        <button
                          key={v}
                          onClick={() => navigator.clipboard?.writeText(`{{${v}}}`)}
                          className="text-[11px] font-mono px-2 py-1 rounded bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-100"
                          title="انقر للنسخ"
                        >
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان (Subject)</label>
                  <input
                    type="text"
                    value={draft.subject}
                    onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm mb-4 font-mono"
                    data-testid="template-subject-input"
                  />

                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">المحتوى HTML</label>
                  <textarea
                    rows={12}
                    value={draft.html}
                    onChange={(e) => setDraft({ ...draft, html: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-xs font-mono"
                    data-testid="template-html-input"
                  />

                  <div className="flex flex-wrap gap-3 mt-4">
                    <button
                      onClick={save}
                      disabled={loading}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-medium hover:opacity-90 disabled:opacity-50"
                      data-testid="save-template-btn"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      حفظ
                    </button>
                    <button
                      onClick={doPreview}
                      disabled={previewing}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-fuchsia-600 text-fuchsia-700 font-medium hover:bg-fuchsia-50"
                      data-testid="preview-template-btn"
                    >
                      {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      معاينة
                    </button>
                    <button
                      onClick={reset}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      data-testid="reset-template-btn"
                    >
                      <RotateCcw className="w-4 h-4" />
                      استعادة الافتراضي
                    </button>
                  </div>
                </div>

                {preview && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-emerald-200 overflow-hidden" data-testid="template-preview">
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 px-5 py-3 border-b border-emerald-200">
                      <div className="text-xs text-gray-500 mb-1">العنوان (Subject):</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{preview.subject}</div>
                    </div>
                    <div className="p-5 bg-white" dir="rtl" dangerouslySetInnerHTML={{ __html: preview.html }} />
                    <div className="px-5 py-2 bg-gray-50 dark:bg-gray-900 text-[10px] text-gray-500 border-t border-gray-200 dark:border-gray-700">
                      المعاينة بمتغيرات تجريبية. سيتم استبدالها بالقيم الفعلية عند الإرسال الحقيقي.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
