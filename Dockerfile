# EasyWords - Docker 部署配置
# 适用于 NAS / 自建服务器部署

# ============================================
# 阶段1: 构建前端
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/UI

# 安装依赖
COPY UI/package.json UI/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 构建前端（输出到 ../server/public）
COPY UI/ ./
RUN pnpm build

# ============================================
# 阶段2: 构建后端
# ============================================
FROM node:20-alpine AS backend-builder

WORKDIR /app/server

# 安装依赖
COPY server/package.json server/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 复制后端代码
COPY server/ ./

# 复制前端构建产物
COPY --from=frontend-builder /app/server/public ./public

# 生成 Prisma 客户端并构建
RUN npx prisma generate && pnpm build

# ============================================
# 阶段3: 生产镜像
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# 安装必要工具
RUN apk add --no-cache curl

# 复制构建产物
COPY --from=backend-builder /app/server/.next/standalone ./
COPY --from=backend-builder /app/server/.next/static ./.next/static
COPY --from=backend-builder /app/server/public ./public

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs /app
USER nextjs

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/settings || exit 1

# 启动命令
CMD ["node", "server.js"]
