import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { toast } from 'sonner';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  TrashIcon,
  ArrowRightCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SUGGESTED_QUESTIONS = [
  'إزاي أرفع إيصال دفع؟',
  'إزاي أضيف فرد عيلة؟',
  'إزاي أحجز نادي أو حمام سباحة؟',
  'إزاي أعمل تذكرة صيانة؟',
  'إزاي أدعو زائر؟',
];

const AIAssistantBubble = () => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [usage, setUsage] = useState({ used_today: 0, remaining_today: 20, daily_limit: 20 });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Don't show on login/register/public pages
  if (!user) return null;

  const fetchUsage = async () => {
    try {
      const res = await axios.get(`${API}/ai-assistant/usage`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setUsage(res.data);
    } catch { /* silent */ }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API}/ai-assistant/history?limit=30`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMessages(res.data?.messages || []);
    } catch { /* silent */ } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchUsage();
      if (messages.length === 0) fetchHistory();
      // Focus input when opening
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  useEffect(() => {
    // auto-scroll on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const handleSend = async (text) => {
    const message = (text || input).trim();
    if (!message || sending) return;

    if (usage.remaining_today <= 0) {
      toast.error('وصلت للحد اليومي (20 رسالة). جرّب تاني بكره.');
      return;
    }

    // Optimistic UI: append user message
    const userMsg = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      text: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await axios.post(
        `${API}/ai-assistant/chat`,
        { message },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      const reply = res.data;
      setMessages((prev) => [
        ...prev,
        {
          id: `r-${Date.now()}`,
          role: 'assistant',
          text: reply.reply,
          suggested_route: reply.suggested_route,
          created_at: new Date().toISOString(),
        },
      ]);
      setUsage((u) => ({ ...u, used_today: u.used_today + 1, remaining_today: reply.messages_remaining_today }));
    } catch (e) {
      const detail = e?.response?.data?.detail || 'حدث خطأ. حاول مرة أخرى.';
      toast.error(detail);
      // Remove the optimistic user message on hard fail
      if (e?.response?.status === 429) {
        setUsage((u) => ({ ...u, remaining_today: 0 }));
      }
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('هل تريد مسح كل المحادثة؟')) return;
    try {
      await axios.delete(`${API}/ai-assistant/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMessages([]);
      toast.success('تم مسح المحادثة');
    } catch {
      toast.error('فشل المسح');
    }
  };

  const handleNavigate = (route) => {
    setOpen(false);
    navigate(route);
  };

  return (
    <>
      {/* Floating Bubble Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-50 group`}
          data-testid="ai-assistant-bubble"
          title="مساعد HomeMe الذكي"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-md opacity-60 group-hover:opacity-90 transition-opacity animate-pulse" />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-200">
              <SparklesIcon className="w-7 h-7 text-white" />
            </div>
            {/* "AI" badge */}
            <span className="absolute -top-1 -right-1 bg-white text-indigo-600 text-[9px] font-black rounded-full w-6 h-6 flex items-center justify-center shadow-md ring-2 ring-indigo-500">
              AI
            </span>
          </div>
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div
          className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-50 w-[calc(100vw-3rem)] sm:w-96 max-w-md flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden`}
          style={{ height: '600px', maxHeight: 'calc(100vh - 3rem)' }}
          dir={isRTL ? 'rtl' : 'ltr'}
          data-testid="ai-assistant-panel"
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center ring-2 ring-white/30">
                <SparklesIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">مساعد HomeMe الذكي</p>
                <p className="text-[10px] text-white/80">
                  متبقي اليوم: {usage.remaining_today}/{usage.daily_limit} رسالة
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title="مسح المحادثة"
                  data-testid="ai-clear-history"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                data-testid="ai-close-panel"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50 px-4 py-3 space-y-3" data-testid="ai-messages-list">
            {loadingHistory && (
              <div className="text-center py-8 text-gray-400 text-sm">...جاري تحميل المحادثة</div>
            )}

            {!loadingHistory && messages.length === 0 && (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  <SparklesIcon className="w-8 h-8 text-indigo-600" />
                </div>
                <p className="text-sm font-bold text-gray-800 mb-1">أهلاً بك في HomeMe! 👋</p>
                <p className="text-xs text-gray-500 mb-4">
                  أنا هنا علشان أساعدك في استخدام التطبيق. اسألني أي حاجة!
                </p>
                <div className="space-y-2 text-right">
                  <p className="text-[11px] font-semibold text-gray-600 mb-2">أسئلة شائعة:</p>
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="block w-full text-right px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                      data-testid={`ai-suggested-${q.slice(0, 10)}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                  }`}
                  data-testid={`ai-msg-${m.role}`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  {m.suggested_route && (
                    <button
                      onClick={() => handleNavigate(m.suggested_route)}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                      data-testid={`ai-deeplink-${m.id}`}
                    >
                      <ArrowRightCircleIcon className="w-4 h-4" />
                      افتح الصفحة
                    </button>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm shadow-sm px-4 py-2.5">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={usage.remaining_today > 0 ? 'اسأل أي حاجة...' : 'وصلت للحد اليومي'}
                rows={1}
                disabled={usage.remaining_today <= 0 || sending}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                style={{ maxHeight: '100px' }}
                data-testid="ai-input"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending || usage.remaining_today <= 0}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                data-testid="ai-send-btn"
              >
                <PaperAirplaneIcon className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            </form>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              مدعوم بـ Gemini AI · لا تشاركني معلومات حساسة
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistantBubble;
