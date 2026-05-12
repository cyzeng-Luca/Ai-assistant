import { useState } from 'react';
import { generateUUID } from '@lib/uuid';
import { Layout, Drawer, Button, Typography, Spin } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { useAppStore } from '@store';
import Sidebar from '@components/Sidebar';
import MessageList from '@components/MessageList';
import ChatInput from '@components/ChatInput';
import { useSSE } from '@hooks/useSSE';
import * as api from '@services/api';

const { Sider, Content, Header } = Layout;
export default function ChatPage() {
  const isMobile = useAppStore((s) => s.isMobile);
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
    if (!skipLoad) void loadMessages(id);
    setActiveId(id);
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

  const loadingEl = (
    <div className="flex justify-center items-center" style={{ height: '100%' }}>
      <Spin tip="加载中...">
        <div className="p-12" />
      </Spin>
    </div>
  );

  const chatContent = loading ? (
    loadingEl
  ) : (
    <MessageList
      streamingContent={tokens}
      streamingError={error}
      messages={messages}
      loading={false}
      streamingId={streamingId}
      isStreaming={isStreaming}
    />
  );

  if (isMobile) {
    return (
      <Layout
        style={{
          display: 'grid',
          height: '100dvh',
          overflow: 'hidden',
          gridTemplateRows: 'auto 1fr auto',
          background: 'white',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <Header className="!px-4" style={{ background: 'white' }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => {
              setDrawerOpen(true);
            }}
          />
          <Typography.Text strong className="ml-3 ">
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
          styles={{ body: { padding: 0, background: 'white' } }}
          closeIcon={false}
        >
          {sidebarEl}
        </Drawer>
        {chatContent}
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
      </Layout>
    );
  }

  return (
    <Layout
      style={{
        height: '100dvh',
      }}
    >
      <Sider width={280} style={{ background: 'rgb(249, 250, 251)' }}>
        {sidebarEl}
      </Sider>
      <Content
        style={{
          background: 'white',
          display: 'grid',
          overflow: 'hidden',
          gridTemplateRows: '1fr auto',
        }}
      >
        {chatContent}
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
