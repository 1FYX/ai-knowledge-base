import { useState, useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Button, Label, TextInput, Alert } from 'flowbite-react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../lib/api';

gsap.registerPlugin(useGSAP);

export default function LoginPage() {
  const { login } = useAuth();
  const scope = useRef<HTMLDivElement>(null);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 入场动画：标题先入，卡片随后
  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out', duration: 0.4 } });
      tl.from('[data-login-title]', { opacity: 0, y: -10 })
        .from('[data-login-card]', { opacity: 0, y: 20 }, '-=0.2');
    },
    { scope },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = isRegister
        ? await authApi.register(email, password, name || undefined)
        : await authApi.login(email, password);
      login(res.data.token, res.data.user);
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={scope} className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md">
        {/* 标题 */}
        <div data-login-title className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white">
            AK
          </div>
          <h1 className="text-2xl font-bold text-slate-100">AI 知识库</h1>
          <p className="mt-1 text-sm text-slate-400">
            {isRegister ? '创建账号' : '登录你的账号'}
          </p>
        </div>

        {/* 表单卡片 */}
        <div data-login-card className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-xl">
          {error && (
            <Alert color="failure" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <Label htmlFor="name" className="text-slate-300">
                  用户名
                </Label>
                <TextInput
                  id="name"
                  placeholder="用户名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-slate-300">
                邮箱
              </Label>
              <TextInput
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-300">
                密码
              </Label>
              <TextInput
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? '请稍候...' : isRegister ? '注册' : '登录'}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-blue-400 hover:text-blue-300 hover:underline"
            >
              {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
