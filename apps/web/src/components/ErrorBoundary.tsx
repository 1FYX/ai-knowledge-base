import { Component, ReactNode } from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 错误边界：捕获子组件渲染异常，避免整个页面黑屏/白屏。
 * 显示错误详情，便于定位问题。
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('ErrorBoundary 捕获：', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
          <div className="w-full max-w-xl rounded-2xl border border-red-800 bg-slate-800 p-6">
            <h2 className="mb-3 text-xl font-bold text-red-400">页面渲染出错</h2>
            <p className="mb-4 text-sm text-slate-300">
              组件渲染时抛出了异常。请把下面的错误信息反馈给开发者：
            </p>
            <pre className="overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-red-300">
              {this.state.error?.message || String(this.state.error)}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
