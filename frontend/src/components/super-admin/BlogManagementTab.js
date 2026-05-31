import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  EyeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BLANK_POST = {
  title: '',
  slug: '',
  excerpt: '',
  body: '## مقدمة\n\nاكتب محتوى مقالك هنا. استخدم Markdown:\n- `## عنوان` للعناوين\n- `**نص**` للنص الغامق\n- `- بند` لقوائم نقطية\n\n## النتيجة\n\nخاتمة المقال.',
  category: 'إدارة',
  author: 'فريق HomeMe',
  cover: 'https://images.unsplash.com/photo-1518806118471-f28b20a1d79d?w=1200',
  reading_minutes: 5,
  keywords: '',
  published: true,
};

const CATEGORIES = ['إدارة', 'المالية', 'الأمن', 'تجربة المستخدم', 'التحول الرقمي'];

const BlogManagementTab = ({ token }) => {
  const [activeSubTab, setActiveSubTab] = useState('posts'); // 'posts' | 'comments'
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK_POST);
  const [commentStatus, setCommentStatus] = useState('pending');
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null); // {title, excerpt, keywords, category, reading_minutes}

  const headers = { Authorization: `Bearer ${token}` };

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/super-admin/blog/posts`, { headers });
      setPosts(res.data.posts || []);
    } catch (err) {
      toast.error('تعذّر تحميل المقالات');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/super-admin/blog/comments?status=${commentStatus}`, { headers });
      setComments(res.data.comments || []);
    } catch (err) {
      toast.error('تعذّر تحميل التعليقات');
    } finally {
      setLoading(false);
    }
  }, [token, commentStatus]);

  useEffect(() => {
    if (activeSubTab === 'posts') fetchPosts();
    if (activeSubTab === 'comments') fetchComments();
  }, [activeSubTab, fetchPosts, fetchComments]);

  const startEdit = (post) => {
    setEditing(post.slug);
    setAiSuggestion(null);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      body: post.body,
      category: post.category,
      author: post.author || 'فريق HomeMe',
      cover: post.cover,
      reading_minutes: post.reading_minutes || 5,
      keywords: (post.keywords || []).join(', '),
      published: post.published !== false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt.trim(),
      body: form.body,
      category: form.category,
      author: form.author.trim() || 'فريق HomeMe',
      cover: form.cover.trim(),
      reading_minutes: Number(form.reading_minutes) || 5,
      keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean),
      published: form.published,
    };
    try {
      if (editing) {
        await axios.patch(`${API}/super-admin/blog/posts/${editing}`, payload, { headers });
        toast.success('تم تحديث المقال');
      } else {
        await axios.post(`${API}/super-admin/blog/posts`, payload, { headers });
        toast.success('تم نشر المقال');
      }
      setShowForm(false);
      setEditing(null);
      setForm(BLANK_POST);
      fetchPosts();
    } catch (err) {
      const msg = err.response?.data?.detail || 'فشل حفظ المقال';
      toast.error(msg);
    }
  };

  const handleDelete = async (slug) => {
    if (!window.confirm(`متأكد تريد حذف المقال "${slug}"؟ سيتم حذف تعليقاته أيضاً.`)) return;
    try {
      await axios.delete(`${API}/super-admin/blog/posts/${slug}`, { headers });
      toast.success('تم الحذف');
      fetchPosts();
    } catch (err) {
      toast.error('فشل الحذف');
    }
  };

  const moderateComment = async (id, action) => {
    try {
      await axios.patch(`${API}/super-admin/blog/comments/${id}`, { action }, { headers });
      toast.success(action === 'approve' ? 'تم الاعتماد' : 'تم الرفض');
      fetchComments();
    } catch (err) {
      toast.error('فشل التحديث');
    }
  };

  const deleteComment = async (id) => {
    if (!window.confirm('متأكد تريد حذف التعليق نهائياً؟')) return;
    try {
      await axios.delete(`${API}/super-admin/blog/comments/${id}`, { headers });
      toast.success('تم الحذف');
      fetchComments();
    } catch (err) {
      toast.error('فشل الحذف');
    }
  };

  const requestAISuggestion = async () => {
    if (!form.title || form.body.length < 50) {
      toast.error('اكتب العنوان ومحتوى المقال (50 حرف على الأقل) قبل طلب اقتراحات AI');
      return;
    }
    setAiSuggesting(true);
    setAiSuggestion(null);
    try {
      const res = await axios.post(
        `${API}/super-admin/blog/ai-seo-suggest`,
        { title: form.title, body: form.body, category: form.category },
        { headers }
      );
      setAiSuggestion(res.data);
      toast.success('تم توليد اقتراحات AI! راجعها وطبّق ما يعجبك.');
    } catch (err) {
      const msg = err.response?.data?.detail || 'فشل توليد الاقتراحات';
      toast.error(msg);
    } finally {
      setAiSuggesting(false);
    }
  };

  const applyAISuggestion = (fields) => {
    setForm((prev) => {
      const next = { ...prev };
      if (fields.includes('title') && aiSuggestion.title) next.title = aiSuggestion.title;
      if (fields.includes('excerpt') && aiSuggestion.excerpt) next.excerpt = aiSuggestion.excerpt;
      if (fields.includes('keywords') && aiSuggestion.keywords?.length) {
        next.keywords = aiSuggestion.keywords.join(', ');
      }
      if (fields.includes('category') && aiSuggestion.category) next.category = aiSuggestion.category;
      if (fields.includes('reading_minutes') && aiSuggestion.reading_minutes) {
        next.reading_minutes = aiSuggestion.reading_minutes;
      }
      return next;
    });
    toast.success('تم التطبيق');
  };

  return (
    <div className="space-y-6" data-testid="blog-management-tab">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        <button
          onClick={() => setActiveSubTab('posts')}
          data-testid="blog-subtab-posts"
          className={`px-4 py-2 rounded-t-lg text-sm font-medium flex items-center gap-2 transition ${
            activeSubTab === 'posts' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <DocumentTextIcon className="w-4 h-4" />
          المقالات ({posts.length})
        </button>
        <button
          onClick={() => setActiveSubTab('comments')}
          data-testid="blog-subtab-comments"
          className={`px-4 py-2 rounded-t-lg text-sm font-medium flex items-center gap-2 transition ${
            activeSubTab === 'comments' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <ChatBubbleLeftRightIcon className="w-4 h-4" />
          التعليقات
        </button>
      </div>

      {/* POSTS sub-tab */}
      {activeSubTab === 'posts' && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">إدارة مقالات المدوّنة</h3>
            <button
              onClick={() => { setEditing(null); setForm(BLANK_POST); setAiSuggestion(null); setShowForm(true); }}
              data-testid="new-post-button"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <PlusIcon className="w-4 h-4" />
              مقال جديد
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">جاري التحميل…</div>
          ) : posts.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-8 text-center">
              <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">لا توجد مقالات في DB بعد. المقالات الـ 10 الموجودة على الموقع مُخزّنة في الكود (hardcoded).</p>
              <p className="text-gray-500 text-sm mt-2">المقالات التي تنشرها هنا تُحفظ في DB وتظهر فوراً على الموقع.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => (
                <div key={p.slug} className="bg-gray-800 rounded-lg p-4 flex items-start gap-4" data-testid={`db-post-${p.slug}`}>
                  <img src={p.cover} alt={p.title} className="w-20 h-20 rounded object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-white font-bold truncate">{p.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${p.published ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'}`}>
                        {p.published ? 'منشور' : 'مسودة'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2 mb-2">{p.excerpt}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{p.category}</span>
                      <span>•</span>
                      <span>{p.author}</span>
                      <span>•</span>
                      <span>{p.date}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300" title="معاينة">
                      <EyeIcon className="w-4 h-4" />
                    </a>
                    <button onClick={() => startEdit(p)} className="p-2 bg-blue-700 hover:bg-blue-600 rounded text-white" title="تعديل">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.slug)} className="p-2 bg-red-700 hover:bg-red-600 rounded text-white" title="حذف">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Editor Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-gray-900 rounded-2xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto" data-testid="blog-form-modal">
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">{editing ? 'تعديل المقال' : 'مقال جديد'}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={requestAISuggestion}
                        disabled={aiSuggesting}
                        data-testid="ai-seo-button"
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg"
                      >
                        <SparklesIcon className="w-4 h-4" />
                        {aiSuggesting ? 'جاري التحليل…' : 'تحسين SEO بالـ AI'}
                      </button>
                      <button type="button" onClick={() => { setShowForm(false); setEditing(null); setAiSuggestion(null); }} className="text-gray-400 hover:text-white">
                        <XCircleIcon className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* AI Suggestion Preview Panel */}
                  {aiSuggestion && (
                    <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/30 border border-purple-500/50 rounded-xl p-4 space-y-3" data-testid="ai-suggestion-panel">
                      <div className="flex items-center gap-2 text-purple-300 font-bold">
                        <SparklesIcon className="w-5 h-5" />
                        اقتراحات Gemini 3 Flash
                      </div>

                      {aiSuggestion.title && (
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="text-xs text-purple-300 font-medium mb-1">عنوان مُحسّن:</div>
                            <div className="text-white bg-gray-800/60 rounded px-2 py-1.5 text-sm">{aiSuggestion.title}</div>
                          </div>
                          <button type="button" onClick={() => applyAISuggestion(['title'])} data-testid="apply-ai-title" className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-xs whitespace-nowrap">طبّق</button>
                        </div>
                      )}

                      {aiSuggestion.excerpt && (
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="text-xs text-purple-300 font-medium mb-1">مُلخّص SEO:</div>
                            <div className="text-white bg-gray-800/60 rounded px-2 py-1.5 text-sm">{aiSuggestion.excerpt}</div>
                          </div>
                          <button type="button" onClick={() => applyAISuggestion(['excerpt'])} data-testid="apply-ai-excerpt" className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-xs whitespace-nowrap">طبّق</button>
                        </div>
                      )}

                      {aiSuggestion.keywords?.length > 0 && (
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="text-xs text-purple-300 font-medium mb-1">كلمات مفتاحية مقترحة:</div>
                            <div className="flex flex-wrap gap-1">
                              {aiSuggestion.keywords.map((k, i) => (
                                <span key={i} className="bg-gray-800/60 text-white text-xs px-2 py-0.5 rounded-full">{k}</span>
                              ))}
                            </div>
                          </div>
                          <button type="button" onClick={() => applyAISuggestion(['keywords'])} data-testid="apply-ai-keywords" className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-xs whitespace-nowrap">طبّق</button>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-purple-500/30">
                        <div className="text-xs text-purple-200">
                          التصنيف: <span className="font-bold">{aiSuggestion.category}</span> · القراءة: <span className="font-bold">{aiSuggestion.reading_minutes} دقائق</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => applyAISuggestion(['title', 'excerpt', 'keywords', 'category', 'reading_minutes'])}
                          data-testid="apply-ai-all"
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold"
                        >
                          ✨ طبّق كل الاقتراحات
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">العنوان *</label>
                      <input required value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Slug (URL) - اختياري</label>
                      <input value={form.slug} onChange={(e) => setForm({...form, slug: e.target.value})} disabled={!!editing} placeholder="auto-generated" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">التصنيف *</label>
                      <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">المُلخص *</label>
                      <textarea required value={form.excerpt} onChange={(e) => setForm({...form, excerpt: e.target.value})} rows={2} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">الكاتب</label>
                      <input value={form.author} onChange={(e) => setForm({...form, author: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">دقائق القراءة</label>
                      <input type="number" min="1" max="60" value={form.reading_minutes} onChange={(e) => setForm({...form, reading_minutes: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">رابط الصورة الرئيسية *</label>
                      <input required type="url" value={form.cover} onChange={(e) => setForm({...form, cover: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">الكلمات المفتاحية (مفصولة بفاصلة)</label>
                      <input value={form.keywords} onChange={(e) => setForm({...form, keywords: e.target.value})} placeholder="إدارة, كمباوند, صيانة" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">المحتوى (Markdown) *</label>
                      <textarea required value={form.body} onChange={(e) => setForm({...form, body: e.target.value})} rows={14} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm" />
                      <p className="text-xs text-gray-500 mt-1">يدعم: ## عنوان · ### عنوان فرعي · **نص غامق** · - بند قائمة · &gt; اقتباس · | جدول |</p>
                    </div>
                    <label className="flex items-center gap-2 text-white md:col-span-2">
                      <input type="checkbox" checked={form.published} onChange={(e) => setForm({...form, published: e.target.checked})} className="w-4 h-4" />
                      <span>منشور (يظهر على الموقع للقراء)</span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-700">
                    <button type="submit" data-testid="save-post-button" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium">
                      {editing ? 'حفظ التغييرات' : 'نشر المقال'}
                    </button>
                    <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-6 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium">
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* COMMENTS sub-tab */}
      {activeSubTab === 'comments' && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">إدارة التعليقات</h3>
            <div className="flex gap-2">
              {[
                { id: 'pending', label: 'في الانتظار' },
                { id: 'approved', label: 'معتمدة' },
                { id: 'rejected', label: 'مرفوضة' },
                { id: 'all', label: 'الكل' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setCommentStatus(s.id)}
                  data-testid={`comment-filter-${s.id}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${commentStatus === s.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">جاري التحميل…</div>
          ) : comments.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-8 text-center">
              <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">لا توجد تعليقات في هذه الحالة.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="bg-gray-800 rounded-lg p-4" data-testid={`admin-comment-${c.id}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white">{c.name}</span>
                        {c.email && <span className="text-xs text-gray-400">· {c.email}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          c.status === 'approved' ? 'bg-green-900 text-green-200' :
                          c.status === 'rejected' ? 'bg-red-900 text-red-200' :
                          'bg-yellow-900 text-yellow-200'
                        }`}>
                          {c.status === 'approved' ? 'معتمد' : c.status === 'rejected' ? 'مرفوض' : 'في الانتظار'}
                        </span>
                      </div>
                      <a href={`/blog/${c.post_slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline">
                        على مقال: {c.post_slug}
                      </a>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(c.created_at).toLocaleString('ar-EG')}</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap mb-3">{c.content}</p>
                  <div className="flex gap-2">
                    {c.status !== 'approved' && (
                      <button onClick={() => moderateComment(c.id, 'approve')} className="flex items-center gap-1 bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs">
                        <CheckCircleIcon className="w-4 h-4" /> اعتمد
                      </button>
                    )}
                    {c.status !== 'rejected' && (
                      <button onClick={() => moderateComment(c.id, 'reject')} className="flex items-center gap-1 bg-orange-700 hover:bg-orange-600 text-white px-3 py-1.5 rounded text-xs">
                        <XCircleIcon className="w-4 h-4" /> ارفض
                      </button>
                    )}
                    <button onClick={() => deleteComment(c.id)} className="flex items-center gap-1 bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs">
                      <TrashIcon className="w-4 h-4" /> احذف نهائياً
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BlogManagementTab;
