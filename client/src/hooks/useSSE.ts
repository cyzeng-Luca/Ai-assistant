import { useRef, useState, useCallback } from 'react';
import { streamMessage } from '@services/api';

interface UseSSEReturn {
  tokens: string;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (conversationId: string, content: string) => void;
  stopStreaming: () => void;
  reset: () => void;
}

export function useSSE(onStreamComplete?: (fullAnswer: string) => void): UseSSEReturn {
  const [tokens, setTokens] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    (conversationId: string, content: string) => {
      controllerRef.current?.abort();
      setTokens('');
      setError(null);
      setIsStreaming(true);

      const controller = new AbortController();
      controllerRef.current = controller;
      let full = '';

      void (async () => {
        try {
          for await (const event of streamMessage(conversationId, content, controller.signal)) {
            switch (event.type) {
              case 'token':
                full += event.content;
                setTokens(full);
                break;
              case 'done':
                onStreamComplete?.(full);
                break;
            }
          }
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setError(err instanceof Error ? err.message : '未知错误');
        } finally {
          setIsStreaming(false);
          setTokens('');
        }
      })();
    },
    [onStreamComplete],
  );

  const stopStreaming = useCallback(() => {
    controllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setTokens('');
    setIsStreaming(false);
    setError(null);
  }, []);

  return { tokens, isStreaming, error, sendMessage, stopStreaming, reset };
}
