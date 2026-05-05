# 移动端适配 & PWA 支持 设计文档

**日期**: 2026-05-05 | **状态**: 已确认

## 范围

- Chat 页面响应式适配：移动端（< 768px）Sider 改为抽屉式
- PWA 基础可安装（manifest + 图标 + theme-color）

## 设计决策

| 决策项            | 选择                     | 理由                                          |
| ----------------- | ------------------------ | --------------------------------------------- |
| 移动端 Sider 交互 | 抽屉式 Drawer 覆盖层     | 节省屏幕空间，选完对话自动收起                |
| PWA 离线策略      | 仅可安装（不做离线缓存） | 改动最小，满足"添加到主屏幕"即可              |
| 响应式断点        | < 768px（antd md）       | 覆盖 iPhone XR（414px）及以上机型，仅竖屏场景 |

## 1. 移动端抽屉式 Sider

### 行为

- **>= 768px**：Layout.Sider（280px 宽）始终可见，现有桌面端行为不变
- **< 768px**：Sider 不渲染；顶部 Header 显示汉堡菜单按钮 + Drawer 覆盖层

### 组件

- `ChatPage` 通过 `Grid.useBreakpoint()` 判断当前视口
- 移动端渲染 `<Layout.Header>`，内含 `MenuOutlined` 按钮 + 当前对话标题
- `Drawer` 内部直接复用现有 `<Sidebar>` 组件，不改动 Sidebar 本身
- 选中对话后自动关闭 Drawer

### 涉及文件

- [Chat.tsx](client/src/pages/Chat.tsx) — 新增响应式逻辑、Header、Drawer

## 2. PWA

### Manifest

- 使用 `vite-plugin-pwa`，通过插件配置项定义 manifest（无需单独 manifest.json 文件）
- 应用名：`模块查询助手`，简称：`模块助手`
- 图标：单张 192x192 PNG（纯色占位图，后续可替换为正式图标）
- `theme_color`：`#1677ff`（antd 主色蓝）

### Service Worker

- 使用 `selfDestroying` 策略 — 注册最小化 SW 仅满足 PWA 可安装条件
- 不做任何缓存、不做离线 fetch 拦截

### 涉及文件

- [vite.config.ts](client/vite.config.ts) — 添加 `VitePWA` 插件
- [package.json](client/package.json) — 添加 `vite-plugin-pwa` devDependency
- [index.html](client/index.html) — 补充 `theme-color` meta 标签

## 验收标准

1. 视口宽度 < 768px 时：Sider 不显示，顶部 Header 出现汉堡菜单按钮
2. 点击汉堡菜单 → Drawer 从左侧滑出，展示对话列表
3. 选中对话 → Drawer 自动关闭，聊天区域更新
4. iPhone 上 Chrome/Safari 浏览器出现"添加到主屏幕"提示
5. 桌面端布局和行为不受影响
6. 已有测试全部通过
