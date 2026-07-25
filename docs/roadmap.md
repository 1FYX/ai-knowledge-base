# AI Knowledge Base - 完善计划 (Roadmap)

> 演进路线与任务拆解。每项任务标注优先级（🔴 高 / 🟡 中 / 🟢 低）与所属里程碑。
> 本轮决策：**前端全栈迁移到 shadcn/ui**，**后端优先做 RAG 核心链路**。

## 里程碑总览

| 里程碑 | 目标 |
|---|---|
| **M1 — 工程基线加固** | 修复阻断性 bug，统一工程规范 |
| **M2 — RAG 核心链路** | 打通文档向量化 → 向量检索 → LLM 回答的主链路（最高优先） |
| **M3 — 文档处理流水线** | 文件上传、解析、切片、异步处理 |
| **M4 — 前端美化（shadcn/ui）** | 全栈迁移到现代 UI 技术栈 |
| **M5 — 体验、稳定性与生产化** | 权限、测试、缓存、CI 完善 |

---

## M1 — 工程基线加固

修复阻断性 bug 与统一工程规范。

### M1.1 🔴 已修复 / 待清理

- [x] Prisma schema 相对路径错误（改为 `prisma/schema.prisma`）
- [x] `.env` 读取失败（`dotenv-cli` 指定根 `.env`，NestJS `envFilePath`）
- [x] DB 镜像换为 `pgvector/pgvector:pg16`
- [x] Prisma 首次迁移 `init` 已生成
- [x] `@nestjs/jwt` 类型问题（`as StringValue` + 安装 `ms`/`@types/ms`）
- [x] `JwtModule` 全局化（`global: true`）解决守卫注入
- [ ] **`DocumentsModule` 漏注册第二个 controller**：`KBDocsController` 未加入 `controllers` 数组 → 前端 `docApi.list/create` 404
- [ ] **修复 SSE 流式接口**：当前 `@Sse` + `POST` + `@Body` 与 EventSource 不兼容；改为 `fetch` + `ReadableStream`（可 POST + 带 Authorization 头）
- [ ] **统一包管理器**：删除 `apps/web/package-lock.json`，改用根 `pnpm-lock.yaml`
- [ ] docker-compose 补 `redis` 服务（M5 RAG/限流依赖）
- [ ] 环境变量 schema 校验（Joi/Zod）
- [ ] 清理脚手架残留（`app.controller.spec.ts` 断言、`apps/web` 模板资源）

### M1.2 🟡 代码规范

- [ ] 消除业务代码 `any`（`AGENTS.md` 已禁用）：`KnowledgeBasesService.create/update`、各 controller `@CurrentUser() user: any` 等
- [ ] 补全 DTO：`documents`/`chat`/`search` 用 `@Body() dto: any` → class-validator DTO
- [ ] 统一 Logger（`main.ts` 仍用 `console.log`，`AGENTS.md` 已禁用）

---

## M2 — RAG 核心链路（最高优先级）

项目核心价值所在。**建议 M1 关键 bug 修复后立即推进。**

### M2.1 🔴 LLM / Embedding 抽象层

新建两个模块，封装外部依赖，便于后续切换 provider（OpenAI / Azure / 本地）。

- [ ] **`llm/` 模块**
  - `embed(texts: string[]): Promise<number[][]>` —— 批量 embedding（OpenAI `text-embedding-3-small`，1536 维）
  - `chatStream(messages, options): AsyncIterable<string>` —— 流式 chat（`gpt-4o`）
  - `chat(messages, options): Promise<string>` —— 非流式 chat
  - 配置走 env：`OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_CHAT_MODEL` / `OPENAI_EMBEDDING_MODEL`
  - `llm.module.ts`（global）、`llm.service.ts`、`llm.controller.ts`（可选，调试用）
- [ ] **`vector/` 模块**
  - `upsertChunks(chunks: { content; embedding; documentId; chunkIndex }[])` —— 批量写入 `document_chunks`
  - `search(queryEmbedding: number[], kbId: string, k: number)` —— pgvector 相似度检索
  - `deleteByDocument(documentId: string)` —— 文档删除时清理向量
  - 用 `$queryRaw` 执行 `ORDER BY embedding <=> $1 LIMIT $2`（Prisma 原生不支持 vector 运算符）

