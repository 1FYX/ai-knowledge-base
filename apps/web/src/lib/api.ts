import { ApiResponse, User, LlmConfig } from '../types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
  } catch (e) {
    // 网络层失败（连接拒绝/DNS 失败/超时）——通常是后端没启动
    throw new Error('无法连接服务器，请检查网络或后端服务是否已启动。');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // 优先用后端返回的友好消息；401 特殊处理（token 失效）
    if (res.status === 401) {
      localStorage.removeItem('token');
      throw new Error('登录已失效，请重新登录。');
    }
    throw new Error(data?.error?.message || `请求失败（HTTP ${res.status}）`);
  }
  return data;
}

export const authApi = {
  register: (email: string, password: string, name?: string) =>
    request<ApiResponse<{ user: User; token: string }>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    request<ApiResponse<{ user: User; token: string }>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<ApiResponse<User>>('/users/me'),
};

export const userApi = {
  getLlmConfig: () => request<ApiResponse<LlmConfig>>('/users/llm-config'),
  updateLlmConfig: (data: Partial<{
    baseUrl: string;
    apiKey: string;
    chatModel: string;
    embeddingModel: string;
  }>) =>
    request<ApiResponse<LlmConfig>>('/users/llm-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const kbApi = {
  list: () => request<ApiResponse<any[]>>('/knowledge-bases'),
  get: (id: string) => request<ApiResponse<any>>(`/knowledge-bases/${id}`),
  create: (data: any) =>
    request<ApiResponse<any>>('/knowledge-bases', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<ApiResponse<any>>(`/knowledge-bases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<ApiResponse<any>>(`/knowledge-bases/${id}`, { method: 'DELETE' }),
};

export const docApi = {
  list: (kbId: string) => request<ApiResponse<any[]>>(`/knowledge-bases/${kbId}/documents`),
  get: (id: string) => request<ApiResponse<any>>(`/documents/${id}`),
  delete: (id: string) => request<ApiResponse<any>>(`/documents/${id}`, { method: 'DELETE' }),
  /** 真实文件上传：multipart/form-data，字段名 file */
  upload: async (kbId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/knowledge-bases/${kbId}/documents`, {
        method: 'POST',
        headers: {
          // 注意：FormData 不要手动设 Content-Type，浏览器会自动带 boundary
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
    } catch {
      throw new Error('上传失败：无法连接服务器，请检查后端服务是否已启动。');
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || `上传失败（HTTP ${res.status}）`);
    }
    return data as ApiResponse<any>;
  },
};

export const chatApi = {
  listSessions: () => request<ApiResponse<any[]>>('/chat/sessions'),
  getSession: (id: string) => request<ApiResponse<any>>(`/chat/sessions/${id}`),
  createSession: (data: any) =>
    request<ApiResponse<any>>('/chat/sessions', { method: 'POST', body: JSON.stringify(data) }),
  deleteSession: (id: string) =>
    request<ApiResponse<any>>(`/chat/sessions/${id}`, { method: 'DELETE' }),
  sendMessage: (sessionId: string, content: string) =>
    request<ApiResponse<any>>(`/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  streamMessage: (
    sessionId: string,
    content: string,
    handlers: {
      onChunk: (chunk: string) => void;
      onSources?: (sources: unknown[]) => void;
      onDone?: () => void;
      onError?: (err: string) => void;
    },
  ) => {
    const token = localStorage.getItem('token');
    const controller = new AbortController();

    (async () => {
      let res: Response;
      try {
        res = await fetch(`/api/chat/sessions/${sessionId}/messages/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ content }),
          signal: controller.signal,
        });
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        handlers.onError?.('无法连接服务器，请检查网络或后端服务是否已启动。');
        return;
      }

      if (!res.ok || !res.body) {
        // 尝试读取后端返回的友好错误消息
        let msg = `请求失败（HTTP ${res.status}）`;
        try {
          const data = await res.json();
          if (data?.error?.message) msg = data.error.message;
        } catch {}
        handlers.onError?.(msg);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE 帧以 \n\n 分隔
        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const line = frame.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;

          const payload = line.slice(6);
          if (payload === '[DONE]') {
            handlers.onDone?.();
            return;
          }
          try {
            const data = JSON.parse(payload);
            if (data.chunk) handlers.onChunk(data.chunk);
            if (data.sources) handlers.onSources?.(data.sources);
            if (data.error) handlers.onError?.(data.error);
          } catch {
            // 忽略无法解析的帧
          }
        }
      }
      handlers.onDone?.();
    })().catch((e) => {
      if (e.name !== 'AbortError') handlers.onError?.(e.message || 'Stream failed');
    });

    return () => controller.abort();
  },
};
