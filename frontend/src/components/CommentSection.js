import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ChatBubbleLeftRightIcon, UserCircleIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Blog post comments — public submission + approved-only display.
 * Comments are moderated server-side before appearing publicly.
 */
const CommentSection = ({ postSlug }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', content: '' });

  const fetchComments = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/blog/posts/${postSlug}/comments`);
      setComments(res.data.comments || []);
    } catch (err) {
      // Soft-fail — comments are non-critical
      console.warn('Failed to load comments', err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [postSlug]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.content.trim()) {
      toast.error('الاسم والتعليق مطلوبان');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/blog/comments`, {
        post_slug: postSlug,
        name: form.name.trim(),
        email: form.email.trim() || null,
        content: form.content.trim(),
      });
      toast.success('تم استلام تعليقك! سيظهر بعد المراجعة من فريق التحرير.');
      setForm({ name: '', email: '', content: '' });
    } catch (err) {
      const msg = err.response?.data?.detail || 'تعذّر إرسال التعليق. حاول مرة أخرى.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="border-t border-gray-200 pt-10" data-testid="blog-comments-section">
      <h3 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-3" style={{ fontFamily: "'Cairo', sans-serif" }}>
        <ChatBubbleLeftRightIcon className="w-7 h-7 text-indigo-600" />
        التعليقات {comments.length > 0 && <span className="text-base text-gray-500 font-normal">({comments.length})</span>}
      </h3>
      <p className="text-sm text-gray-500 mb-6">شارك رأيك أو تجربتك مع باقي القرّاء</p>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">جاري تحميل التعليقات…</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl mb-6">
          <ChatBubbleLeftRightIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">كن أول من يعلّق على هذا المقال!</p>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {comments.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm" data-testid={`comment-${c.id}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-bold text-gray-900">{c.name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(c.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{c.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Form */}
      <form onSubmit={handleSubmit} className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-6 border border-indigo-100" data-testid="comment-form">
        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <UserCircleIcon className="w-5 h-5 text-indigo-600" />
          أضف تعليقك
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="اسمك *"
            required
            maxLength={80}
            data-testid="comment-input-name"
            className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="البريد الإلكتروني (اختياري)"
            data-testid="comment-input-email"
            className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </div>
        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          placeholder="اكتب تعليقك هنا… *"
          required
          minLength={4}
          maxLength={2000}
          rows={4}
          data-testid="comment-input-content"
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none mb-3"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            تخضع التعليقات للمراجعة قبل النشر · لن يُنشر بريدك الإلكتروني
          </p>
          <button
            type="submit"
            disabled={submitting}
            data-testid="comment-submit-button"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold px-6 py-2.5 rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
          >
            {submitting ? 'جاري الإرسال…' : (
              <>
                <PaperAirplaneIcon className="w-4 h-4 -scale-x-100" />
                إرسال
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};

export default CommentSection;
