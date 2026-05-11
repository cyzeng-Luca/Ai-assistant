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
  const messages = useAppStore((s) => s.messages);
  const messagesLoading = useAppStore((s) => s.messagesLoading);
  const loadMessages = useAppStore((s) => s.loadMessages);
  const addMessage = useAppStore((s) => s.addMessage);
  const clearMessages = useAppStore((s) => s.clearMessages);

  const [activeId, setActiveId] = useState<string | null>(null);

  const {
    tokens,
    streamingId,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    reset: resetSSE,
  } = useSSE((sid, fullAnswer) => {
    addMessage({ id: sid, role: 'assistant', content: fullAnswer });
  });

  const activeConversation = conversations.find((c) => c.id === activeId);

  const handleSelect = (id: string, skipLoad?: boolean) => {
    if (id === activeId) return;
    resetSSE();
    clearMessages();
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
    if (!activeId) return;
    addMessage({ id: generateUUID(), role: 'user', content });
    sendMessage(activeId, content);
    if (!activeConversation?.title) {
      await api.updateConversationTitle(activeId, content);
      void fetchConversations();
    }
  };

  const chatContent = (
    <Content className="flex flex-col bg-white">
      <MessageList
        streamingContent={tokens}
        streamingError={error}
        messages={messages}
        loading={messagesLoading}
        streamingId={streamingId}
        isStreaming={isStreaming}
      />
      <ChatInput
        key={activeId}
        onSend={(content) => {
          void handleSend(content);
        }}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        disabled={!activeId}
      />
    </Content>
  );

  if (isMobile) {
    return (
      <Layout className="h-screen">
        <Header className="!bg-white flex items-center border-b border-ant-gray-100 px-4">
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
          styles={{ body: { padding: 0 } }}
        >
          <Sidebar activeId={activeId} onSelect={handleSelect} onLogout={handleLogout} />
        </Drawer>
        <Layout>{chatContent}</Layout>
      </Layout>
    );
  }

  return (
    <Layout className="h-screen">
      <Sider
        width={280}
        className="!bg-white overflow-hidden flex flex-col border-r border-ant-gray-100"
      >
        <Sidebar activeId={activeId} onSelect={handleSelect} onLogout={handleLogout} />
      </Sider>
      <Layout>{chatContent}</Layout>
    </Layout>
  );
}
