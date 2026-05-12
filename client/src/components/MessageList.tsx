import { useEffect, useMemo, useRef } from 'react';
import { useThrottleFn } from 'ahooks';
import { Typography, Alert, Spin } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import type { Message } from '@/types';

interface MessageListProps {
  streamingContent: string;
  streamingError: string | null;
  messages: Message[];
  loading: boolean;
  streamingId: string;
  isStreaming: boolean;
}

function Bubble({
  role,
  content,
  showTyping,
}: {
  role: string;
  content: string;
  showTyping?: boolean;
}) {
  const isUser = role === 'user';
  return (
    <div
      className={`px-4 py-3 message-enter flex ${isUser ? 'justify-end' : 'justify-start'}`}
      style={{
        width: '752px',
      }}
    >
      {isUser ? (
        <div
          className="p-4 rounded-2xl "
          style={{ background: 'rgb(237, 243, 254)', color: '#000' }}
        >
          <Typography.Paragraph className="!m-0 " style={{ fontSize: 16 }}>
            {content || ' '}
          </Typography.Paragraph>
        </div>
      ) : (
        <div
          className={`markdown-content text-base leading-relaxed${showTyping ? ' streaming' : ''}`}
        >
          <ReactMarkdown>{content || ' '}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default function MessageList({
  streamingContent,
  streamingError,
  messages,
  loading,
  streamingId,
  isStreaming,
}: MessageListProps) {
  const hasStreaming = streamingContent.length > 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const { run: handleWheel } = useThrottleFn(
    (e: React.WheelEvent) => {
      if (e.deltaY < 0) {
        isAtBottomRef.current = false;
      }
    },
    { wait: 20 },
  );

  const { run: handleScroll } = useThrottleFn(
    () => {
      const el = containerRef.current;
      if (!el) return;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      isAtBottomRef.current = atBottom;
    },
    { wait: 20 },
  );

  useEffect(() => {
    isAtBottomRef.current = true;
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (!isStreaming) return;
    let rafId: number;
    const tick = () => {
      if (isAtBottomRef.current) {
        const el = containerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isStreaming]);

  const displayMessages = useMemo(() => {
    if ((!isStreaming && !hasStreaming) || !streamingId) return messages;
    if (messages.some((m) => m.id === streamingId)) return messages;
    return [
      ...messages,
      { id: streamingId, role: 'assistant' as const, content: streamingContent },
    ];
  }, [messages, hasStreaming, streamingContent, streamingId, isStreaming]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onWheel={handleWheel}
      style={{
        // height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {streamingError && (
        <Alert
          message={streamingError}
          type="error"
          closable
          showIcon
          className="m-3 animate-fade-in"
        />
      )}
      {loading && messages.length === 0 && (
        <div className="flex justify-center items-center h-full">
          <Spin tip="加载中...">
            <div className="p-12" />
          </Spin>
        </div>
      )}
      {!loading && messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
          <RobotOutlined className="text-4xl mb-4 opacity-30" />
          <Typography.Text className="!text-text-tertiary">模块查询助手</Typography.Text>
          <Typography.Text className="!text-text-tertiary mt-1">
            请输入您的问题开始对话
          </Typography.Text>
        </div>
      )}
      {displayMessages.map((msg) => (
        <Bubble
          key={msg.id}
          role={msg.role}
          content={msg.content}
          showTyping={msg.id === streamingId && isStreaming}
        />
      ))}
      <div />
    </div>
  );
}
