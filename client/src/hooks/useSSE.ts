import { useRef, useState, useCallback } from 'react';
import { generateUUID } from '@lib/uuid';
import { streamMessage } from '@services/api';

interface StreamState {
  tokens: string;
  streamingId: string;
  isStreaming: boolean;
  error: string | null;
}

const EMPTY_STREAM: StreamState = {
  tokens: '',
  streamingId: '',
  isStreaming: false,
  error: null,
};

interface UseSSEReturn {
  tokens: string;
  streamingId: string;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (conversationId: string, content: string) => void;
  stopStreaming: (conversationId?: string) => void;
}

export function useSSE(
  activeId: string | null,
  onStreamComplete?: (conversationId: string, streamingId: string, fullAnswer: string) => void,
): UseSSEReturn {
  const [streams, setStreams] = useState<Record<string, StreamState>>({});
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  const active = activeId ? (streams[activeId] ?? EMPTY_STREAM) : EMPTY_STREAM;

  const sendMessage = useCallback(
    (conversationId: string, content: string) => {
      // 只 abort 同一对话的旧流，不影响其他对话
      controllersRef.current.get(conversationId)?.abort();

      const id = generateUUID();
      setStreams((prev) => ({
        ...prev,
        [conversationId]: { tokens: '', streamingId: id, isStreaming: true, error: null },
      }));

      const controller = new AbortController();
      controllersRef.current.set(conversationId, controller);
      let full = '';

      void (async () => {
        try {
          for await (const event of streamMessage(conversationId, content, controller.signal)) {
            switch (event.type) {
              case 'token':
                full += event.content;
                setStreams((prev) => ({
                  ...prev,
                  [conversationId]: { ...prev[conversationId], tokens: full },
                }));
                break;
              case 'done':
                onStreamComplete?.(conversationId, id, full);
                setStreams((prev) => ({
                  ...prev,
                  [conversationId]: {
                    tokens: '',
                    streamingId: '',
                    isStreaming: false,
                    error: null,
                  },
                }));
                controllersRef.current.delete(conversationId);
                break;
            }
          }
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setStreams((prev) => ({
            ...prev,
            [conversationId]: {
              ...prev[conversationId],
              isStreaming: false,
              error: err instanceof Error ? err.message : '未知错误',
            },
          }));
        }
      })();
    },
    [onStreamComplete],
  );

  const stopStreaming = useCallback((conversationId?: string) => {
    const targetId = conversationId;
    if (targetId) {
      controllersRef.current.get(targetId)?.abort();
      controllersRef.current.delete(targetId);
      setStreams((prev) => ({
        ...prev,
        [targetId]: { ...prev[targetId], isStreaming: false, error: null },
      }));
    }
  }, []);

  return {
    tokens: active.tokens,
    streamingId: active.streamingId,
    isStreaming: active.isStreaming,
    error: active.error,
    sendMessage,
    stopStreaming,
  };
}