### M2.2 🔴 真实语义检索

- [ ] 重写 `SearchService.semanticSearch`：
  1. `llm.embed([query])` → 查询向量
  2. `vector.search(vec, kbId, k=5)` → pgvector 检索
  3. 返回真实 `similarity = 1 - (embedding <=> query)`（替换硬编码 `0.85`）
- [ ] 加 HNSW 索引（`docs/database.md` 已给 SQL，首次有数据后建）：
  ```sql
  CREATE INDEX idx_document_chunks_embedding_hnsw
    ON document_chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
  ```
- [ ] 新增 `POST /api/search/similar`（按 chunk 找相似，用于"相关文档"推荐）

### M2.3 🔴 真实对话回答（RAG）

- [ ] 重写 `ChatService.sendMessage` / `streamMessage`：
  1. 生成 query embedding
  2. 向量检索 top-k 片段
  3. 拼 prompt：system + 召回上下文（带来源标注）+ 最近 N 轮历史
  4. 调 `llm.chatStream` 流式返回
  5. 完成后写入 `ChatMessage`，`sources` 字段存引用（`[{documentId, chunkId, similarity, content}]`）
  6. 写入 `tokenCount` 与 `latency`（schema 已有字段，当前未写）
- [ ] SSE 接口修复后（M1.1），前端对接流式渲染

### M2.4 🟡 RAG 调优

- [ ] 召回数量、相似度阈值、重排序（可选 reranker）
- [ ] system prompt 模板化（可按知识库自定义，schema 已有 `systemPrompt`）
- [ ] 历史消息截断策略（防止 context 超限）

---

## M3 — 文档处理流水线

让"上传文档"真正产出可检索的向量。**依赖 M2 的 embedding 能力。**

### M3.1 🔴 真实文件上传

- [ ] 后端 Multer（`@nestjs/platform-express` 已装）：`@UseInterceptors(FileInterceptor)` + 磁盘/S3 存储
- [ ] 替换前端"伪上传"：`KnowledgeBaseDetail.handleFileChange` 由 POST 元数据改为 `FormData` 真实上传
- [ ] 文件大小/类型校验（PDF/DOCX/TXT/MD），返回 `Document` 记录（status=PENDING）

### M3.2 🟡 解析与切片

- [ ] 新建 `ingestion/` 模块：
  - 解析：PDF（`pdf-parse`）/ DOCX（`mammoth`）/ TXT/MD（原生）
  - 切片：按 `KnowledgeBase.chunkSize`（默认 1000）/ `chunkOverlap`（默认 200）分块，schema 已有配置
- [ ] 写入 `DocumentChunk`（content + chunkIndex + pageNumber）
- [ ] 调 `llm.embed` 生成向量 → `vector.upsertChunks`

### M3.3 🟡 异步处理

- [ ] BullMQ（依赖 Redis）：上传 → 入队 `ingestion` → worker 解析+切片+embedding+入库
- [ ] 状态机：`PENDING → PROCESSING → INDEXED` / `ERROR`（含 `errorMessage`，schema 已有）
- [ ] 前端轮询文档状态 / SSE 推送进度

---

## M4 — 前端美化（shadcn/ui 全栈迁移）

将前端从"手写内联 style + hash 路由 + 原生 fetch"升级为现代技术栈，与 `AGENTS.md` 既定方向对齐。

### 当前前端实际技术栈（迁移基线）

| 类别 | 现状 | 目标 |
|---|---|---|
| 路由 | 手写 hash 路由 | React Router v6 |
| 服务端状态 | `useState`+`useEffect`+`fetch` | TanStack Query |
| 客户端状态 | React Context | Zustand |
| 样式 | 全部内联 `style={{}}` | Tailwind CSS |
| 组件 | 手写原生标签 | shadcn/ui |

> 现状：除 React + Vite 外几乎无第三方库。内联 style 分布：Layout 10、Chat 16、KBDetail 18、KBList 16、Login 11 处。

