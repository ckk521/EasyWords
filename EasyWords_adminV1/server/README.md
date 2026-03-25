# EasyWords Admin V1 - Backend Server

基于 Hono + Prisma + Turso 的后端 API 服务。

## 快速开始

### 1. 安装依赖

```bash
cd server
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

主要配置项：
- `TURSO_DATABASE_URL` - Turso 数据库 URL
- `TURSO_AUTH_TOKEN` - Turso 认证 Token
- `JWT_SECRET` - JWT 密钥（生产环境必须修改）
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` - 管理员账号

### 3. 初始化数据库

```bash
# 生成 Prisma Client
pnpm db:generate

# 推送数据库 Schema
pnpm db:push
```

### 4. 启动开发服务器

```bash
pnpm dev
```

服务将在 http://localhost:3001 启动。

## API 端点

### 认证 API (`/api/auth`)

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/login` | 用户登录 |
| POST | `/register` | 用户注册 |
| GET | `/me` | 获取当前用户信息 |
| POST | `/logout` | 登出 |

### 管理员 API (`/api/admin`)

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/login` | 管理员登录 |
| GET | `/me` | 获取当前管理员信息 |
| POST | `/logout` | 管理员登出 |

### 用户管理 API (`/api/users`)

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/` | 获取用户列表 |
| GET | `/:id` | 获取用户详情 |
| POST | `/` | 创建用户 |
| PUT | `/:id` | 更新用户信息 |
| PUT | `/:id/permission` | 更新用户权限 |
| GET | `/:id/login-logs` | 获取登录日志 |
| GET | `/:id/activities` | 获取活动记录 |
| GET | `/stats/overview` | 获取统计数据 |

## 数据库 Schema

### 用户表 (users)
- 用户基本信息
- 权限和期限控制
- 登录安全

### 管理员表 (admins)
- 管理员账号

### 权限表 (user_module_permissions)
- 模块权限控制

### 日志表
- login_logs - 登录日志
- user_activities - 用户活动

### 业务数据表
- words - 单词
- articles - 文章
- dialogues - 对话
- speak_conversations - 口语会话

## 生产部署

参考 [DEPLOY.md](../DEPLOY.md)
