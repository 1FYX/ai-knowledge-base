import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import KnowledgeBasesPage from './pages/KnowledgeBases';
import KnowledgeBaseDetailPage from './pages/KnowledgeBaseDetail';
import ChatPage from './pages/Chat';

function Router() {
  const hash = window.location.hash;
  const path = hash.replace('#', '').split('?')[0];

  if (path.startsWith('/kbs/')) return <KnowledgeBaseDetailPage />;
  if (path === '/kbs' || path === '/kbs/') return <KnowledgeBasesPage />;
  if (path.startsWith('/chat')) return <ChatPage />;
  return <KnowledgeBasesPage />;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ background: '#0f172a', minHeight: '100vh' }} />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Router />
    </Layout>
  );
}

export default App;
