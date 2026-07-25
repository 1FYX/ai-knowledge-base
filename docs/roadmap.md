# AI Knowledge Base - 完善计划 (Roadmap)

> 演进路线与任务拆解。每项任务标注优先级（🔴 高 / 🟡 中 / 🟢 低）与所属里程碑。

## 里程碑总览

| 里程碑 | 目标 |
|---|---|
| **M1 — 工程基线加固** | 修复阻断性 bug，统一工程规范 |
| **M2 — RAG 核心链路** | 打通文档向量化 → 向量检索 → LLM 回答的主链路 |
| **M3 — 文档处理流水线** | 文件上传、解析、切片、异步处理 |
| **M4 — 体验与稳定性** | 前端补齐、权限完善、测试与可观测性 |
| **M5 — 生产化** | 缓存、限流、对象存储、CI 完善 |

---

## M1 — 工程基线加固（优先做，阻断后续）

修复阻断性 bug 与统一工程规范。

### M1.1 🔴 修复阻断性 Bug

- [ ] **`DocumentsModule` 漏注册第二个 controller**
  - `documents.module.ts` 的 `controllers` 只声明了 `DocumentsController`，`KBDocsController`（路由 `knowledge-bases/:kbId/documents`）未注册 → 前端 `docApi.list/create` 实际 404。
  - 修复：将 `KBDocsController` 加入 `controllers` 数组。

- [ ] **修复 SSE 流式接口**
  - `ChatController.streamMessage` 用 `@Sse` + `POST` + `@Body`；浏览器 `EventSource` 仅支持 GET 且无法发 body；前端 `chatApi.streamMessage` 构造的 EventSource 未带 token 也未传 content。
  - 方案：改为 GET，query 传 `content` 与 token；或改用 fetch + `ReadableStream`（可 POST + 带 Authorization 头）。推荐后者以避免 token 进 URL。

- [ ] **统一包管理器**
  - `apps/web/package-lock.json`（npm）与 monorepo 的 pnpm 体系冲突，Dockerfile/CI 均按 pnpm workspace 跑。
  - 修复：删除 `apps/web/package-lock.json`，统一用根 `pnpm-lock.yaml`。

- [ ] **Prisma schema 路径一致性**
  - 根 `package.json` 的 `db:seed` 用 `ts-node apps/api/prisma/seed.ts`，需在根目录运行；`prisma.schema` 配置路径与相对引用需复核。
  - 修复：确认所有 prisma 命令的 cwd，或改为 `prisma db seed` + 配置。

### M1.2 🟡 补齐工程基建

- [ ] **添加 Prisma 迁移文件**
  - `apps/api/prisma/` 下无 migrations 目录。
  - 任务：执行 `prisma migrate dev --name init` 并提交 `migrations/`，保证开箱即用。

- [ ] **docker-compose 补齐 Redis 与 pgvector 初始化**
  - `docker-compose.yml` 无 redis 服务（架构文档与限流设计依赖 Redis）；DB 镜像需替换为 `pgvector/pgvector:pg16`。
  - 任务：①加 `redis` 服务；②DB 镜像替换为 pgvector 官方镜像；③加初始化脚本 `CREATE EXTENSION IF NOT EXISTS vector;`。

- [ ] **环境变量校验**
  - `@nestjs/config` 已全局注入但无 schema 校验。
  - 任务：用 Joi 或 Zod 定义 env schema，启动时校验。

- [ ] **清理脚手架残留**
  - 更新 `app.controller.spec.ts` 断言；移除 `apps/web` 默认模板资源（`App.css`、`assets/react.svg` 等）。

### M1.3 🟢 代码规范对齐

- [ ] 消除业务代码中的 `any`（`AGENTS.md` 已禁用）：`KnowledgeBasesService.create/update(dto: any)`、各 controller 的 `@CurrentUser() user: any` 等，改为定义 DTO 与 `JwtPayload` 类型。
- [ ] DTO 补全：`documents`、`chat`、`search` 模块用 `@Body() dto: any`，需补 class-validator DTO。

---

## M2 — RAG 核心链路（项目价值所在）

把"假"的 RAG 变成"真"的。**建议在 M1 完成后立即推进。**

### M2.1 🔴 LLM 与 Embedding 抽象层

- [ ] 新建 `llm/` 模块：封装 OpenAI client，暴露 `embed(text): Promise<number[]>` 与 `chatStream(messages): AsyncIterable<string>`。
- [ ] 新建 `vector/` 模块：封装 pgvector 读写，暴露 `upsertEmbedding(chunk, vector)`、`search(vector, kbId, k)`。
- [ ] 配置 OpenAI base url / model 到 env（`.env.example` 已有），支持 Azure OpenAI / 本地模型切换。

