export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { documents: number };
  documents?: Document[];
}

export interface Document {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  status: 'PENDING' | 'PROCESSING' | 'INDEXED' | 'ERROR';
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  knowledgeBaseId: string | null;
  _count?: { messages: number };
}

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  sources: any[] | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/** LLM 配置（对外视图：不含明文 apiKey） */
export interface LlmConfig {
  baseUrl?: string;
  hasApiKey: boolean;
  chatModel?: string;
  embeddingModel?: string;
}
