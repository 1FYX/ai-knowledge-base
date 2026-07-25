import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAuth } from './hooks/useAuth';
import { useHashRoute } from './hooks/useHashRoute';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import KnowledgeBasesPage from './pages/KnowledgeBases';
import KnowledgeBaseDetailPage from './pages/KnowledgeBaseDetail';
import ChatPage from './pages/Chat';
import SettingsPage from './pages/Settings';

gsap.registerPlugin(useGSAP);

/** 根据 hash 路由渲染对应页面 */
function renderPage(segments: string[]) {
  if (segments[0] === 'kbs' && segments[1]) return <KnowledgeBaseDetailPage />;
  if (segments[0] === 'kbs') return <KnowledgeBasesPage />;
  if (segments[0] === 'chat') return <ChatPage />;
  if (segments[0] === 'settings') return <SettingsPage />;
  return <KnowledgeBasesPage />;
}

/** 带转场动画的路由容器：路由变化时整体淡入 + 轻微上移 */
function AnimatedRouter() {
  const { segments } = useHashRoute();
  const ref = useRef<HTMLDivElement>(null);

  // 用路由第一段 + id 作为 key，路由变化时组件会重新挂载，触发 useGSAP
  const routeKey = segments.join('/');

  return (
    <div key={routeKey} ref={ref} className="h-full">
      <PageWithEnter>{renderPage(segments)}</PageWithEnter>
    </div>
  );
}

/** 单独的子组件，让 useGSAP 在每次路由切换后重新执行入场动画 */
function PageWithEnter({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.from(scope.current, {
        opacity: 0,
        y: 16,
        duration: 0.35,
        ease: 'power2.out',
      });
    },
    { scope },
  );
  return <div ref={scope} className="h-full">{children}</div>;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-900" />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <AnimatedRouter />
    </Layout>
  );
}

export default App;
