import { useState, useEffect } from 'react';
import { Button, Label, TextInput, Alert, Card, Spinner } from 'flowbite-react';
import { userApi } from '../lib/api';
import type { LlmConfig } from '../types';

export default function SettingsPage() {
  const [config, setConfig] = useState<LlmConfig | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [chatModel, setChatModel] = useState('');
  const [embeddingModel, setEmbeddingModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    userApi
      .getLlmConfig()
      .then((res) => {
        const c = res.data;
        setConfig(c);
        setBaseUrl(c.baseUrl || '');
        setChatModel(c.chatModel || '');
        setEmbeddingModel(c.embeddingModel || '');
      })
      .catch((e) => setMsg({ type: 'err', text: e.message || '加载失败' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const payload: Record<string, string> = {
        baseUrl: baseUrl.trim(),
        chatModel: chatModel.trim(),
        embeddingModel: embeddingModel.trim(),
      };
      // apiKey 留空表示不修改；用户主动输入才提交
      if (apiKey.trim()) payload.apiKey = apiKey.trim();
      const res = await userApi.updateLlmConfig(payload);
      setConfig(res.data);
      setApiKey('');
      setMsg({ type: 'ok', text: '配置已保存' });
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">LLM 设置</h1>
        <p className="mt-1 text-sm text-slate-400">
          配置你自己的 AI 服务（BYOK）。支持任意 OpenAI 兼容端点：官方 / Azure / 国内中转 / Ollama 等。
          API Key 加密存储，仅用于调用，不会明文返回。
        </p>
      </div>

      <div className="max-w-2xl">
        {!config?.hasApiKey && (
          <Alert color="warning" className="mb-4">
            尚未配置 API Key，对话与检索功能将不可用。
          </Alert>
        )}

        {msg && (
          <Alert color={msg.type === 'ok' ? 'success' : 'failure'} className="mb-4">
            {msg.text}
          </Alert>
        )}

        <Card className="border-slate-700 bg-slate-800">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <Label htmlFor="base-url" className="text-slate-300">
                Base URL
              </Label>
              <TextInput
                id="base-url"
                placeholder="https://api.openai.com/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                required
                className="mt-1"
              />
              <p className="mt-1 text-xs text-slate-500">
                OpenAI 兼容端点。示例：官方 https://api.openai.com/v1
              </p>
            </div>

            <div>
              <Label htmlFor="api-key" className="text-slate-300">
                API Key{' '}
                {config?.hasApiKey ? (
                  <span className="text-xs text-slate-500">（已配置，留空则不修改）</span>
                ) : (
                  <span className="text-xs text-amber-400">（必填）</span>
                )}
              </Label>
              <TextInput
                id="api-key"
                type="password"
                placeholder={config?.hasApiKey ? '已配置（如需更新请输入新 key）' : 'sk-...'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="chat-model" className="text-slate-300">
                  Chat 模型
                </Label>
                <TextInput
                  id="chat-model"
                  placeholder="gpt-4o"
                  value={chatModel}
                  onChange={(e) => setChatModel(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="embedding-model" className="text-slate-300">
                  Embedding 模型
                </Label>
                <TextInput
                  id="embedding-model"
                  placeholder="text-embedding-3-small"
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                  required
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-amber-400">
                  ⚠ 文档向量化与知识库对话依赖 Embedding 能力。请确保所选服务提供该接口——
                  如 DeepSeek、Moonshot 等仅有 Chat 能力，不可用于此处；
                  推荐用 OpenAI（text-embedding-3-small）或本地 Ollama。
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? '保存中...' : '保存配置'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
