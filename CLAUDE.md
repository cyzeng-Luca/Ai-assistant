# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SaaS 模块查询助手 — 前后端分离的全栈应用。

- **Server**: Express + Prisma + LangGraph + ChromaDB + DeepSeek API
- **Client**: React + Vite + Nginx 静态部署
- **Infra**: Docker Compose (postgres + chromadb)

## Shell 权限

适中模式 — npm/pip/git 等常规命令可直接执行，危险操作（force push、rm -rf 等）需确认，特殊情况 Type-check 命令可直接执行

## 已完成文件

### 项目配置

- `.prettierrc` / `.prettierignore` / `.env.example` / `.gitignore`
- `docker-compose.yml` (postgres + chromadb)

### Server

- `server/package.json` / `server/tsconfig.json` / `server/eslint.config.mjs`
- `server/Dockerfile` (多阶段构建)
- `server/prisma/schema.prisma` (User/Conversation/Message 三表)
- `server/src/types/express.d.ts` — Express Request 类型扩展（userId）
- `server/src/lib/prisma.ts` (Prisma 单例)
- `server/src/config.ts` (zod 环境变量校验)
- `server/src/index.ts` (Express 入口，挂载 auth + userId 中间件)
- `server/src/middleware/userId.ts` — 从 x-user-id header 提取用户身份
- `server/src/routes/auth.ts` — POST /api/auth/login (upsert 用户)
- `server/src/routes/conversation.ts` (4 个 API + SSE，使用 req.userId)
- `server/src/services/conversation.ts` (Prisma CRUD)
- `server/src/services/llm.ts` — DeepSeek SSE 流式，`async function*` + `yield`
- `server/src/agent/rag.ts` — ChromaDB 检索，简化版
- `server/src/agent/graph.ts` — LangGraph workflow，Annotation + 三节点（decide → retrieve/generate → END）

### Client

- `client/package.json` / `client/tsconfig.json` / `client/eslint.config.mjs`
- `client/vite.config.ts` / `client/index.html` / `client/Dockerfile` / `client/nginx.conf`
- `client/src/main.tsx` (ReactDOM.createRoot 入口)
- `client/src/App.tsx` (登录态切换 + antd Layout 三栏布局)
- `client/src/components/Login.tsx` (登录页，输入 ID 即可登录)
- `client/src/components/ChatInput.tsx` (antd TextArea + 发送/停止)
- `client/src/components/MessageList.tsx` (消息气泡 + react-markdown 逐字渲染)
- `client/src/components/Sidebar.tsx` (antd Menu 会话列表 + 新建)
- `client/src/hooks/useSSE.ts` (SSE 流式 hook)
- `client/src/services/api.ts` (REST API + SSE stream 封装 + login/logout/auth headers)

### 验证

- `pnpm install` 前后端依赖 ✅
- `prisma generate` ✅
- Server `tsc` 编译 0 错误 ✅
- Client `tsc --noEmit` 编译 0 错误 ✅

## 依赖管理

**强制使用 pnpm**，禁止 npm / yarn。安装依赖时始终使用 `pnpm install`。

- workspace 模式下在根目录执行：`pnpm install`（会同时安装 client 和 server 依赖）
- 添加依赖：`pnpm --filter <package> add <dep>`

## 编码风格

- **语法**: 标准 ES6 async/await，`async function*` + `for await...of`，拒绝回调嵌套
- **简洁**: 不引入不必要的抽象
- **前后端分离**: client 纯静态 Nginx，server 是 Express API
- **代码前先解释**: 用户喜欢先理解再执行
