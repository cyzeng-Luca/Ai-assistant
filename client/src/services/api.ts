import { message } from 'antd';
import { useAppStore } from '@store';
import type { User, Conversation, Message } from '@/types';

export type { User, Conversation, Message };

export type SSEEvent = { type: 'token'; content: string } | { type: 'done'; content: string };

const API_BASE = '/api/conversations';

// --- Auth helpers ---

function getUserId(): string | null {
  return useAppStore.getState().user?.id ?? null;
}

function getAuthHeaders(): Record<string, string> {
  const userId = getUserId();
  if (!userId) return {};
  return { 'x-user-id': userId };
}

function handleUnauthorized(serverMsg?: string): never {
  useAppStore.getState().logout();
  message.error(serverMsg ?? '登录已过期，请重新登录');
  window.location.href = '/login';
  throw new Error(serverMsg ?? '登录已过期');
}

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  if (body && typeof (body as { error?: string }).error === 'string') {
    return (body as { error: string }).error;
  }
  return `请求失败 (${String(res.status)})`;
}

// --- Unified fetch wrapper ---

async function request(url: string, options?: RequestInit): Promise<Response> {
  const headers = new Headers(getAuthHeaders());
  if (options?.headers) {
    for (const [key, value] of new Headers(options.headers)) {
      headers.set(key, value);
    }
  }
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const errorMsg = await parseError(res);
    if (res.status === 401) {
      handleUnauthorized(errorMsg);
    }
    message.error(errorMsg);
    throw new Error(errorMsg);
  }

  return res;
}

// --- Auth API ---

export async function login(username: string): Promise<User> {
  const res = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return res.json() as Promise<User>;
}

// --- Conversation API ---

export async function createConversation(): Promise<Conversation> {
  const res = await request(API_BASE, { method: 'POST' });
  return res.json() as Promise<Conversation>;
}

export async function getConversations(): Promise<Conversation[]> {
  const res = await request(API_BASE);
  return res.json() as Promise<Conversation[]>;
}

export async function getConversation(id: string): Promise<Conversation> {
  const res = await request(`${API_BASE}/${id}`);
  return res.json() as Promise<Conversation>;
}

export async function updateConversationTitle(id: string, content: string): Promise<Conversation> {
  const res = await request(`${API_BASE}/${id}/title`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return res.json() as Promise<Conversation>;
}

export async function* streamMessage(
  conversationId: string,
  content: string,
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent, void, void> {
  const res = await request(`${API_BASE}/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal,
  });

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines[lines.length - 1];

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      let data: { type: string; content?: unknown; messageId?: unknown; message?: unknown };
      try {
        data = JSON.parse(line.slice(6)) as typeof data;
      } catch {
        continue;
      }

      switch (data.type) {
        case 'token':
          yield { type: 'token', content: data.content as string };
          break;
        case 'done':
          yield { type: 'done', content: data.content as string };
          return;
        case 'error':
          throw new Error(data.message as string);
      }
    }
  }
}
