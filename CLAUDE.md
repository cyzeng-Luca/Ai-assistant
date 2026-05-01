# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SaaS 模块查询助手 — 前后端分离的全栈应用。
- **Server**: Express + Prisma + LangGraph + ChromaDB + DeepSeek API
- **Client**: React + Vite + Nginx 静态部署
- **Infra**: Docker Compose (postgres + chromadb)

## Shell 权限

适中模式 — npm/pip/git 等常规命令可直接执行，危险操作（force push、rm -rf 等）需确认。

## 已完成文件

### 项目配置
- `.prettierrc` / `.prettierignore` / `.env.example`
- `docker-compose.yml` (postgres + chromadb)

### Server
- `server/package.json` / `server/tsconfig.json` / `server/eslint.config.mjs`
- `server/Dockerfile` (多阶段构建)
- `server/prisma/schema.prisma` (User/Conversation/Message 三表)
- `server/src/lib/prisma.ts` (Prisma 单例)
- `server/src/config.ts` (zod 环境变量校验)
- `server/src/index.ts` (Express 入口)
- `server/src/routes/conversation.ts` (4 个 API + SSE)
- `server/src/services/conversation.ts` (Prisma CRUD)

### Client
- `client/package.json` / `client/tsconfig.json` / `client/eslint.config.mjs`
- `client/vite.config.ts` / `client/index.html` / `client/Dockerfile` / `client/nginx.conf`

## 待完成文件

### Server (3个)
- `server/src/services/llm.ts` — DeepSeek SSE 流式，用 `async function*` + `yield`
- `server/src/agent/rag.ts` — ChromaDB 检索，简化版
- `server/src/agent/graph.ts` — LangGraph workflow，用 `for await...of`

### Client (7个)
- `client/src/main.tsx`
- `client/src/App.tsx`
- `client/src/components/ChatInput.tsx`
- `client/src/components/MessageList.tsx`
- `client/src/components/Sidebar.tsx`
- `client/src/hooks/useSSE.ts`
- `client/src/services/api.ts`

### 安装和验证
- `pnpm install` 前后端依赖
- `prisma generate` / `prisma migrate dev`
- `docker compose up` 验证

## 编码风格

- **语法**: 标准 ES6 async/await，`async function*` + `for await...of`，拒绝回调嵌套
- **简洁**: 不引入不必要的抽象
- **前后端分离**: client 纯静态 Nginx，server 是 Express API
- **代码前先解释**: 用户喜欢先理解再执行
