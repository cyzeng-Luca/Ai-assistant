import { useEffect } from 'react';
import { Menu, Button, Typography } from 'antd';
import { PlusOutlined, MessageOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { useAppStore } from '@store';
import * as api from '@services/api';
import type { Conversation } from '@/types';

interface SidebarProps {
  activeId: string | null;
  onSelect: (id: string, skipLoad?: boolean) => void;
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
      onSelect(conv.id, true);
    },
  });

  const items = conversations.map((c: Conversation) => ({
    key: c.id,
    icon: <MessageOutlined />,
    label: c.title ?? '新对话',
  }));

  return (
    <>
      <div className="px-4 py-3 flex justify-between items-center border-b !border-border-subtle">
        <Typography.Text strong className="!text-text-primary">
          {user?.username}
        </Typography.Text>
        <Button
          size="small"
          type="text"
          onClick={onLogout}
          className="!text-text-tertiary hover:!text-text-primary"
        >
          退出
        </Button>
      </div>
      <div className="p-3">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          block
          onClick={createConversation}
          loading={loading}
          className="!rounded-lg !font-medium"
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
          <Typography.Text className="block text-center p-6 !text-text-tertiary">
            暂无对话
          </Typography.Text>
        )}
      </div>
    </>
  );
}
