# ============================================================================
# Server Dockerfile — Express + Prisma + LangGraph
#
# Build context: 项目根目录（不是 server/）
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
# pnpm-workspace.yaml: 声明 workspace 成员（client + server）
# pnpm-lock.yaml:     workspace 统一的依赖锁定文件
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# 复制 workspace 所有成员的 package.json
# pnpm --filter 安装时会校验 lockfile 中所有成员是否都能解析，
# 因此即使 server 不依赖 client，也必须复制 client/package.json
# TODO: 项目拆分后 client/package.json 这一行可以删除
COPY server/package.json server/
COPY client/package.json client/

# 只安装 server 的依赖（--filter 按包名筛选）
# --frozen-lockfile 保证安装版本和 lockfile 严格一致
RUN pnpm install --filter module-assistant-server --frozen-lockfile

# 生成 Prisma Client（只需要 schema，不需要 prisma.config.ts，后者会尝试解析 DATABASE_URL）
COPY server/prisma server/prisma
RUN pnpm --filter module-assistant-server db:generate

# prisma.config.ts 在 generate 之后才复制，避免 build 时解析 DATABASE_URL
# runtime 阶段需要它来执行 prisma migrate deploy
COPY server/prisma.config.ts server/

# 复制源码并做类型检查（build = tsc --noEmit）
COPY server/tsconfig.json server/
COPY server/src server/src
RUN pnpm --filter module-assistant-server build

# ── Runtime ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

# 保留 workspace 目录结构，pnpm start 依赖 pnpm 的符号链接解析
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/prisma.config.ts ./server/
COPY --from=builder /app/server/tsconfig.json ./server/
COPY --from=builder /app/server/src ./server/src

WORKDIR /app/server
EXPOSE 3001

# prisma migrate deploy: 启动时自动执行数据库迁移（生产环境标准做法）
# pnpm start:            tsx src/index.ts 直接运行 TypeScript
CMD ["sh", "-c", "npx prisma migrate deploy && exec pnpm start"]
