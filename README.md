# AI Knowledge Base (AKB)

> 基于 RAG（检索增强生成）的智能知识管理平台：上传文档 → 自动向量化 → 与你的知识库对话。

[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-success)](.github/workflows/ci.yml)
[![Backend](https://img.shields.io/badge/backend-NestJS%2011-ea2845)](apps/api)
[![Frontend](https://img.shields.io/badge/frontend-React%2019-61dafb)](apps/web)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

## ✨ 简介

AKB 让用户创建知识库、上传文档（PDF / DOCX / TXT / MD），平台自动完成解析、切片、向量化入库；随后用户可针对该知识库发起对话，系统通过语义检索召回相关片段，结合 LLM 生成带引用来源的回答，并以 SSE 流式返回。

### 核心能力

- 🔐 **认证**：JWT 注册 / 登录 / 获取当前用户，bcrypt 加盐
- 📚 **知识库管理**：创建 / 列表 / 详情 / 更新 / 删除，按 owner 隔离
- 📄 **文档管理**：上传 / 列表 / 详情 / 删除，含处理状态流转（PENDING → PROCESSING → INDEXED / ERROR）
- 💬 **对话**：会话 CRUD，支持 SSE 流式响应（基于召回上下文的 RAG 回答）
- 🔎 **语义检索**：基于 pgvector 的向量相似度搜索

## 🧱 技术栈

| 层 | 技术 |
|---|---|
| Monorepo | pnpm Workspace 9.15 + Turborepo 2.5 |
| 前端 | React 19 · Vite 8 · TypeScript |
| 后端 | NestJS 11 · Prisma 6 · TypeScript |
| 数据库 | PostgreSQL 16 + pgvector（向量存储） |
| 认证 | JWT + bcrypt（计划 Passport） |
| AI | OpenAI（embedding `text-embedding-3-small` · chat `gpt-4o`） |
| 流式 | Server-Sent Events (SSE) |
| 容器化 | Docker（多阶段构建）+ Docker Compose |
| CI/CD | Harness（主）/ GitHub Actions（备） |

## 📂 目录结构

```
ai-knowledge-base/
├── apps/
│   ├── api/                 # NestJS 后端
│   │   ├── src/
│   │   │   ├── auth/            # 认证模块
│   │   │   ├── users/           # 用户模块
│   │   │   ├── knowledge-bases/ # 知识库模块
│   │   │   ├── documents/       # 文档模块
│   │   │   ├── chat/            # 对话模块（SSE 流式）
│   │   │   ├── search/          # 语义检索模块
│   │   │   ├── common/          # 守卫 / 装饰器 / 异常过滤器
│   │   │   └── prisma/          # Prisma 服务
│   │   └── prisma/             # schema.prisma + seed.ts
│   └── web/                 # React 前端
│       └── src/
│           ├── pages/           # Login / KnowledgeBases / KnowledgeBaseDetail / Chat
│           ├── components/      # Layout
│           ├── hooks/           # useAuth / useParams
│           ├── lib/             # api 客户端
│           └── types/           # 接口类型
├── packages/                # 共享配置（typescript-config / eslint-config）
├── docs/                    # 架构文档（architecture.md / database.md / roadmap.md）
├── nginx/                   # 生产环境 nginx 配置
├── docker-compose.yml       # 开发环境编排
└── docker-compose.prod.yml  # 生产环境编排
```

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 20
- **pnpm** ≥ 9.15
- **Docker** + **Docker Compose**（推荐，用于跑数据库）

> 💡 推荐用 Docker 跑基础设施（PostgreSQL），前后端在本地启动以获得 HMR。

### 1. 克隆并安装依赖

```bash
git clone <repo-url> ai-knowledge-base
cd ai-knowledge-base
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，至少设置：
#   DATABASE_URL      —— 数据库连接串
#   JWT_SECRET        —— JWT 签名密钥（生产环境务必替换为随机串）
#   OPENAI_API_KEY    —— OpenAI API Key（RAG 功能必需）
```

### 3. 启动数据库

```bash
# 启动 PostgreSQL（含 pgvector）
docker compose up -d db
```

### 4. 初始化数据库

> 首次运行需启用 pgvector 扩展并执行迁移。

```bash
# 启用 pgvector 扩展
docker compose exec db psql -U akb -d ai_knowledge_base -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 进入 api 目录执行 Prisma 迁移与种子
cd apps/api
pnpm db:generate      # 生成 Prisma Client
pnpm db:migrate       # 创建表结构（生成首次迁移）
pnpm db:seed          # 写入种子用户（admin@akb.local / admin123）
cd ../..
```

### 5. 启动开发服务

```bash
# 方式 A（推荐）：在项目根目录一键启动前后端（HMR）
pnpm dev

# 方式 B：分终端启动
pnpm --filter api start:dev   # 后端：http://localhost:3000
pnpm --filter web dev         # 前端：http://localhost:5173
```

前端通过 Vite proxy 将 `/api` 转发到后端（见 `apps/web/vite.config.ts`），前端访问 **http://localhost:5173** 即可。

默认账号：`admin@akb.local` / `admin123`

## 🐳 全容器化启动

```bash
# 构建并启动完整环境（PostgreSQL + API + Web/nginx）
docker compose up -d --build

# 服务地址：
#   前端  http://localhost        (nginx)
#   API   http://localhost:3000/api
#   健康检查 http://localhost:3000/health
```

生产环境：

```bash
docker compose -f docker-compose.prod.yml up -d
```

## 🛠️ 常用脚本

在项目根目录执行：

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 并行启动前后端开发服务 |
| `pnpm build` | 构建所有 workspace |
| `pnpm test` | 运行测试 |
| `pnpm lint` | ESLint 检查 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm docker:up` | 启动全部容器 |
| `pnpm docker:logs` | 查看容器日志 |
| `pnpm docker:down` | 停止容器 |

数据库脚本（在 `apps/api/` 下）：

| 命令 | 作用 |
|---|---|
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:migrate` | 创建 / 应用迁移 |
| `pnpm db:seed` | 写入种子数据 |
| `pnpm db:studio` | 启动 Prisma Studio 可视化 |

## 📡 API 概览

所有接口以 `/api` 为前缀，需鉴权的接口在 `Authorization: Bearer <token>` 头携带 JWT。

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/me` | 解析 token 获取用户 |
| GET | `/api/users/me` | 当前用户信息 |
| GET/POST | `/api/knowledge-bases` | 列表 / 创建知识库 |
| GET/PATCH/DELETE | `/api/knowledge-bases/:id` | 详情 / 更新 / 删除 |
| GET/POST | `/api/knowledge-bases/:kbId/documents` | 文档列表 / 上传 |
| GET/DELETE | `/api/documents/:id` | 文档详情 / 删除 |
| GET/POST | `/api/chat/sessions` | 会话列表 / 创建 |
| GET/DELETE | `/api/chat/sessions/:id` | 会话详情 / 删除 |
| POST | `/api/chat/sessions/:id/messages` | 发送消息 |
| GET | `/api/chat/sessions/:id/messages/stream` | 流式回答（SSE） |
| POST | `/api/search` | 语义检索 |
| GET | `/api/health` | 健康检查 |

完整接口设计与数据流参见 [`docs/architecture.md`](docs/architecture.md)。

## 📚 文档

- [架构设计](docs/architecture.md) — 系统架构、领域模型、数据流
- [数据库设计](docs/database.md) — Prisma schema、pgvector 索引、Redis 结构
- [完善计划](docs/roadmap.md) — 里程碑与任务拆解
- [协作规范](AGENTS.md) — 编码规范、模块约定、AI 协作规则

## 🤝 协作

- Commit 消息遵循 [Conventional Commits](https://www.conventionalcommits.org/)（`feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:`）
- 每个 PR 只做一件事，须通过 CI（lint + typecheck + test）
- 修改代码前请阅读 [`AGENTS.md`](AGENTS.md)

## License

MIT
