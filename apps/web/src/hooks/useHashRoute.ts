import { useEffect, useState, useCallback } from 'react';

export interface Route {
  /** 完整路径，如 /kbs/abc-123 */
  path: string;
  /** 路径分段，如 ['kbs', 'abc-123'] */
  segments: string[];
}

/**
 * 解析 hash 路由。订阅 hashchange 事件——这是修复"点击侧边栏不切换"bug 的关键：
 * 原实现只读一次 window.location.hash，hash 变化后组件不 re-render，必须刷新页面。
 *
 * 约定：路由用 hash 存储（#/kbs、#/kbs/:id、#/chat、#/chat/:id、#/settings）。
 */
export function useHashRoute(): Route & { navigate: (to: string) => void } {
  const parse = useCallback((): Route => {
    const hash = window.location.hash.replace(/^#/, '');
    const path = hash.split('?')[0] || '/';
    const segments = path.split('/').filter(Boolean);
    return { path, segments };
  }, []);

  const [route, setRoute] = useState<Route>(parse);

  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, [parse]);

  /** 编程式导航 */
  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return { ...route, navigate };
}
