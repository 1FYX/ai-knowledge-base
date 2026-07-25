import { useState, useEffect } from 'react';
import { Button, Badge, Card, Spinner } from 'flowbite-react';
import { useHashRoute } from '../hooks/useHashRoute';
import { kbApi, docApi, chatApi } from '../lib/api';

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待处理', color: 'warning' },
  PROCESSING: { label: '处理中', color: 'info' },
  INDEXED: { label: '已索引', color: 'success' },
  ERROR: { label: '失败', color: 'failure' },
};

export default function KnowledgeBaseDetailPage() {
  const { segments, navigate } = useHashRoute();
  const id = segments[1]; // /kbs/:id
  const [kb, setKb] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [kbRes, docsRes] = await Promise.all([kbApi.get(id), docApi.list(id)]);
      setKb(kbRes.data);
      setDocs(docsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // 真实文件上传：FormData 上传 → 后台异步解析向量化 → 轮询状态直到完成
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    // 清空 input value，允许重复选同一文件
    e.target.value = '';
    try {
      await docApi.upload(id, file);
      await fetchData();
    } catch (err) {
      alert('上传失败：' + (err as Error).message);
    }
  };

  // 轮询：只要有 PENDING/PROCESSING 的文档，每 2s 刷新一次
  useEffect(() => {
    const hasPending = docs.some((d) => d.status === 'PENDING' || d.status === 'PROCESSING');
    if (!hasPending) return;
    const timer = setInterval(fetchData, 2000);
    return () => clearInterval(timer);
  }, [docs]);

  const startChat = async () => {
    if (!id) return;
    const res = await chatApi.createSession({
      title: `与「${kb?.name}」对话`,
      knowledgeBaseId: id,
    });
    navigate(`/chat/${res.data.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }
  if (!kb) {
    return <div className="p-8 text-red-400">未找到该知识库</div>;
  }

  return (
    <div className="p-8">
      {/* 头部 */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/kbs')}
            className="mb-2 text-sm text-slate-400 hover:text-slate-200"
          >
            ← 返回知识库列表
          </button>
          <h1 className="text-2xl font-bold text-slate-100">{kb.name}</h1>
          <p className="mt-1 text-sm text-slate-400">{kb.description || '暂无描述'}</p>
        </div>
        <div className="flex gap-2">
          <Button color="purple" onClick={startChat}>
            💬 基于知识库对话
          </Button>
          <Button>
            <label className="cursor-pointer">
              + 上传文档
              <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={handleUpload} />
            </label>
          </Button>
        </div>
      </div>

      {/* 文档列表 */}
      <h2 className="mb-4 text-lg font-semibold text-slate-100">文档（{docs.length}）</h2>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 py-16">
          <div className="mb-3 text-4xl opacity-30">📄</div>
          <p className="text-slate-400">暂无文档，点击右上角上传</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => {
            const meta = STATUS_META[doc.status] || { label: doc.status, color: 'gray' };
            return (
              <Card key={doc.id} className="border-slate-700 bg-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-100">{doc.originalName}</span>
                    <Badge color={meta.color as any}>{meta.label}</Badge>
                  </div>
                  <span className="text-xs text-slate-500">{(doc.fileSize / 1024).toFixed(1)} KB</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
