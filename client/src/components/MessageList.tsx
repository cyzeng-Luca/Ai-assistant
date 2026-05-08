import { useEffect, useMemo, useRef } from 'react';
import { Avatar, Typography, Alert, Spin } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
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
    <div className={`flex flex-row px-4 py-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex gap-2.5 max-w-[75%] items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      >
        <Avatar
          icon={isUser ? <UserOutlined /> : <RobotOutlined />}
          className={`shrink-0 ${isUser ? 'bg-ant-blue' : 'bg-ant-green'}`}
          size={36}
        />
        <div
          className={`px-3.5 py-2.5 rounded-lg break-words ${isUser ? 'bg-ant-blue text-white' : 'bg-ant-gray-100 text-black'} ${showTyping ? 'typing-cursor' : ''}`}
        >
          {isUser ? (
            <Typography.Paragraph className="!m-0 whitespace-pre-wrap !text-inherit">
              {content || ' '}
            </Typography.Paragraph>
          ) : (
            <ReactMarkdown>{content || ' '}</ReactMarkdown>
          )}
        </div>
      </div>
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

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) isAtBottomRef.current = false;
  };

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    isAtBottomRef.current = atBottom;
  };

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
      className="flex-1 overflow-y-auto"
    >
      {streamingError && (
        <Alert message={streamingError} type="error" closable showIcon className="m-3" />
      )}

      {loading && messages.length === 0 && (
        <div className="flex justify-center items-center h-full">
          <Spin tip="加载中..." />
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
