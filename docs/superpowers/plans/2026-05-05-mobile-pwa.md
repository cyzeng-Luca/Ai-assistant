# 移动端适配 & PWA 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标:** Chat 页面支持移动端抽屉式 Sider（< 768px）+ PWA 基础可安装。

**架构:** ChatPage 通过 `Grid.useBreakpoint()` 判断移动端视口，移动端渲染 Header + Drawer（内含 Sidebar），替代桌面端的 Layout.Sider。PWA 使用 `vite-plugin-pwa` 插件，配置 manifest + 自销毁 Service Worker。

**技术栈:** antd Grid/Drawer、vite-plugin-pwa

---

### 任务 1: 安装 PWA 插件

**涉及文件:**

- 修改: `client/package.json`

- [ ] **步骤 1: 添加 vite-plugin-pwa 依赖**

```bash
pnpm --filter module-assistant-client add -D vite-plugin-pwa
```

- [ ] **步骤 2: 提交**

```bash
git add client/package.json pnpm-lock.yaml
git commit -m "chore: add vite-plugin-pwa devDependency"
```

---

### 任务 2: 配置 PWA（vite.config.ts + index.html）

**涉及文件:**

- 修改: `client/vite.config.ts`
- 修改: `client/index.html`

- [ ] **步骤 1: 在 vite.config.ts 添加 VitePWA 插件**

将 `client/vite.config.ts` 内容替换为：

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      selfDestroying: true,
      manifest: {
        name: '模块查询助手',
        short_name: '模块助手',
        theme_color: '#1677ff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@router': path.resolve(__dirname, 'src/router'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@store': path.resolve(__dirname, 'src/store'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **步骤 2: 在 index.html 添加 theme-color meta 标签**

在 `<head>` 内添加 `<meta name="theme-color" content="#1677ff" />`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#1677ff" />
    <title>模块查询助手</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **步骤 3: 提交**

```bash
git add client/vite.config.ts client/index.html
git commit -m "feat: add PWA manifest and theme-color config"
```

---

### 任务 3: 生成 PWA 占位图标

**涉及文件:**

- 新建: `client/public/icon-192.png`
- 新建: `client/public/icon-512.png`

- [ ] **步骤 1: 用 python3 生成纯色蓝色占位图标**

```bash
python3 -c "
import struct, zlib

def create_png(width, height, r, g, b):
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))

    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            raw += bytes([r, g, b])

    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')

    return header + ihdr + idat + iend

with open('client/public/icon-192.png', 'wb') as f:
    f.write(create_png(192, 192, 22, 119, 255))

with open('client/public/icon-512.png', 'wb') as f:
    f.write(create_png(512, 512, 22, 119, 255))
print('图标生成完成')
"
```

- [ ] **步骤 2: 验证图标文件存在**

```bash
ls -la client/public/icon-192.png client/public/icon-512.png
```

预期: 两个文件均存在，大小约 1-3 KB。

- [ ] **步骤 3: 提交**

```bash
git add client/public/icon-192.png client/public/icon-512.png
git commit -m "feat: add PWA placeholder icons"
```

---

### 任务 4: 实现移动端抽屉式 Sider

**涉及文件:**

- 修改: `client/src/pages/Chat.tsx`

- [ ] **步骤 1: 替换 ChatPage 组件**

将 `client/src/pages/Chat.tsx` 完整内容替换为：

```tsx
import { useState } from 'react';
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
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    reset: resetSSE,
  } = useSSE((fullAnswer) => {
    addMessage({ id: '', role: 'assistant', content: fullAnswer });
  });

  const activeConversation = conversations.find((c) => c.id === activeId);

  const handleSelect = (id: string) => {
    if (id === activeId) return;
    resetSSE();
    clearMessages();
    setActiveId(id);
    void loadMessages(id);
    if (isMobile) setDrawerOpen(false);
  };

  const handleLogout = () => {
    logout();
    setActiveId(null);
    setDrawerOpen(false);
  };

  const handleSend = async (content: string) => {
    if (!activeId) return;
    addMessage({ id: '', role: 'user', content });
    sendMessage(activeId, content);
    await api.updateConversationTitle(activeId, content);
    void fetchConversations();
  };

  const chatContent = (
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
  );

  if (isMobile) {
    return (
      <Layout className="h-screen">
        <Header className="!bg-white flex items-center border-b border-ant-gray-100 px-4">
          <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} />
          <Typography.Text strong className="ml-3 truncate">
            {activeConversation?.title ?? '模块查询助手'}
          </Typography.Text>
        </Header>
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
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
```

- [ ] **步骤 2: 运行测试确保现有功能不受影响**

```bash
pnpm --filter module-assistant-client test
```

预期: 3 个测试文件，27 个测试全部 PASS。

- [ ] **步骤 3: 运行类型检查**

```bash
pnpm --filter module-assistant-client exec tsc --noEmit
```

预期: 0 错误。

- [ ] **步骤 4: 提交**

```bash
git add client/src/pages/Chat.tsx
git commit -m "feat: add mobile drawer Sider with responsive Grid breakpoint"
```

---

### 任务 5: 最终验证

- [ ] **步骤 1: 运行完整测试**

```bash
pnpm test
```

预期: 3 个测试文件，27 个测试 PASS。

- [ ] **步骤 2: 构建验证**

```bash
pnpm --filter module-assistant-client build
```

预期: Vite 构建成功，产物包含 PWA manifest 和图标文件。
