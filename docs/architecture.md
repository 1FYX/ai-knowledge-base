# AI Knowledge Base - System Architecture

## Overview

AI Knowledge Base (AKB) 是一个基于 RAG (Retrieval-Augmented Generation) 的智能知识管理平台，支持文档上传、向量化存储、AI 问答和知识库管理。

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  Web App    │  │  Mobile App │  │  Browser Ext│  │  CLI Tool  │ │
│  │  (React)    │  │  (Future)   │  │  (Future)   │  │  (Future)  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
│         └─────────────────┴─────────────────┴───────────────┘        │
│                              │                                       │
│                         Nginx (Reverse Proxy)                        │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                         API Layer (NestJS)                           │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ Auth Module  │  │ Docs Module  │  │ Chat Module  │  │ KB Module│ │
│  │ - JWT/OAuth  │  │ - Upload     │  │ - Streaming  │  │ - CRUD   │ │
│  │ - RBAC       │  │ - Parse      │  │ - History    │  │ - Share  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────┬─────┘ │
│         └─────────────────┴─────────────────┴────────────────┘       │
│                              │                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │ RAG Pipeline │  │ Vector Store │  │      Cache Layer           │ │
│  │ - Chunking   │  │ - Embedding  │  │  Redis (Session/Cache/     │ │
│  │ - Embedding  │  │ - Search     │  │  RateLimit/Vector)         │ │
│  │ - Retrieval  │  │ - Index      │  │                            │ │
│  └──────────────┘  └──────────────┘  └────────────────────────────┘ │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                      Data Layer                                      │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  PostgreSQL     │  │  Redis          │  │  Object Storage     │  │
│  │  - Users        │  │  - Sessions     │  │  - Documents        │  │
│  │  - Documents    │  │  - Cache        │  │  - Attachments      │  │
│  │  - Chunks       │  │  - Rate Limits  │  │  - MinIO/S3         │  │
│  │  - Chat History │  │  - Pub/Sub      │  │                     │  │
│  │  - KnowledgeBase│  │  - Vector (Redis│  │                     │  │
│  └─────────────────┘  │     Stack)      │  └─────────────────────┘  │
│                       └─────────────────┘                            │
│                                                                      │
│  External Services: OpenAI / Azure OpenAI / Anthropic / Local LLM    │
└──────────────────────────────────────────────────────────────────────┘
```

## Domain Model

### Core Entities

```
User (用户)
├── id: UUID (PK)
├── email: String (unique)
├── name: String
├── avatar: String (URL)
├── role: Enum [USER, ADMIN]
├── createdAt: DateTime
└── updatedAt: DateTime

KnowledgeBase (知识库)
├── id: UUID (PK)
├── name: String
├── description: String?
├── ownerId: UUID (FK -> User)
├── embeddingModel: String
├── chunkSize: Int
├── chunkOverlap: Int
├── isPublic: Boolean
├── createdAt: DateTime
├── updatedAt: DateTime
└── documents: Document[]

Document (文档)
├── id: UUID (PK)
├── knowledgeBaseId: UUID (FK)
├── filename: String
├── originalName: String
├── mimeType: String
├── fileSize: Int
├── filePath: String (storage path)
├── pageCount: Int?
├── status: Enum [PENDING, PROCESSING, INDEXED, ERROR]
├── metadata: JSON
├── createdAt: DateTime
├── updatedAt: DateTime
└── chunks: DocumentChunk[]

DocumentChunk (文档片段)
├── id: UUID (PK)
├── documentId: UUID (FK)
├── content: Text
├── embedding: Vector(1536)  // OpenAI text-embedding-3-small
├── chunkIndex: Int
├── pageNumber: Int?
├── metadata: JSON
└── createdAt: DateTime

ChatSession (对话会话)
├── id: UUID (PK)
├── userId: UUID (FK)
├── knowledgeBaseId: UUID? (FK)
├── title: String (auto-generated)
├── model: String
├── temperature: Float
├── createdAt: DateTime
└── messages: ChatMessage[]

