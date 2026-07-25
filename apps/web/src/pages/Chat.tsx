import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Button, Textarea, Spinner } from 'flowbite-react';
import { chatApi } from '../lib/api';
import { useHashRoute } from '../hooks/useHashRoute';

gsap.registerPlugin(useGSAP);

export default function ChatPage() {
  const { segments, navigate } = useHashRoute();
  const sessionId = segments[1]; // /chat/:id
  const messagesRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);

  const fetchSessions = async () => {
    try {
      const res = await chatApi.listSessions();
      setSessions(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSession = async (sid: string) => {
    try {
      const res = await chatApi.getSession(sid);
      setCurrentSession(res.data);
      setMessages(res.data.messages || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSessions();
    if (sessionId) {
      fetchSession(sessionId);
    } else {
      setCurrentSession(null);
      setMessages([]);
    }
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 新消息滑入淡入：只对增量消息做动画（避免历史消息每次都闪动）
  useEffect(() => {
    const total = messages.length;
    const newCount = total - prevMsgCount.current;
    if (newCount > 0 && messagesRef.current) {
      const els = messagesRef.current.querySelectorAll('[data-msg]');
      const startIdx = Math.max(0, total - newCount);
      const newEls = Array.from(els).slice(startIdx);
      gsap.from(newEls, {
        opacity: 0,
        y: 12,
        duration: 0.3,
        ease: 'power2.out',
        stagger: 0.04,
      });
    }
    prevMsgCount.current = total;
  }, [messages]);

  const createSession = async () => {
    const res = await chatApi.createSession({ title: '新对话' });
    navigate(`/chat/${res.data.id}`);
    fetchSessions();
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentSession) return;
    const content = input.trim();
    setInput('');
    setLoading(true);

    const userMsg = {
      id: Date.now().toString(),
      role: 'USER',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // 占位助手消息，流式追加内容
    const assistantId = Date.now().toString() + '-a';
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'ASSISTANT', content: '', createdAt: new Date().toISOString() },
    ]);

    chatApi.streamMessage(currentSession.id, content, {
      onChunk: (chunk) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
        );
      },
      onDone: () => setLoading(false),
      onError: (err) => {
        // 用红色错误气泡展示友好消息（err 已是后端翻译过的中文）
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || `⚠ ${err}`, isError: true }
              : m,
          ),
        );
        setLoading(false);
      },
    });
  };

  return (
    <div className="flex h-full">
      {/* 会话列表 */}
      <aside className="flex w-64 flex-col border-r border-slate-700 bg-slate-800 p-3">
        <Button onClick={createSession} className="mb-3">
          + 新对话
        </Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/chat/${s.id}`)}
              className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                sessionId === s.id
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {s.title}
            </button>
          ))}
          {sessions.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-500">暂无对话</p>
          )}
        </div>
      </aside>

      {/* 对话区 */}
      <div className="flex flex-1 flex-col">
        {currentSession ? (
          <>
            {/* 消息区 */}
            <div ref={messagesRef} className="flex-1 space-y-4 overflow-y-auto p-6">
              {messages.map((msg) => {
                const isUser = msg.role === 'USER';
                return (
                  <div
                    key={msg.id}
                    data-msg
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.isError
                          ? 'rounded-bl-sm border border-red-800 bg-red-950/50 text-red-200'
                          : isUser
                            ? 'rounded-br-sm bg-blue-600 text-white'
                            : 'rounded-bl-sm bg-slate-800 text-slate-100'
                      }`}
                    >
                      {msg.content || (loading && !isUser ? '思考中...' : '')}
                    </div>
                  </div>
                );
              })}
              {loading && messages[messages.length - 1]?.role === 'USER' && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-slate-800 px-4 py-3">
                    <Spinner size="sm" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区 */}
            <div className="border-t border-slate-700 p-4">
              <div className="flex items-end gap-2">
                <Textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="输入你的问题...（Enter 发送，Shift+Enter 换行）"
                  className="flex-1 resize-none"
                  disabled={loading}
                />
                <Button onClick={sendMessage} disabled={loading || !input.trim()}>
                  发送
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
            <div className="mb-3 text-5xl opacity-30">💬</div>
            <p>选择一个对话，或开始新对话</p>
          </div>
        )}
      </div>
    </div>
  );
}
