import { useState } from 'react';
import { generateUUID } from '@lib/uuid';
import { Layout, Grid, Drawer, Button, Typography } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { useAppStore } from '@store';
import Sidebar from '@components/Sidebar';
import MessageList from '@components/MessageList';
import ChatInput from '@components/ChatInput';
import { useSSE } from '@hooks/useSSE';
import * as api from '@services/api';

const { Sider, Content, Header } = Layout;
const { useBreakpoint } = Grid;

export default function ChatPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const logout = useAppStore((s) => s.logout);
  const fetchConversations = useAppStore((s) => s.fetchConversations);
  const conversations = useAppStore((s) => s.conversations);
  const messagesMap = useAppStore((s) => s.messagesMap);
  const messagesLoading = useAppStore((s) => s.messagesLoading);
  const loadMessages = useAppStore((s) => s.loadMessages);
  const addMessage = useAppStore((s) => s.addMessage);

  const [activeId, setActiveId] = useState<string | null>(null);

  const messages = messagesMap[activeId ?? ''] ?? [];
  const loading = messagesLoading[activeId ?? ''] ?? false;

  const { tokens, streamingId, isStreaming, error, sendMessage, stopStreaming } = useSSE(
    activeId,
    (conversationId, sid, fullAnswer) => {
      addMessage(conversationId, { id: sid, role: 'assistant', content: fullAnswer });
    },
  );

  const activeConversation = conversations.find((c) => c.id === activeId);

  const handleSelect = (id: string, skipLoad?: boolean) => {
    if (id === activeId) return;
    setActiveId(id);
    if (!skipLoad) void loadMessages(id);
    if (isMobile) setDrawerOpen(false);
  };

  const handleLogout = () => {
    logout();
    setActiveId(null);
    setDrawerOpen(false);
  };

  const handleSend = async (content: string) => {
    let targetId = activeId;
    if (!targetId) {
      const conv = await api.createConversation();
      targetId = conv.id;
      setActiveId(conv.id);
    }
    addMessage(targetId, { id: generateUUID(), role: 'user', content });
    sendMessage(targetId, content);
    if (!activeConversation?.title) {
      await api.updateConversationTitle(targetId, content);
      void fetchConversations();
    }
  };

  const sidebarEl = <Sidebar activeId={activeId} onSelect={handleSelect} onLogout={handleLogout} />;

  const chatContent = (
    <Content className="flex flex-col min-h-0 !bg-surface-base items-center">
      <MessageList
        streamingContent={tokens}
        streamingError={error}
        messages={messages}
        loading={loading}
        streamingId={streamingId}
        isStreaming={isStreaming}
      />
      <div className="flex-1 flex flex-col w-full max-w-[752px]">
        {/* <MessageList
          streamingContent={tokens}
          streamingError={error}
          messages={messages}
          loading={loading}
          streamingId={streamingId}
          isStreaming={isStreaming}
        /> */}
        {/* <ChatInput
          key={activeId}
          onSend={(content) => {
            void handleSend(content);
          }}
          onStop={() => { stopStreaming(activeId ?? undefined); }}
          isStreaming={isStreaming}
        /> */}
      </div>
    </Content>
  );

  if (isMobile) {
    return (
      <Layout className="!min-h-0 !h-full">
        <Header
          className="!h-12 shrink-0 flex items-center border-b !border-border-subtle !px-4"
          style={{ background: 'rgb(249, 250, 251)' }}
        >
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => {
              setDrawerOpen(true);
            }}
          />
          <Typography.Text strong className="ml-3 truncate">
            {activeConversation?.title ?? '模块查询助手'}
          </Typography.Text>
        </Header>
        <Drawer
          open={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
          }}
          placement="left"
          width={280}
          styles={{ body: { padding: 0, background: 'rgb(249, 250, 251)' } }}
        >
          {sidebarEl}
        </Drawer>
        <Layout className="flex-1! min-h-0! overflow-hidden !bg-white">{chatContent}</Layout>
      </Layout>
    );
  }

  return (
    <Layout
      style={{
        height: '100vh',
      }}
    >
      <Sider width={280} style={{ background: 'rgb(249, 250, 251)' }}>
        {sidebarEl}
      </Sider>
      <Content
        style={{
          background: 'white',
          height: '100vh',
          display: 'grid',
          gridTemplateRows: '1fr auto',
        }}
      >
        <MessageList
          streamingContent={tokens}
          streamingError={error}
          messages={messages}
          loading={loading}
          streamingId={streamingId}
          isStreaming={isStreaming}
        />
        <ChatInput
          key={activeId}
          onSend={(content) => {
            void handleSend(content);
          }}
          onStop={() => {
            stopStreaming(activeId ?? undefined);
          }}
          isStreaming={isStreaming}
        />
      </Content>
    </Layout>
  );
}
