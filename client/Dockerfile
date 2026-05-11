# ============================================================================
# Client Dockerfile — React + Vite + Nginx 静态部署
#
# Build context: 项目根目录（不是 client/）
# 原因：pnpm workspace 模式下 lockfile 统一在根目录，子目录下没有独立的
#       pnpm-lock.yaml。因此 docker-compose.yml 中指定 context: . ，
#       本文件内所有 COPY 路径相对于根目录。
# ============================================================================

# ── Builder ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# 启用 pnpm（corepack 是 Node 内置的包管理器管理工具）
RUN corepack enable && corepack prepare pnpm@10 --activate

# 复制 workspace 配置和 lockfile（来自根目录 context）
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# 复制 workspace 所有成员的 package.json
# pnpm --filter 安装时会校验 lockfile 中所有成员是否都能解析，
# 因此即使 client 不依赖 server，也必须复制 server/package.json
# TODO: 项目拆分后 server/package.json 这一行可以删除
COPY client/package.json client/
COPY server/package.json server/

# 只安装 client 的依赖，--frozen-lockfile 保证版本和 lockfile 一致
RUN pnpm install --filter module-assistant-client --frozen-lockfile

# 复制 client 源码并构建（vite build → dist/）
COPY client/ client/
RUN pnpm --filter module-assistant-client build

# ── Runtime ────────────────────────────────────────────────────────────────
# 运行时只需要 Nginx 托管静态文件，不需要 Node
FROM nginx:1.27-alpine AS runtime

# 静态文件
COPY --from=builder /app/client/dist /usr/share/nginx/html
# Nginx 配置（含 /api/ 反向代理到 server:3001）
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
