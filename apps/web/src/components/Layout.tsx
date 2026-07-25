import { ReactNode } from 'react';
import { Avatar, Dropdown, DropdownDivider, DropdownHeader, DropdownItem } from 'flowbite-react';
import { useAuth } from '../hooks/useAuth';
import { useHashRoute } from '../hooks/useHashRoute';

/** 导航项配置 */
const NAV_ITEMS = [
  { path: '/kbs', label: '知识库', icon: IconBook },
  { path: '/chat', label: '对话', icon: IconChat },
  { path: '/settings', label: '设置', icon: IconSettings },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { segments, navigate } = useHashRoute();

  // 当前激活的导航段（取路径第一段，如 'kbs'）
  const activeSeg = segments[0] || 'kbs';

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100">
      {/* 侧边栏 */}
      <aside className="flex w-60 flex-col border-r border-slate-700 bg-slate-800">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-slate-700 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            AK
          </div>
          <span className="text-lg font-semibold tracking-wide text-slate-100">
            知识库
          </span>
        </div>

        {/* 导航 */}
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const active = activeSeg === item.path.replace('/', '');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-blue-600 font-medium text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* 用户区 */}
        <div className="border-t border-slate-700 p-3">
          <Dropdown
            label=""
            dismissOnClick
            renderTrigger={() => (
              <div className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-700">
                <Avatar size="sm" rounded>
                  {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </Avatar>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-medium text-slate-100">
                    {user?.name || user?.email}
                  </div>
                  <div className="truncate text-xs text-slate-400">{user?.role}</div>
                </div>
              </div>
            )}
          >
            <DropdownHeader>
              <div className="truncate text-sm font-medium">{user?.name || '用户'}</div>
              <div className="truncate text-xs text-slate-400">{user?.email}</div>
            </DropdownHeader>
            <DropdownItem onClick={() => navigate('/settings')}>设置</DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={logout}>
              <span className="text-red-500">退出登录</span>
            </DropdownItem>
          </Dropdown>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

/* —— 内联 SVG 图标（避免引入额外图标库） —— */
type IconProps = { className?: string };

function IconBook({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function IconChat({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
function IconSettings({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
