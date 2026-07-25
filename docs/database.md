# AI Knowledge Base - Database Schema

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// Users & Authentication
// ============================================
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  avatar    String?
  password  String   // hashed with bcrypt
  role      UserRole @default(USER)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  knowledgeBases KnowledgeBase[]
  chatSessions   ChatSession[]

  @@map("users")
}

enum UserRole {
  USER
  ADMIN
}

// ============================================
// Knowledge Bases
// ============================================
model KnowledgeBase {
  id            String  @id @default(uuid())
  name          String
  description   String?
  embeddingModel String @default("text-embedding-3-small") @map("embedding_model")
  chunkSize     Int     @default(1000) @map("chunk_size")
  chunkOverlap  Int     @default(200) @map("chunk_overlap")
  isPublic      Boolean @default(false) @map("is_public")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  ownerId    String  @map("owner_id")
  owner      User    @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  documents  Document[]
  chatSessions ChatSession[]

  @@map("knowledge_bases")
}

// ============================================
// Documents
// ============================================
model Document {
  id            String         @id @default(uuid())
  filename      String
  originalName  String         @map("original_name")
  mimeType      String         @map("mime_type")
  fileSize      Int            @map("file_size")
  filePath      String         @map("file_path")
  pageCount     Int?           @map("page_count")
  status        DocumentStatus @default(PENDING)
  metadata      Json?
  errorMessage  String?        @map("error_message")
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")

  // Relations
  knowledgeBaseId String        @map("knowledge_base_id")
  knowledgeBase   KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)
  chunks          DocumentChunk[]

  @@map("documents")
}

enum DocumentStatus {
  PENDING
  PROCESSING
  INDEXED
  ERROR
}

// ============================================
// Document Chunks (Vector Store)
// ============================================
model DocumentChunk {
  id          String   @id @default(uuid())
  content     String   @db.Text
  embedding   Unsupported("vector(1536)")
  chunkIndex  Int      @map("chunk_index")
  pageNumber  Int?     @map("page_number")
  metadata    Json?
  createdAt   DateTime @default(now()) @map("created_at")

  // Relations
  documentId  String   @map("document_id")
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId])
  @@map("document_chunks")
}

// ============================================
// Chat Sessions
// ============================================
model ChatSession {
  id              String  @id @default(uuid())
  title           String  @default("New Chat")
  model           String  @default("gpt-4o")
  temperature     Float   @default(0.7)
  systemPrompt    String? @map("system_prompt")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relations
  userId          String  @map("user_id")
  user            User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  knowledgeBaseId String? @map("knowledge_base_id")
  knowledgeBase   KnowledgeBase? @relation(fields: [knowledgeBaseId], references: [id], onDelete: SetNull)
  messages        ChatMessage[]

  @@map("chat_sessions")
}

// ============================================
// Chat Messages
// ============================================
model ChatMessage {
  id          String    @id @default(uuid())
  role        MessageRole
  content     String    @db.Text
  sources     Json?     // Array of {documentId, chunkId, similarity, content}
  tokenCount  Int?      @map("token_count")
  latency     Int?      // milliseconds
  createdAt   DateTime  @default(now()) @map("created_at")

  // Relations
  sessionId   String    @map("session_id")
  session     ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@map("chat_messages")
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}
```

## Migration Setup

```bash
# Initialize Prisma
npx prisma init

# Generate migration
npx prisma migrate dev --name init

# Generate client
npx prisma generate

# Seed database
npx prisma db seed

# Studio (GUI)
npx prisma studio
```

## pgvector Extension Setup

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create index for similarity search (IVFFlat - faster, approximate)
CREATE INDEX idx_document_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Alternative: HNSW index (slower build, more accurate)
CREATE INDEX idx_document_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Query: semantic search
SELECT 
  id, 
  content, 
  1 - (embedding <=> query_embedding) AS similarity
FROM document_chunks
WHERE document_id IN (SELECT id FROM documents WHERE knowledge_base_id = 'kb-id')
ORDER BY embedding <=> query_embedding
LIMIT 5;
```

## Redis Data Structures

```
# Sessions (for stateful auth)
SET    session:<token>  <userId>  EX 86400

# Rate Limiting
INCR   rate_limit:<ip>          # Increment counter
EXPIRE rate_limit:<ip> 60       # 1 minute window

# Background Job Queue (BullMQ)
Queue: ingestion                # Document processing queue
Queue: embedding                # Embedding generation queue

# Cache
SET    cache:kb:<id>  <json>  EX 300     # KB metadata cache
SET    cache:doc:<id> <json>  EX 300     # Document metadata cache

# Real-time (Pub/Sub)
PUBLISH chat:<sessionId>  <message>      # Chat message broadcasting
```
