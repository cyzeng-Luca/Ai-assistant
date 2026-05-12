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
  it('returns initial state for active conversation', () => {
    const { result } = renderHook(() => useSSE('1'));
    expect(result.current.tokens).toBe('');
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('starts streaming on sendMessage and receives tokens', async () => {
    const mock = createStreamMock();
    mockStreamMessage.mockReturnValue(mock);

    const { result } = renderHook(() => useSSE('1'));

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

    const { result } = renderHook(() => useSSE('1', onComplete));

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
      expect(onComplete).toHaveBeenCalledWith('1', expect.any(String), '答');
    });
  });

  it('stopStreaming sets isStreaming false for given conversation', () => {
    const mock = createStreamMock();
    mockStreamMessage.mockReturnValue(mock);

    const { result } = renderHook(() => useSSE('1'));

    act(() => {
      result.current.sendMessage('1', 'hi');
    });
    expect(result.current.isStreaming).toBe(true);

    act(() => {
      result.current.stopStreaming('1');
    });
    expect(result.current.isStreaming).toBe(false);
  });

  it('does not interrupt other conversation streams', async () => {
    const mock1 = createStreamMock();
    const mock2 = createStreamMock();
    mockStreamMessage.mockReturnValueOnce(mock1).mockReturnValueOnce(mock2);

    const { result, rerender } = renderHook(({ activeId }) => useSSE(activeId), {
      initialProps: { activeId: '1' as string | null },
    });

    // Start stream for conversation 1
    act(() => {
      result.current.sendMessage('1', 'hi');
    });
    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true);
    });

    act(() => {
      mock1.pushEvent({ type: 'token', content: 'A' });
    });
    await waitFor(() => {
      expect(result.current.tokens).toBe('A');
    });

    // Switch to conversation 2 — stream 1 keeps running
    rerender({ activeId: '2' });
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.tokens).toBe('');

    // Start stream for conversation 2
    act(() => {
      result.current.sendMessage('2', 'hello');
    });
    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true);
    });

    act(() => {
      mock2.pushEvent({ type: 'token', content: 'B' });
    });
    await waitFor(() => {
      expect(result.current.tokens).toBe('B');
    });

    // Switch back to conversation 1 — still streaming
    rerender({ activeId: '1' });
    expect(result.current.isStreaming).toBe(true);
    expect(result.current.tokens).toBe('A');

    act(() => {
      mock1.pushEvent({ type: 'token', content: 'BC' });
    });
    await waitFor(() => {
      expect(result.current.tokens).toBe('ABC');
    });
  });

  it('sets error when streamMessage throws', async () => {
    const mock = createStreamMock();
    mockStreamMessage.mockReturnValue(mock);

    const { result } = renderHook(() => useSSE('1'));

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
