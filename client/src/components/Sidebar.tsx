import { useEffect } from 'react';
import { Menu, Button, Typography } from 'antd';
import { PlusOutlined, MessageOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { useAppStore } from '@store';
import * as api from '@services/api';
import type { Conversation } from '@/types';

interface SidebarProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ activeId, onSelect, onLogout }: SidebarProps) {
  const user = useAppStore((s) => s.user);
  const conversations = useAppStore((s) => s.conversations);
  const fetchConversations = useAppStore((s) => s.fetchConversations);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  const { loading, run: createConversation } = useRequest(api.createConversation, {
    manual: true,
    onSuccess: (conv) => {
      void fetchConversations();
      onSelect(conv.id);
    },
  });

  const items = conversations.map((c: Conversation) => ({
    key: c.id,
    icon: <MessageOutlined />,
    label: c.title ?? '新对话',
  }));

  return (
    <>
      <div className="px-4 py-2 flex justify-between items-center border-b border-ant-gray-100">
        <Typography.Text strong>{user?.username}</Typography.Text>
        <Button size="small" onClick={onLogout}>
          退出
        </Button>
      </div>
      <div className="p-4">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          block
          onClick={createConversation}
          loading={loading}
        >
          新建对话
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length > 0 ? (
          <Menu
            mode="inline"
            selectedKeys={activeId ? [activeId] : []}
            items={items}
            onClick={({ key }) => {
              onSelect(key);
            }}
            className="border-r-0"
          />
        ) : (
          <Typography.Text type="secondary" className="block text-center p-6">
            暂无对话
          </Typography.Text>
        )}
      </div>
    </>
  );
}
