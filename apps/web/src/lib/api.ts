import { ApiResponse, User } from '../types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error?.message || `HTTP ${res.status}`);
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
  streamMessage: (sessionId: string, content: string) => {
    const token = localStorage.getItem('token');
    return new EventSource(`/api/chat/sessions/${sessionId}/messages/stream`, {
      withCredentials: true,
    });
  },
};
