import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>AKB</div>
        <nav style={styles.nav}>
          <a href="/#/kbs" style={styles.navLink}>Knowledge Bases</a>
          <a href="/#/chat" style={styles.navLink}>Chat</a>
        </nav>
        <div style={styles.user}>
          <span style={styles.userName}>{user?.name || user?.email}</span>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </aside>
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: { display: 'flex', minHeight: '100vh', background: '#0f172a' },
  sidebar: {
    width: '220px',
    background: '#1e293b',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    borderRight: '1px solid #334155',
  },
  logo: {
    color: '#f8fafc',
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '32px',
    letterSpacing: '2px',
  },
  nav: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
  navLink: {
    color: '#cbd5e1',
    textDecoration: 'none',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    display: 'block',
    transition: 'background 0.2s',
  },
  user: { marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #334155' },
  userName: { color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '8px' },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #475569',
    color: '#94a3b8',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    width: '100%',
  },
  main: { flex: 1, padding: '32px', overflow: 'auto' },
};
