import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

type SSEEvent = { type: 'token'; content: string } | { type: 'done'; content: string };

function createStreamMock() {
  let resolver: ((value: SSEEvent) => void) | null = null;
  let rejecter: ((err: Error) => void) | null = null;

  async function* gen() {
    try {
      for (;;) {
        const value = await new Promise<SSEEvent>((resolve, reject) => {
          resolver = resolve;
          rejecter = reject;
        });
        yield value;
        if (value.type === 'done') break;
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'abort') {
        throw new DOMException('aborted', 'AbortError');
      }
      throw err;
    }
  }

  const iterator = gen();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
  return {
    [Symbol.asyncIterator]: () => iterator,
    next: (v?: any) => iterator.next(v),
    return: (v?: any) => iterator.return!(v),
    throw: (e?: any) => iterator.throw!(e),
    pushEvent: (v: SSEEvent) => {
      resolver?.(v);
    },
    throwError: (e: Error) => {
      rejecter?.(e);
    },
  } as ReturnType<typeof gen> & {
    pushEvent: (v: SSEEvent) => void;
    throwError: (e: Error) => void;
  };
}

const mockStreamMessage = vi.fn();
vi.mock('@services/api', () => ({
  streamMessage: (...args: Parameters<typeof mockStreamMessage>) => mockStreamMessage(...args),
}));

import { useSSE } from './useSSE';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useSSE', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useSSE());
    expect(result.current.tokens).toBe('');
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('starts streaming on sendMessage and receives tokens', async () => {
    const mock = createStreamMock();
    mockStreamMessage.mockReturnValue(mock);

    const { result } = renderHook(() => useSSE());

    act(() => {
      result.current.sendMessage('1', 'hi');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true);
    });

    act(() => {
      mock.pushEvent({ type: 'token', content: '你' });
    });
    await waitFor(() => {
      expect(result.current.tokens).toBe('你');
    });

    act(() => {
      mock.pushEvent({ type: 'token', content: '好' });
    });
    await waitFor(() => {
      expect(result.current.tokens).toBe('你好');
    });
  });

  it('clears tokens and streaming on done', async () => {
    const mock = createStreamMock();
    mockStreamMessage.mockReturnValue(mock);
    const onComplete = vi.fn();

    const { result } = renderHook(() => useSSE(onComplete));

    act(() => {
      result.current.sendMessage('1', 'hi');
    });
    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true);
    });

    act(() => {
      mock.pushEvent({ type: 'token', content: '答' });
    });
    await waitFor(() => {
      expect(result.current.tokens).toBe('答');
    });

    act(() => {
      mock.pushEvent({ type: 'done', content: '答' });
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.tokens).toBe('');
      expect(onComplete).toHaveBeenCalledWith(expect.any(String), '答');
    });
  });

  it('stopStreaming sets isStreaming false', () => {
    const mock = createStreamMock();
    mockStreamMessage.mockReturnValue(mock);

    const { result } = renderHook(() => useSSE());

    act(() => {
      result.current.sendMessage('1', 'hi');
    });
    expect(result.current.isStreaming).toBe(true);

    act(() => {
      result.current.stopStreaming();
    });
    expect(result.current.isStreaming).toBe(false);
  });

  it('reset clears all state', async () => {
    const mock = createStreamMock();
    mockStreamMessage.mockReturnValue(mock);

    const { result } = renderHook(() => useSSE());

    act(() => {
      result.current.sendMessage('1', 'hi');
    });
    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true);
    });

    act(() => {
      mock.pushEvent({ type: 'token', content: 'abc' });
    });
    await waitFor(() => {
      expect(result.current.tokens).toBe('abc');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.tokens).toBe('');
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error when streamMessage throws', async () => {
    const mock = createStreamMock();
    mockStreamMessage.mockReturnValue(mock);

    const { result } = renderHook(() => useSSE());

    act(() => {
      result.current.sendMessage('1', 'hi');
    });
    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true);
    });

    act(() => {
      mock.throwError(new Error('network error'));
    });

    await waitFor(() => {
      expect(result.current.error).toBe('network error');
      expect(result.current.isStreaming).toBe(false);
    });
  });
});
