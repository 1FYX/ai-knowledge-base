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
- [x] **`DocumentsModule` 漏注册第二个 controller**：`KBDocsController` 已加入 `controllers` 数组
- [x] **修复 SSE 流式接口**：改为 POST + `fetch` ReadableStream（手动写 SSE 帧），前端对接流式渲染
- [x] **修复 JWT 签发/验证 secret 不一致**：`JwtModule.registerAsync` + `ConfigService`（原 `register` 静态求值时 env 未加载，签发用 `dev-secret` 而验证用真实 secret → 401）
- [x] **统一包管理器**：删除 `apps/web/package-lock.json`，改用根 `pnpm-lock.yaml`
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

- [x] 后端 Multer：`@UseInterceptors(FileInterceptor)` + 磁盘存储（`uploads/`，启动时自动建目录）
- [x] 替换前端"伪上传"：`KnowledgeBaseDetail` 改用 `FormData` 真实上传（`docApi.upload`）
- [x] 文件大小/类型校验（PDF/DOCX/TXT/MD，20MB 上限），返回 `Document` 记录（status=PENDING）

### M3.2 🟡 解析与切片

- [x] 新建 `ingestion/` 模块：
  - 解析：PDF（`pdf-parse`）/ DOCX（`mammoth`）/ TXT/MD（原生）
  - 切片：递归切分器 `chunker.ts`，按 `KnowledgeBase.chunkSize` / `chunkOverlap` 分块
- [x] 写入 `DocumentChunk`（content + chunkIndex + pageNumber）
- [x] 调 `llm.embed` 批量生成向量（每批 16 条）→ `vector.upsertChunks`

### M3.3 🟡 异步处理

- [x] fire-and-forget 后台处理：上传接口立即返回，`IngestionService.process` 异步执行（M5 升级 BullMQ）
- [x] 状态机：`PENDING → PROCESSING → INDEXED` / `ERROR`（`errorMessage` 写入失败原因）
- [x] 前端轮询：有 PENDING/PROCESSING 文档时每 2s 刷新，直到终态

---

## M4 — 前端美化（Flowbite + GSAP）

将前端从"手写内联 style + hash 路由 + 原生 fetch"升级为现代技术栈。
> 注：原计划用 shadcn/ui，实际改用 **Flowbite React**（决策调整）。同时引入 **GSAP** 做动画。

### 实际采用的技术栈（已完成）

| 类别 | 选型 |
|---|---|
| 样式 | Tailwind CSS v4（CSS-based 配置，`@import "tailwindcss"`） |
| 组件库 | Flowbite React 0.12（`flowbite/plugin` + `@source` 扫描类名） |
| 动画 | GSAP + `@gsap/react`（`useGSAP` hook，React 19 安全集成） |
| 路由 | 自实现 `useHashRoute`（订阅 `hashchange`，修复点击不切换 bug） |
| 主题 | 暗色（`<html class="dark">`），slate-900 + blue-600 配色 |
| 健壮性 | `ErrorBoundary` 捕获渲染异常，避免黑屏 |

### M4.1 ✅ 基建引入（已完成）

- [x] Tailwind CSS v4 + `@tailwindcss/vite` 插件
- [x] Flowbite React + `flowbite/plugin`（修正：`@plugin "flowbite-react"` 是错误写法，会报 `k is not a function`）
- [x] 修复路由不切换 bug（原 `Router` 只读一次 hash，未订阅事件 → 点击侧边栏需刷新）
- [x] ErrorBoundary 全局包裹

### M4.2 ✅ 页面重写（已完成，全中文）

- [x] **Layout**：自定义侧边栏 + 导航 + Avatar Dropdown 用户菜单
- [x] **Login**：Card + Label/TextInput/Button/Alert，标题/卡片错峰入场动画
- [x] **KnowledgeBases**：Card 网格 + Modal 新建 + 空状态，卡片错峰入场
- [x] **KnowledgeBaseDetail**：Card + Badge（文档状态中文化）+ 真实上传 + 状态轮询
- [x] **Chat**：Textarea + 流式打字 + 气泡（用户右/助手左）+ 新消息滑入动画
- [x] **Settings**：LLM 配置表单（BYOK）

### M4.3 ✅ 动画（GSAP，克制专业风格 0.3–0.4s）

- [x] 页面切换转场（淡入 + 上移）
- [x] Login 标题/卡片时间轴入场
- [x] 知识库卡片错峰入场（stagger）
- [x] 对话气泡增量滑入（只对新消息动画）

### M4.4 🟢 未来增强（可选）

- [ ] TanStack Query 替代手写 `useState`+`fetch`（服务端状态管理）
- [ ] Zustand 替代 Context（客户端状态）
- [ ] Markdown 渲染 + 代码高亮（回答里的代码块）
- [ ] 回答"复制 / 重新生成 / 反馈"操作栏
- [ ] `sources` 引用卡片渲染（后端已支持，前端未展示）

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

1. ~~**M1 工程基线**~~ —— ✅ 已完成
2. ~~**M2 RAG 链路**~~ —— ✅ 已完成（BYOK + pgvector + 流式 RAG）
3. ~~**M3 文档流水线**~~ —— ✅ 已完成（上传 + 解析 + 切片 + embedding + 状态机）
4. ~~**M4 前端美化**~~ —— ✅ 已完成（Flowbite + GSAP，全中文 UI）
5. **M5 稳定性与生产化** —— 待推进：权限归属校验、BullMQ、对象存储、测试、CI 完善

> 注：M1–M4 全部完成。当前是一个**功能完整的 RAG 知识库**（需用户在设置页配置 LLM Key 即可使用）。
> M5 为生产化加固，不影响核心功能可用性。

---

> 完成任务后请勾选对应 checkbox，提交信息引用里程碑编号（如 `feat(m2): implement vector search`、`feat(m4): migrate to shadcn/ui layout`）。