ChatMessage (对话消息)
├── id: UUID (PK)
├── sessionId: UUID (FK)
├── role: Enum [USER, ASSISTANT, SYSTEM]
├── content: Text
├── sources: JSON[]  // [{documentId, chunkId, similarity, content}]
├── tokenCount: Int
├── latency: Int (ms)
└── createdAt: DateTime
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + Vite 8 + TypeScript | Web UI |
| UI Components | shadcn/ui + Tailwind CSS | Component library |
| State Management | TanStack Query + Zustand | Server/client state |
| Backend | NestJS 11 + TypeScript | API framework |
| ORM | Prisma | Database access |
| Auth | Passport.js + JWT | Authentication |
| Vector DB | PostgreSQL + pgvector | Vector storage |
| Cache | Redis 7 | Session, cache, rate limit |
| Message Queue | BullMQ (Redis) | Background jobs |
| Document Parsing | LangChain + Unstructured | PDF/DOCX parsing |
| Embeddings | OpenAI text-embedding-3-small | Text embedding |
| LLM | OpenAI GPT-4o / Claude 3.5 | AI response |
| Streaming | SSE (Server-Sent Events) | Real-time chat |
| Container | Docker + Docker Compose | Containerization |
| CI/CD | Harness.io / GitHub Actions | Pipeline |

## API Design

### Authentication
```
POST   /api/auth/register          # User registration
POST   /api/auth/login             # User login
POST   /api/auth/logout            # User logout
POST   /api/auth/refresh           # Refresh token
GET    /api/auth/me                # Get current user
```

### Knowledge Base
```
GET    /api/knowledge-bases        # List knowledge bases
POST   /api/knowledge-bases        # Create knowledge base
GET    /api/knowledge-bases/:id    # Get knowledge base detail
PATCH  /api/knowledge-bases/:id    # Update knowledge base
DELETE /api/knowledge-bases/:id    # Delete knowledge base
POST   /api/knowledge-bases/:id/share    # Share knowledge base
```

### Documents
```
GET    /api/knowledge-bases/:kbId/documents       # List documents
POST   /api/knowledge-bases/:kbId/documents       # Upload document
GET    /api/documents/:id                          # Get document
DELETE /api/documents/:id                          # Delete document
GET    /api/documents/:id/status                   # Get processing status
```

### Chat
```
GET    /api/chat/sessions          # List chat sessions
POST   /api/chat/sessions          # Create chat session
GET    /api/chat/sessions/:id      # Get session with messages
DELETE /api/chat/sessions/:id      # Delete session
POST   /api/chat/sessions/:id/messages/stream    # Send message (SSE streaming)
POST   /api/chat/sessions/:id/regenerate         # Regenerate last response
```

### Search (RAG)
```
POST   /api/search                  # Semantic search across knowledge base
POST   /api/search/similar          # Find similar chunks
```

## Data Flow

### Document Ingestion Flow
```
1. User uploads document → POST /api/documents
2. API saves file to object storage
3. Queue job: Parse & Chunk document
4. Worker: Extract text (PDF/DOCX/TXT/MD)
5. Worker: Split into chunks (configurable size/overlap)
6. Worker: Generate embeddings via OpenAI
7. Worker: Store chunks + embeddings in pgvector
8. Update document status → INDEXED
```

### Chat Flow (RAG)
```
1. User sends message → POST /api/chat/sessions/:id/messages/stream
2. API generates embedding of user query
3. Vector search: top-k relevant chunks from knowledge base
4. Build context: system prompt + retrieved chunks + chat history
5. Stream LLM response via SSE
6. Save assistant message with source citations
```

## Module Structure (Backend)

```
apps/api/src/
├── main.ts                    # Application bootstrap
├── app.module.ts              # Root module
├── config/                    # Configuration management
│   ├── app.config.ts
│   ├── database.config.ts
│   └── redis.config.ts
├── common/                    # Shared utilities
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── auth/                      # Authentication module
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── dto/
│   └── strategies/
├── users/                     # User module
├── knowledge-bases/           # Knowledge base module
├── documents/                 # Document management module
├── chunks/                    # Document chunk module
├── chat/                      # Chat module
├── search/                    # RAG search module
├── ingestion/                 # Background ingestion worker
│   ├── ingestion.module.ts
│   ├── ingestion.processor.ts
│   └── ingestion.service.ts
├── vector/                    # Vector store abstraction
│   ├── vector.module.ts
│   └── vector.service.ts
├── llm/                       # LLM provider abstraction
│   ├── llm.module.ts
│   └── llm.service.ts
└── prisma/                    # Database schema & client
    ├── schema.prisma
    └── seed.ts
```

## Environment Variables

```bash
# Application
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_knowledge_base

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# AI / LLM
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o

# Storage (Optional)
STORAGE_TYPE=local          # local | s3 | minio
STORAGE_LOCAL_PATH=./uploads
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```
