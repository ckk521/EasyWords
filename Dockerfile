# EasyWords - Zeabur 部署 Dockerfile
# 使用 Turso 云数据库，无需本地持久化

# 阶段1: 构建前端
FROM node:20-alpine AS frontend-builder
WORKDIR /app/UI
COPY UI/package.json UI/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY UI/ ./
RUN pnpm build

# 阶段2: 构建后端
FROM node:20-alpine AS backend-builder
WORKDIR /app/server
COPY server/package.json server/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY server/ ./
COPY --from=frontend-builder /app/server/public ./public
RUN npx prisma generate && pnpm build

# 阶段3: 生产镜像
FROM node:20-alpine AS runner
WORKDIR /app

# 复制构建产物
COPY --from=backend-builder /app/server/.next/standalone ./
COPY --from=backend-builder /app/server/.next/static ./.next/static
COPY --from=backend-builder /app/server/public ./public
COPY --from=backend-builder /app/server/prisma ./prisma

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]
