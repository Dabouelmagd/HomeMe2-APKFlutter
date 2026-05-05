import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * AIActionModal — preview + edit + confirm flow for AI-generated bulk emails.
 * Steps: loading -> preview (recipients list + editable message) -> sending -> done.
 */
const AIActionModal = ({ insightId, compoundId, onClose, onComplete }) => {
  const [step, setStep] = useState('loading'); // loading | preview | sending | done
  const [draft, setDraft] = useState(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingMessage, setEditingMessage] = useState(false);
  const [result, setResult] = useState(null);

  const fetchDraft = async () => {
    setStep('loading');
    try {
      const res = await axios.post(
        `${API}/ai-actions/draft`,
        { insight_id: insightId, compound_id: compoundId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setDraft(res.data);
      setEditedSubject(res.data.subject);
      setEditedMessage(res.data.message);
      setSelectedIds(new Set(res.data.recipients.map((r) => r.user_id)));
      setStep('preview');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'فشل تحضير الإجراء');
      onClose();
    }
  };

  useEffect(() => {
    fetchDraft();
  }, []);

  const handleToggleRecipient = (uid) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!draft) return;
    if (selectedIds.size === draft.recipients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(draft.recipients.map((r) => r.user_id)));
    }
  };

  const handleConfirmSend = async () => {
    if (selectedIds.size === 0) {
      toast.error('اختر مستلم واحد على الأقل');
      return;
    }
    if (!editedMessage.trim() || editedMessage.length < 10) {
      toast.error('الرسالة قصيرة جداً');
      return;
    }
    setStep('sending');
    try {
      const res = await axios.post(
        `${API}/ai-actions/execute`,
        {
          insight_id: insightId,
          compound_id: compoundId,
          subject: editedSubject,
          message: editedMessage,
          recipient_user_ids: Array.from(selectedIds),
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setResult(res.data);
      setStep('done');
      if (res.data.sent > 0) {
        toast.success(`✅ تم إرسال ${res.data.sent} رسالة بنجاح`);
        onComplete?.();
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'فشل الإرسال');
      setStep('preview');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      data-testid="ai-action-modal"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" dir="rtl">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">تنفيذ تلقائي بالـ AI</p>
              <p className="text-[11px] text-white/80">
                {draft?.title || 'جاري التحضير...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            data-testid="ai-action-close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ArrowPathIcon className="w-10 h-10 text-violet-500 animate-spin mb-3" />
              <p className="text-sm font-semibold text-gray-700">AI يحضّر الرسالة...</p>
              <p className="text-xs text-gray-500 mt-1">يحلل المستلمين ويصيغ النص بالعربية</p>
            </div>
          )}

          {step === 'sending' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PaperAirplaneIcon className="w-10 h-10 text-violet-500 animate-pulse mb-3" />
              <p className="text-sm font-semibold text-gray-700">جاري الإرسال...</p>
              <p className="text-xs text-gray-500 mt-1">إرسال {selectedIds.size} رسالة</p>
            </div>
          )}

          {step === 'done' && result && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
                <CheckCircleIcon className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تم الإرسال بنجاح!</h3>
              <p className="text-sm text-gray-600 mb-4">
                ✅ <strong className="text-emerald-700">{result.sent}</strong> رسالة وصلت بنجاح
              </p>
              {result.failed > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3 text-xs text-amber-800">
                  ⚠️ <strong>{result.failed}</strong> رسالة فشلت في الإرسال
                  {result.failed_emails?.length > 0 && (
                    <p className="mt-1 text-[10px] truncate">{result.failed_emails.join('، ')}</p>
                  )}
                </div>
              )}
              <button
                onClick={onClose}
                className="mt-5 px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700"
                data-testid="ai-action-done-close"
              >
                إغلاق
              </button>
            </div>
          )}

          {step === 'preview' && draft && (
            <>
              {/* Subject */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">📋 الموضوع:</label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  data-testid="ai-action-subject"
                />
              </div>

              {/* Message Body */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    ✉️ نص الرسالة (تم توليده بواسطة AI):
                  </label>
                  <button
                    onClick={() => setEditingMessage(!editingMessage)}
                    className="text-[11px] text-violet-600 hover:text-violet-800 font-semibold flex items-center gap-1"
                    data-testid="ai-action-edit-toggle"
                  >
                    <PencilSquareIcon className="w-3.5 h-3.5" />
                    {editingMessage ? 'إنهاء التعديل' : 'تعديل النص'}
                  </button>
                </div>
                {editingMessage ? (
                  <textarea
                    value={editedMessage}
                    onChange={(e) => setEditedMessage(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-violet-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent leading-relaxed"
                    data-testid="ai-action-message-edit"
                  />
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {editedMessage}
                  </div>
                )}
                <p className="text-[10px] text-gray-500 mt-1">
                  💡 <code className="bg-gray-100 px-1 rounded">{'{name}'}</code> سيُستبدل تلقائياً باسم كل مستلم،
                  {' '}<code className="bg-gray-100 px-1 rounded">{'{extra}'}</code> ببيانات إضافية إن وُجدت.
                </p>
              </div>

              {/* Recipients List */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-700">
                    👥 المستلمين ({selectedIds.size}/{draft.recipients.length}):
                  </label>
                  <button
                    onClick={handleSelectAll}
                    className="text-[11px] text-violet-600 hover:text-violet-800 font-semibold"
                    data-testid="ai-action-select-all"
                  >
                    {selectedIds.size === draft.recipients.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {draft.recipients.map((r) => (
                    <label
                      key={r.user_id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-violet-50 cursor-pointer transition-colors"
                      data-testid={`ai-action-recipient-${r.user_id}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.user_id)}
                        onChange={() => handleToggleRecipient(r.user_id)}
                        className="rounded text-violet-600 focus:ring-violet-500"
                      />
                      <UserIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{r.email}</p>
                      </div>
                      {r.extra && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold flex-shrink-0">
                          {r.extra}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Safety note */}
              <div className="bg-amber-50 border-r-4 border-amber-400 rounded-lg p-2.5 text-[11px] text-amber-800 mt-3 flex items-start gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  راجع النص جيداً قبل الإرسال. AI أداة مساعدة وليست بديلاً عن مراجعتك.
                  الإجراء سيُسجَّل في <strong>سجل التدقيق</strong>.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-5 py-3 flex items-center justify-between gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-200 font-semibold"
              data-testid="ai-action-cancel"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirmSend}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-sm font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="ai-action-confirm-send"
            >
              <PaperAirplaneIcon className="w-4 h-4 rtl:rotate-180" />
              أرسل الآن لـ {selectedIds.size} مستلم
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIActionModal;
