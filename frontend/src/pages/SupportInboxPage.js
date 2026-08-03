import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ChatBubbleLeftEllipsisIcon, ArrowPathIcon,
  PaperAirplaneIcon, CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/support-chat`;
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const statusColors = {
  open: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  closed: 'bg-gray-100 text-gray-500',
};
const statusLabels = { open: 'مفتوح', pending: 'قيد المراجعة', closed: 'مغلق' };

export default function SupportInboxPage() {
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const fetchChats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/all?status=${filter}`, tok());
      setChats(res.data.chats || []);
    } catch { toast.error('فشل تحميل المحادثات'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  const openChat = async (chat) => {
    setSelected(chat);
    try {
      const res = await axios.get(`${API}/${chat.id}/messages`, tok());
      setMessages(res.data.messages || []);
      // Update unread in list
      setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread_support: 0 } : c));
    } catch { toast.error('فشل تحميل الرسائل'); }
  };

  const sendMessage = async () => {
    if (!text.trim() || !selected || sending) return;
    setSending(true);
    const t2 = text.trim();
    setText('');
    try {
      const res = await axios.post(`${API}/${selected.id}/messages`, { text: t2 }, tok());
      setMessages(prev => [...prev, res.data.message]);
    } catch { toast.error('فشل الإرسال'); setText(t2); }
    finally { setSending(false); }
  };

  const updateStatus = async (chatId, status) => {
    try {
      await axios.put(`${API}/${chatId}/status`, { status }, tok());
      toast.success(status === 'closed' ? '✅ تم إغلاق المحادثة' : '✅ تم تحديث الحالة');
      fetchChats();
      if (selected?.id === chatId) setSelected(prev => ({ ...prev, status }));
    } catch { toast.error('فشل التحديث'); }
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Poll for new messages when a chat is selected
  useEffect(() => {
    if (!selected) return;
    const t = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/${selected.id}/messages`, tok());
        setMessages(res.data.messages || []);
      } catch { }
    }, 5000);
    return () => clearInterval(t);
  }, [selected]);

  return (
    <div className="flex h-full min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Sidebar — chat list */}
      <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
              <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-emerald-600" />
              صندوق الدعم
            </h2>
            <button onClick={fetchChats} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ArrowPathIcon className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1">
            {['open', 'pending', 'closed'].map(s => (
              <button key={s}
                onClick={() => { setFilter(s); setSelected(null); setMessages([]); }}
                className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-colors ${
                  filter === s ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                {statusLabels[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-600" />
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center text-gray-400 py-12 text-sm">لا توجد محادثات</div>
          ) : chats.map(chat => (
            <button key={chat.id} onClick={() => openChat(chat)}
              className={`w-full p-4 text-right border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                selected?.id === chat.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
              }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{chat.user_name}</p>
                    {chat.unread_support > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold flex-shrink-0">
                        {chat.unread_support}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{chat.last_message || 'لا توجد رسائل'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusColors[chat.status]}`}>
                      {statusLabels[chat.status]}
                    </span>
                    <span className="text-xs text-gray-400">{chat.user_role}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(chat.last_message_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main — messages */}
      <div className="flex-1 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <ChatBubbleLeftEllipsisIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-bold">اختر محادثة للرد</p>
              <p className="text-sm">قائمة المحادثات على اليمين</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white">{selected.user_name}</h3>
                <p className="text-sm text-gray-500">{selected.user_email} • {selected.user_role}</p>
              </div>
              <div className="flex gap-2">
                {selected.status !== 'closed' && (
                  <button onClick={() => updateStatus(selected.id, 'closed')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors">
                    <XCircleIcon className="h-4 w-4" /> إغلاق
                  </button>
                )}
                {selected.status === 'closed' && (
                  <button onClick={() => updateStatus(selected.id, 'open')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-bold transition-colors">
                    <CheckCircleIcon className="h-4 w-4" /> إعادة فتح
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 mt-10 text-sm">لا توجد رسائل بعد</div>
              ) : messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.is_support ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-lg px-4 py-2.5 rounded-2xl text-sm ${
                    msg.is_support
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-gray-800 dark:text-gray-200 rounded-tr-sm'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                  }`}>
                    <p className="text-xs font-bold text-gray-500 mb-1">
                      {msg.is_support ? `🎧 ${msg.sender_name}` : `👤 ${msg.sender_name}`}
                    </p>
                    <p>{msg.text}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(msg.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            {selected.status !== 'closed' ? (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-3 flex-shrink-0">
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="اكتب ردك..."
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300"
                  dir="rtl"
                  disabled={sending}
                />
                <button onClick={sendMessage} disabled={!text.trim() || sending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-2.5 flex items-center gap-2 text-sm font-bold transition-colors disabled:opacity-50">
                  <PaperAirplaneIcon className="h-4 w-4 rotate-180" /> إرسال
                </button>
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                🔒 المحادثة مغلقة
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
