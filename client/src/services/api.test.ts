import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from './api';

// --- helpers ---

function mockResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function mockSSEBody(...events: string[]) {
  const chunks = events.map((e) => new TextEncoder().encode(e + '\n'));
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return { ok: true, body: stream } as Response;
}

function sseData(type: string, payload: Record<string, unknown> = {}) {
  return `data: ${JSON.stringify({ type, ...payload })}`;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// --- REST API ---

describe('login', () => {
  it('returns user on success', async () => {
    const user = { id: '1', username: 'zeng' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(user));
    await expect(api.login('zeng')).resolves.toEqual(user);
  });

  it('throws on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse({ error: 'boom' }, false, 400));
    await expect(api.login('zeng')).rejects.toThrow('boom');
  });

  it('throws default message when response body is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse('not json', false, 500));
    await expect(api.login('zeng')).rejects.toThrow('登录失败');
  });
});

describe('createConversation', () => {
  it('returns conversation on success', async () => {
    const conv = { id: '1', title: null };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(conv));
    await expect(api.createConversation()).resolves.toEqual(conv);
  });

  it('throws on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(null, false));
    await expect(api.createConversation()).rejects.toThrow('创建会话失败');
  });
});

describe('getConversations', () => {
  it('returns list on success', async () => {
    const list = [{ id: '1', title: 'hello' }];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(list));
    await expect(api.getConversations()).resolves.toEqual(list);
  });

  it('throws on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(null, false));
    await expect(api.getConversations()).rejects.toThrow('获取会话列表失败');
  });
});

describe('getConversation', () => {
  it('returns conversation on success', async () => {
    const conv = { id: '1', title: 't', messages: [] };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(conv));
    await expect(api.getConversation('1')).resolves.toEqual(conv);
  });

  it('throws on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(null, false));
    await expect(api.getConversation('1')).rejects.toThrow('获取会话详情失败');
  });
});

describe('updateConversationTitle', () => {
  it('returns conversation on success', async () => {
    const conv = { id: '1', title: 'new' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(conv));
    await expect(api.updateConversationTitle('1', 'hello')).resolves.toEqual(conv);
  });

  it('throws on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(null, false));
    await expect(api.updateConversationTitle('1', 'hello')).rejects.toThrow('生成标题失败');
  });
});

// --- SSE streaming ---

describe('streamMessage', () => {
  it('yields token events and done event', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockSSEBody(
        sseData('token', { content: '你' }),
        sseData('token', { content: '好' }),
        sseData('done', { messageId: 'msg_1' }),
      ),
    );

    const events: api.SSEEvent[] = [];
    for await (const ev of api.streamMessage('1', 'hi')) {
      events.push(ev);
    }

    expect(events).toEqual([
      { type: 'token', content: '你' },
      { type: 'token', content: '好' },
      { type: 'done', messageId: 'msg_1' },
    ]);
  });

  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(null, false));

    const collect = async () => {
      for await (const __unused of api.streamMessage('1', 'hi')) {
        void __unused;
      }
    };
    await expect(collect()).rejects.toThrow('发送消息失败');
  });

  it('throws on error event from server', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockSSEBody(sseData('error', { message: 'server boom' })),
    );

    const collect = async () => {
      for await (const __unused of api.streamMessage('1', 'hi')) {
        void __unused;
      }
    };
    await expect(collect()).rejects.toThrow('server boom');
  });
});