### M4.1 🔴 基建引入

- [ ] 安装 Tailwind CSS v4 + 配置 `tailwind.config` + `index.css` 引入
- [ ] 安装 shadcn/ui（`npx shadcn@latest init`），配置路径别名 `@/*`
- [ ] 安装 React Router v6，替换手写 hash 路由（`/login` `/kbs` `/kbs/:id` `/chat/:id`）
- [ ] 安装 TanStack Query：`QueryClientProvider` 包裹 App，封装 `useQuery`/`useMutation` hooks
- [ ] 安装 Zustand：迁移 `useAuth` 状态（token/user/loading）到 store
- [ ] 重构 `lib/api.ts`：保留 fetch 封装，但 token 从 store 读，401 自动登出跳转

### M4.2 🔴 核心 UI 组件搭建

按 shadcn/ui 引入（`npx shadcn@latest add <component>`）：

- [ ] **Layout**：`Sidebar`（导航：知识库/对话）+ `Avatar`（用户头像）+ `DropdownMenu`（登出）+ `Toaster`（全局通知）
- [ ] **Login**：`Card` + `Form` + `Input` + `Button` + `Tabs`（登录/注册切换）
- [ ] **KnowledgeBases**：`Card` 网格 + `Dialog`（新建）+ `AlertDialog`（删除确认）+ `Skeleton`（加载态）
- [ ] **KnowledgeBaseDetail**：`Tabs`（文档/设置）+ 文档列表 `Table` + `Upload` 区（dropzone）+ 状态 `Badge`
- [ ] **Chat**：消息气泡 + 流式打字效果 + `sources` 引用卡片 + `Textarea` + `ScrollArea`

### M4.3 🟡 设计系统统一

- [ ] 定义主题：深色模式为主（延续现有 `#0f172a` 基调），支持浅色切换
- [ ] 统一 spacing / radius / typography（Tailwind token）
- [ ] 响应式断点（移动端可用）

### M4.4 🟢 体验增强

- [ ] Chat 流式渲染（对接 M2.3 + M1.1 SSE 修复）
- [ ] 文档处理进度展示（对接 M3.3）
- [ ] Markdown 渲染 + 代码高亮（回答里的代码块）
- [ ] 回答"复制 / 重新生成 / 反馈"操作栏
- [ ] 空状态插画 / 加载骨架屏

---

## M5 — 体验、稳定性与生产化

### M5.1 🔴 权限与安全

- [ ] **资源归属校验**：`knowledge-bases`/`documents` 的 `getById/update/delete` 均不校验 owner；`chat.sendMessage` 已校验 → 统一补齐
- [ ] RBAC 守卫（`@Roles()` 装饰器，schema 已有 `UserRole`）
- [ ] 登出 / refresh token

### M5.2 🟢 测试

- [ ] 业务模块单测覆盖率
- [ ] e2e 覆盖认证、知识库、检索、对话主链路

### M5.3 🟢 可观测性

- [ ] 请求日志拦截器、Pino/winston 接入
- [ ] 前端错误上报（可选）

### M5.4 🟢 生产化

- [ ] Redis 接入：会话、限流（`RATE_LIMIT_TTL/MAX`）、缓存
- [ ] 对象存储抽象（`STORAGE_TYPE=local|s3|minio`）
- [ ] nginx TLS / 域名
- [ ] CI：`pnpm format --check` 进流水线
- [ ] 镜像瘦身 / 多架构构建 / 漏洞扫描

---

## 建议推进顺序

1. **M1.1 剩余项** —— SSE 修复、`KBDocsController` 注册、统一包管理（半天）
2. **M2 RAG 链路** —— 核心价值，简历亮点（重点投入）
3. **M3 文档流水线** —— 让上传真正可用（依赖 M2）
4. **M4 前端美化** —— shadcn/ui 迁移（可与 M2/M3 部分并行，因前后端解耦）
5. **M5 稳定性与生产化** —— 打磨收尾

---

> 完成任务后请勾选对应 checkbox，提交信息引用里程碑编号（如 `feat(m2): implement vector search`、`feat(m4): migrate to shadcn/ui layout`）。
