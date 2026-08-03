import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ChatBubbleLeftEllipsisIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/support-chat`;
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/* ─── Floating button + user chat panel ─────────────────────────────────── */
export default function SupportChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  // Don't show for support staff (they use the dashboard)
  const isSupport = user?.role && ['app_owner', 'super_admin'].includes(user.role);
  if (!user || isSupport) return null;

  const fetchUnread = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/unread-count`, tok());
      setUnread(res.data.unread || 0);
    } catch { }
  }, []);

  const openChat = async () => {
    setOpen(true);
    setLoading(true);
    try {
      // Open or get existing chat
      const res = await axios.post(`${API}/open`, {}, tok());
      const c = res.data.chat;
      setChat(c);
      // Load messages
      const mRes = await axios.get(`${API}/${c.id}/messages`, tok());
      setMessages(mRes.data.messages || []);
      setUnread(0);
    } catch (e) {
      toast.error('فشل فتح المحادثة');
    } finally { setLoading(false); }
  };

  const closeChat = () => {
    setOpen(false);
    clearInterval(pollRef.current);
  };

  const sendMessage = async () => {
    if (!text.trim() || !chat || sending) return;
    setSending(true);
    const t2 = text.trim();
    setText('');
    try {
      const res = await axios.post(`${API}/${chat.id}/messages`, { text: t2 }, tok());
      setMessages(prev => [...prev, res.data.message]);
    } catch { toast.error('فشل إرسال الرسالة'); setText(t2); }
    finally { setSending(false); }
  };

  const pollMessages = useCallback(async () => {
    if (!chat) return;
    try {
      const res = await axios.get(`${API}/${chat.id}/messages`, tok());
      setMessages(res.data.messages || []);
    } catch { }
  }, [chat]);

  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => clearInterval(t);
  }, [fetchUnread]);

  useEffect(() => {
    if (open && chat) {
      pollRef.current = setInterval(pollMessages, 5000);
      return () => clearInterval(pollRef.current);
    }
  }, [open, chat, pollMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const statusLabel = { open: '🟢 مفتوح', pending: '🟡 قيد المراجعة', closed: '🔴 مغلق' };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={open ? closeChat : openChat}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110"
        title="تواصل مع الدعم"
        data-testid="support-chat-btn"
      >
        {open
          ? <XMarkIcon className="h-6 w-6" />
          : <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
        }
        {!open && unread > 0 && (
          <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: '480px' }}>
          {/* Header */}
          <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">🎧</div>
              <div>
                <p className="font-bold text-white text-sm">فريق الدعم — HomeMe</p>
                <p className="text-emerald-100 text-xs">{chat ? statusLabel[chat.status] || '' : 'جارٍ التحميل...'}</p>
              </div>
            </div>
            <button onClick={closeChat} className="text-white/70 hover:text-white">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" dir="rtl">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-400 mt-10">
                <p className="text-3xl mb-2">👋</p>
                <p className="text-sm">أهلاً! كيف نقدر نساعدك؟</p>
                <p className="text-xs text-gray-400 mt-1">فريق الدعم متاح 24/7</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.is_support ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    msg.is_support
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tr-sm'
                      : 'bg-emerald-600 text-white rounded-tl-sm'
                  }`}>
                    {msg.is_support && (
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        {msg.sender_name}
                      </p>
                    )}
                    <p>{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.is_support ? 'text-gray-400' : 'text-emerald-100'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {chat?.status !== 'closed' ? (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2 flex-shrink-0">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="اكتب رسالتك..."
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300"
                dir="rtl"
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={!text.trim() || sending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl w-10 h-10 flex items-center justify-center transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <PaperAirplaneIcon className="h-4 w-4 rotate-180" />
              </button>
            </div>
          ) : (
            <div className="p-3 text-center text-sm text-gray-500 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              🔒 تم إغلاق هذه المحادثة
            </div>
          )}
        </div>
      )}
    </>
  );
}
