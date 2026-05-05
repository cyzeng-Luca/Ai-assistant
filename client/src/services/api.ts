import { useAppStore } from '@store';
import type { User, Conversation, Message } from '@/types';

export type { User, Conversation, Message };

export type SSEEvent = { type: 'token'; content: string } | { type: 'done'; messageId: string };

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

export async function login(username: string): Promise<User> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: undefined }))) as { error?: string };
    throw new Error(err.error ?? '登录失败');
  }
  return res.json() as Promise<User>;
}

// --- Conversation API ---

export async function createConversation(): Promise<Conversation> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('创建会话失败');
  return res.json() as Promise<Conversation>;
}

export async function getConversations(): Promise<Conversation[]> {
  const res = await fetch(API_BASE, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('获取会话列表失败');
  return res.json() as Promise<Conversation[]>;
}

export async function getConversation(id: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('获取会话详情失败');
  return res.json() as Promise<Conversation>;
}

export async function updateConversationTitle(id: string, content: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/${id}/title`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('生成标题失败');
  return res.json() as Promise<Conversation>;
}

export async function* streamMessage(
  conversationId: string,
  content: string,
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent, void, void> {
  const res = await fetch(`${API_BASE}/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ content }),
    signal,
  });
  if (!res.ok) throw new Error('发送消息失败');

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
          yield { type: 'done', messageId: data.messageId as string };
          return;
        case 'error':
          throw new Error(data.message as string);
      }
    }
  }
}
