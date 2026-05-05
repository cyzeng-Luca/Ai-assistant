import { useState } from 'react';
import { Layout } from 'antd';
import { useAppStore } from '@store';
import Sidebar from '@components/Sidebar';
import MessageList from '@components/MessageList';
import ChatInput from '@components/ChatInput';
import { useSSE } from '@hooks/useSSE';
import * as api from '@services/api';

const { Sider, Content } = Layout;

export default function ChatPage() {
  const logout = useAppStore((s) => s.logout);
  const fetchConversations = useAppStore((s) => s.fetchConversations);
  const messages = useAppStore((s) => s.messages);
  const messagesLoading = useAppStore((s) => s.messagesLoading);
  const loadMessages = useAppStore((s) => s.loadMessages);
  const addMessage = useAppStore((s) => s.addMessage);
  const clearMessages = useAppStore((s) => s.clearMessages);

  const [activeId, setActiveId] = useState<string | null>(null);

  const {
    tokens,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    reset: resetSSE,
  } = useSSE((fullAnswer) => {
    addMessage({ id: '', role: 'assistant', content: fullAnswer });
  });

  const handleSelect = (id: string) => {
    if (id === activeId) return;
    resetSSE();
    clearMessages();
    setActiveId(id);
    void loadMessages(id);
  };

  const handleLogout = () => {
    logout();
    setActiveId(null);
  };

  const handleSend = async (content: string) => {
    if (!activeId) return;
    addMessage({ id: '', role: 'user', content });
    sendMessage(activeId, content);
    await api.updateConversationTitle(activeId, content);
    void fetchConversations();
  };

  return (
    <Layout className="h-screen">
      <Sider
        width={280}
        className="!bg-white overflow-hidden flex flex-col border-r border-ant-gray-100"
      >
        <Sidebar activeId={activeId} onSelect={handleSelect} onLogout={handleLogout} />
      </Sider>
      <Layout>
        <Content className="flex flex-col bg-white">
          <MessageList
            streamingContent={tokens}
            streamingError={error}
            messages={messages}
            loading={messagesLoading}
          />
          <ChatInput
            onSend={(content) => {
              void handleSend(content);
            }}
            onStop={stopStreaming}
            isStreaming={isStreaming}
            disabled={!activeId}
          />
        </Content>
      </Layout>
    </Layout>
  );
}