### M2.2 🔴 真实语义检索

- [ ] 重写 `SearchService.semanticSearch`：
  1. 调 `llm.embed(query)` 生成查询向量；
  2. pgvector `ORDER BY embedding <=> query_embedding LIMIT k`；
  3. 返回真实 `similarity = 1 - (embedding <=> query)`（替换硬编码的 `0.85`）。
- [ ] 加 HNSW / IVFFlat 索引（`docs/database.md` 已给 SQL）。

### M2.3 🔴 真实对话回答（接入 LLM + RAG）

- [ ] 重写 `ChatService.sendMessage` / `streamMessage`：
  1. 生成 query embedding；
  2. 向量检索 top-k 片段；
  3. 拼 system prompt + 召回上下文 + 历史；
  4. 调 `llm.chatStream` 流式返回；
  5. 把召回片段写入 `ChatMessage.sources`（供前端展示引用）。
- [ ] 保存 `tokenCount` 与 `latency`（schema 已有字段，当前未写入）。

---

## M3 — 文档处理流水线

让"上传文档"真正产出可检索的向量。

### M3.1 🔴 真实文件上传

- [ ] 后端引入 Multer（`@nestjs/platform-express` 已装）：`@Post` + `@UseInterceptors(FileInterceptor)` + 磁盘/S3 存储。
- [ ] 替换前端"伪上传"：`KnowledgeBaseDetail.handleFileChange` 由 POST 元数据改为 `FormData` 真实上传。
- [ ] 文件大小/类型校验，返回 `Document` 记录与状态。

### M3.2 🟡 文档解析与切片

- [ ] 新建 `ingestion/` 模块：
  - 解析：PDF / DOCX / TXT / MD（建议 `pdf-parse` + `mammoth` + 原生读取，或 LangChain text splitter）。
  - 切片：按 `KnowledgeBase.chunkSize` / `chunkOverlap`（schema 已有配置，当前未消费）分块。
- [ ] 写入 `DocumentChunk`（content + chunkIndex + pageNumber）。

### M3.3 🟡 异步处理

- [ ] 引入 BullMQ（基于 Redis），定义 `ingestion` 队列：上传 → 入队 → worker 解析+切片+embedding+入库。
- [ ] 文档状态机：`PENDING → PROCESSING → INDEXED` / `ERROR`（含 `errorMessage`，schema 已有字段）。
- [ ] 前端轮询或 SSE 推送处理进度。

---

## M4 — 体验与稳定性

### M4.1 🔴 权限与安全

- [ ] **资源归属校验**：`knowledge-bases` 的 `getById/update/delete`、`documents` 的 `getById/delete` 均不校验 owner，任何登录用户可操作他人数据；`chat.sendMessage` 已校验 —— 需统一补齐。
- [ ] 引入 RBAC 守卫（`@Roles()` 装饰器，schema 已有 `UserRole`）。
- [ ] 登出 / refresh token。

### M4.2 🟡 前端补齐

- [ ] **与文档设计对齐**：`AGENTS.md` 规划了 Tailwind + shadcn/ui + TanStack Query + Zustand + React Router，需决定补齐技术栈或更新文档。
- [ ] 对接 SSE 流式（依赖 M1.1 的接口修复）。
- [ ] 展示回答的 `sources` 引用。
- [ ] 文档上传后的状态轮询 / 进度展示。

### M4.3 🟢 测试

- [ ] 业务模块单测覆盖率。
- [ ] e2e 测试覆盖认证、知识库、检索主链路。

### M4.4 🟢 可观测性

- [ ] 统一 Logger（`AGENTS.md` 禁用 `console.log`）。
- [ ] 请求日志拦截器、Pino 或 winston 接入。

---

## M5 — 生产化

- [ ] Redis 接入：会话、限流（`RATE_LIMIT_TTL/MAX`）、缓存。
- [ ] 对象存储抽象（`STORAGE_TYPE=local|s3|minio`）。
- [ ] nginx TLS / 域名配置。
- [ ] CI：`pnpm format --check` 进流水线。
- [ ] 生产镜像瘦身 / 多架构构建 / 镜像漏洞扫描。

---

## 建议推进顺序

1. **M1（工程基线）** —— 修阻断性 bug + 补迁移 + 统一包管理。
2. **M2（RAG 链路）** —— 项目核心价值，建议优先于 M3。
3. **M4.1（权限）** —— 安全问题，可与 M2 并行。
4. **M3（文档流水线）** —— 让上传真正可用。
5. **M4 / M5** —— 体验打磨与生产化。

---

> 本文档随项目演进持续更新。完成任务后请勾选对应 checkbox 并在提交信息中引用里程碑编号（如 `feat(m2): implement vector search`）。
