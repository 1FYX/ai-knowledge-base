# AI Knowledge Base - Agent Harness

> 本文档定义了 AI 助手参与本项目开发的协作规范、架构约定和工作流程。
> 所有 AI 助手在修改代码前必须阅读此文件。

## 1. 项目概览

| 属性 | 值 |
|------|-----|
| 项目名称 | AI Knowledge Base (AKB) |
| 类型 | 智能知识管理平台 (RAG-based) |
| 架构 | Monorepo - 前后端分离 |
| 前端 | React 19 + Vite 8 + TypeScript (`apps/web`) |
| 后端 | NestJS 11 + TypeScript (`apps/api`) |
| 构建系统 | pnpm Workspace + Turborepo |
| 容器化 | Docker + Docker Compose |
| CI/CD | Harness.io (主) / GitHub Actions (备) |

## 2. 目录结构约定

```
ai-knowledge-base/
├── apps/                    # 应用层
│   ├── api/                 # NestJS 后端
│   │   ├── src/
│   │   │   ├── modules/     # 按业务模块组织
│   │   │   ├── common/      # 共享装饰器/守卫/拦截器
│   │   │   └── prisma/      # 数据库 Schema
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                 # React 前端
│       ├── src/
│       │   ├── components/  # UI 组件
│       │   ├── pages/       # 页面级组件
│       │   ├── hooks/       # 自定义 Hooks
│       │   └── lib/         # 工具函数/API 客户端
│       ├── Dockerfile
│       └── package.json
├── packages/                # 共享包
│   ├── typescript-config/   # TS 配置 presets
│   └── eslint-config/       # ESLint 配置 presets
├── .harness/                # Harness CI/CD 配置
├── nginx/                   # Nginx 配置
├── docs/                    # 架构文档
└── docker-compose*.yml      # 容器编排
```

## 3. 编码规范

### 3.1 TypeScript / 通用

- **严格模式**：所有包启用 `strict: true`
- **命名约定**：
  - 类名：PascalCase (`UserService`, `AuthController`)
  - 接口：PascalCase + `I` 前缀可选 (`IUser`, `User`)
  - 变量/函数：camelCase (`getUserById`)
  - 常量：UPPER_SNAKE_CASE (`MAX_CHUNK_SIZE`)
  - 文件：kebab-case (`auth.service.ts`, `user-card.tsx`)
- **导入顺序**：内置模块 → 外部依赖 → 内部模块 (`@akb/*`) → 相对路径
- **禁用**：`any` 类型（使用 `unknown` + 类型守卫）
- **文档**：公共 API 必须写 JSDoc / Swagger 注解

### 3.2 NestJS 后端

- **模块结构**：每个业务领域一个模块，包含 `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `entities/`
- **DTO 验证**：所有输入使用 `class-validator` + `@nestjs/swagger` 注解
- **错误处理**：使用自定义 `HttpExceptionFilter`，统一返回 `{ success: false, error: { code, message } }`
- **数据库访问**：统一通过 Prisma Service，禁止直接 `new PrismaClient()`
- **API 路径**：RESTful 风格，版本前缀 `/api/v1`（当前阶段用 `/api`）
- **环境变量**：使用 `@nestjs/config` + 验证 Schema（Joi/Zod）

### 3.3 React 前端

- **组件风格**：函数组件 + Hooks，禁用 Class 组件
- **状态管理**：
  - 服务端状态：TanStack Query (React Query)
  - 客户端状态：Zustand
- **样式**：Tailwind CSS + shadcn/ui，禁止行内样式
- **API 调用**：封装在 `src/lib/api.ts`，统一处理 token/错误/重试
- **路由**：React Router v6（如需），按功能分懒加载

## 4. AI 协作规则

### 4.1 修改代码前

1. **必须阅读相关现有文件**——不要基于假设写代码
2. **检查模块边界**——新功能属于哪个模块？是否已有相似实现？
3. **验证类型兼容性**——修改后运行 `pnpm typecheck`

### 4.2 新增功能时

1. **后端优先**：先设计 Prisma Schema → 生成 migration → 写 Service → 写 Controller → 写 DTO
2. **测试伴随**：新增 API 必须同步更新/创建 `.spec.ts` 测试
3. **文档同步**：更新 Swagger/OpenAPI 注解
4. **前端对接**：API 变更后同步更新前端类型定义 (`src/types/api.ts`)

### 4.3 禁止行为

- ❌ 修改原始媒体文件（图片/视频）——大文件先压缩再处理
- ❌ 硬编码密钥或 URL——使用环境变量
- ❌ 使用 `console.log` 提交生产代码——使用 Logger
- ❌ 提交 `node_modules` 或 `.env` 文件
- ❌ 跨 workspace 直接引用包——使用 `@akb/*` 包名
- ❌ 生成文件放在项目外——所有输出在 `D:\UGit\ai-knowledge-base` 内

### 4.4 PR 规范

- Commit 消息遵循 Conventional Commits：`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- 每个 PR 只做一件事
- 必须通过 CI（lint + typecheck + test）

## 5. 容器化开发流程

```bash
# 启动完整开发环境（含 DB + Redis + API + Web）
docker-compose up -d

# 只启动基础设施（本地开发前后端）
docker-compose up -d db redis

# 查看日志
docker-compose logs -f api

# 重建并重启
docker-compose up -d --build api
```

## 6. 技术决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-07 | Turborepo 替代 npm workspaces | 更好的构建缓存和任务管道 |
| 2026-07 | pgvector 替代专用向量数据库 | 简化架构，PostgreSQL 已足够 |
| 2026-07 | Redis Stack 替代单独向量 DB | 支持向量索引 + 缓存 + 队列 |
| 2026-07 | SSE 替代 WebSocket | Chat 单向流即可，SSE 更简单 |

## 7. 环境变量清单

详见 `docs/architecture.md` 的 Environment Variables 章节。
关键变量必须设置：
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `OPENAI_API_KEY`

## 8. 故障排查速查

| 问题 | 排查方向 |
|------|---------|
| `pnpm install` 失败 | 检查 pnpm 版本 ≥ 9.15.0，Node ≥ 20 |
| Prisma 生成失败 | 确认 `DATABASE_URL` 有效，运行 `npx prisma generate` |
| Docker 构建失败 | 检查 `.dockerignore` 未排除必要文件 |
| API 启动失败 | 检查 DB/Redis 是否已启动，端口是否占用 |
| 前端代理失败 | 确认 `vite.config.ts` 的 proxy 配置 |

---

> 本文档随项目演进持续更新。最后更新：2026-07-25
