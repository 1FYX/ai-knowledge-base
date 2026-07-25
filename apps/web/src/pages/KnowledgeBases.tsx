import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Button, Card, Modal, ModalHeader, ModalBody, Label, TextInput, Textarea, Spinner } from 'flowbite-react';
import { useHashRoute } from '../hooks/useHashRoute';
import { kbApi } from '../lib/api';

gsap.registerPlugin(useGSAP);

export default function KnowledgeBasesPage() {
  const { navigate } = useHashRoute();
  const scope = useRef<HTMLDivElement>(null);
  const [kbs, setKbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchKbs = async () => {
    try {
      const res = await kbApi.list();
      setKbs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKbs();
  }, []);

  // 卡片错峰入场：只对"新出现"的卡片播一次，避免轮询/重渲染时反复触发导致卡在透明态。
  // 用 fromTo 明确起止 + 先 kill 清理，防止中断后残留 inline style。
  const seenIds = useRef<Set<string>>(new Set());
  useGSAP(
    () => {
      if (kbs.length === 0) return;
      const newOnes = kbs.filter((kb) => !seenIds.current.has(kb.id));
      if (newOnes.length === 0) return;
      newOnes.forEach((kb) => seenIds.current.add(kb.id));

      // 只选 DOM 里"新卡片"对应的节点
      const nodes = newOnes
        .map((kb) => scope.current?.querySelector(`[data-anim-card][data-id="${kb.id}"]`))
        .filter(Boolean) as Element[];
      if (nodes.length === 0) return;

      gsap.killTweensOf(nodes);
      gsap.fromTo(
        nodes,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
          stagger: 0.06,
          clearProps: 'all', // 动画结束清除 inline style，避免残留
        },
      );
    },
    { scope, dependencies: [kbs] },
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await kbApi.create({ name, description: desc });
      setShowForm(false);
      setName('');
      setDesc('');
      fetchKbs();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('确定删除这个知识库吗？')) return;
    await kbApi.delete(id);
    fetchKbs();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div ref={scope} className="p-8">
      {/* 头部 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">知识库</h1>
          <p className="mt-1 text-sm text-slate-400">管理你的知识库与文档</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <span className="mr-1 text-lg leading-none">+</span> 新建知识库
        </Button>
      </div>

      {/* 空状态 */}
      {kbs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 py-20">
          <div className="mb-3 text-5xl opacity-30">📚</div>
          <p className="text-slate-400">还没有知识库，点击右上角创建第一个</p>
        </div>
      ) : (
        /* 卡片网格 */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kbs.map((kb) => (
            // 外层用 div+role=button（不能用 <button>，因为内部还有删除按钮，
            // HTML 禁止 button 嵌套 button）
            <div
              key={kb.id}
              data-anim-card
              data-id={kb.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/kbs/${kb.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/kbs/${kb.id}`);
                }
              }}
              className="group cursor-pointer rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Card className="h-full border-slate-700 bg-slate-800 transition-all hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10">
                <div className="flex flex-col">
                  <h3 className="mb-2 text-lg font-semibold text-slate-100 group-hover:text-blue-400">
                    {kb.name}
                  </h3>
                  <p className="mb-4 line-clamp-2 min-h-[2.5rem] flex-1 text-sm text-slate-400">
                    {kb.description || '暂无描述'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{kb._count?.documents || 0} 篇文档</span>
                    <span>{new Date(kb.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, kb.id)}
                    className="mt-3 text-left text-xs text-red-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-300"
                  >
                    删除
                  </button>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* 新建 Modal */}
      <Modal show={showForm} onClose={() => setShowForm(false)} size="md">
        <ModalHeader>新建知识库</ModalHeader>
        <ModalBody>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="kb-name" className="text-slate-300">
                名称
              </Label>
              <TextInput
                id="kb-name"
                placeholder="例如：产品文档库"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="kb-desc" className="text-slate-300">
                描述
              </Label>
              <Textarea
                id="kb-desc"
                placeholder="简要描述这个知识库的用途（可选）"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button color="gray" type="button" onClick={() => setShowForm(false)}>
                取消
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? '创建中...' : '创建'}
              </Button>
            </div>
          </form>
        </ModalBody>
      </Modal>
    </div>
  );
}
