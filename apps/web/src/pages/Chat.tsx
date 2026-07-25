import { useState, useEffect, useRef } from 'react';
import { chatApi } from '../lib/api';
import { useParams } from '../hooks/useParams';

export default function ChatPage() {
  const { id: sessionId } = useParams();
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    }
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createSession = async () => {
    const res = await chatApi.createSession({ title: 'New Chat' });
    window.location.hash = `#/chat/${res.data.id}`;
    fetchSessions();
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentSession) return;
    const content = input.trim();
    setInput('');
    setLoading(true);

    const userMsg = { id: Date.now().toString(), role: 'USER', content, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Try streaming first
      const res = await chatApi.sendMessage(currentSession.id, content);
      setMessages((prev) => [...prev, res.data]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <button onClick={createSession} style={styles.newChatBtn}>+ New Chat</button>
        <div style={styles.sessionList}>
          {sessions.map((s) => (
            <a
              key={s.id}
              href={`/#/chat/${s.id}`}
              style={{
                ...styles.sessionItem,
                background: sessionId === s.id ? '#334155' : 'transparent',
              }}
            >
              {s.title}
            </a>
          ))}
        </div>
      </aside>

      <div style={styles.chatArea}>
        {currentSession ? (
          <>
            <div style={styles.messages}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    ...styles.message,
                    alignSelf: msg.role === 'USER' ? 'flex-end' : 'flex-start',
                    background: msg.role === 'USER' ? '#3b82f6' : '#1e293b',
                  }}
                >
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                </div>
              ))}
              {loading && (
                <div style={{ ...styles.message, alignSelf: 'flex-start', background: '#1e293b' }}>
                  <p style={{ margin: 0, color: '#94a3b8' }}>Thinking...</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div style={styles.inputArea}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask anything..."
                style={styles.input}
                disabled={loading}
              />
              <button onClick={sendMessage} disabled={loading} style={styles.sendBtn}>
                Send
              </button>
            </div>
          </>
        ) : (
          <div style={styles.empty}>
            <p style={{ color: '#94a3b8', fontSize: '16px' }}>Select a chat or start a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', height: 'calc(100vh - 64px)' },
  sidebar: {
    width: '260px',
    background: '#1e293b',
    borderRight: '1px solid #334155',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
  },
  newChatBtn: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    marginBottom: '16px',
  },
  sessionList: { display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'auto', flex: 1 },
  sessionItem: {
    color: '#cbd5e1',
    textDecoration: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column' },
  messages: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  message: {
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: '12px',
    color: '#f8fafc',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  inputArea: {
    padding: '16px 20px',
    borderTop: '1px solid #334155',
    display: 'flex',
    gap: '10px',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
  },
  sendBtn: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
