# EasyWords V5.0 商业化落地 PRD

> 版本：V1.0 草案
> 日期：2026-03-20
> 状态：待审核

---

## 一、项目背景

EasyWords V4 已完成核心功能：
- AI 查词 + 生词本
- AI 生成文章 + 阅读
- AI 场景对话 + TTS
- AI 口语陪练

现需商业化落地，实现用户隔离和后台管理。

---

## 二、需求概述

### Phase 1: 用户登录 + 数据隔离

| 功能 | 描述 |
|------|------|
| 用户注册/登录 | 账号密码登录 |
| 数据隔离 | 每个用户只能访问自己的数据 |
| 独立数据 | 单词本、文章、对话、口语记录 |

### Phase 2: 后台管理

| 功能 | 描述 |
|------|------|
| 用户管理 | 查看、搜索用户列表 |
| 使用期限 | 设置/查询用户有效期 |
| 模块权限 | 控制用户可用的功能模块 |
| 登录校验 | 过期用户禁止登录并提示 |

### Phase 3: 支付（后续）

暂不实施，预留接口。

---

## 三、详细需求

### 3.1 用户登录功能

#### 3.1.1 登录方式

| 方式 | 优先级 | 说明 |
|------|--------|------|
| 账号密码登录 | P0 | 用户名/邮箱 + 密码 |
| 微信登录 | P2 | 后续扩展 |

#### 3.1.2 注册流程

```
用户输入 → 验证格式 → 检查用户名是否存在 → 创建账号 → 自动登录
```

#### 3.1.3 登录流程

```
用户输入 → 验证格式 → 校验账号密码 → 检查使用期限 → 检查账号状态 → 生成Token → 进入主页
                                    ↓
                              已过期 → 提示"使用权限已到期，请联系作者"
```

#### 3.1.4 数据隔离方案

现有数据模型改造：

```prisma
// 所有用户数据表添加 userId
model Word {
  id      String  @id
  userId  String  // 新增：所属用户
  // ... 其他字段
  user    User    @relation(fields: [userId], references: [id])
}

model Article {
  id      String  @id
  userId  String  // 新增
  // ...
}

model Dialogue {
  id      String  @id
  userId  String  // 新增
  // ...
}

model SpeakConversation {
  id      String  @id
  userId  String  // 新增
  // ...
}

// 新增：用户表
model User {
  id            String   @id @default(uuid())
  username      String   @unique
  email         String   @unique              // 注册必填
  passwordHash  String
  nickname      String?
  createdAt     DateTime @default(now())
  lastLoginAt   DateTime?

  // 权限和期限
  expiresAt     DateTime?           // 使用期限（绝对时间）
  isActive      Boolean   @default(true)  // 账号是否启用

  // 登录安全
  loginFailCount  Int      @default(0)    // 连续登录失败次数
  loginLockedUntil DateTime?             // 登录锁定到期时间

  // 关联数据
  words         Word[]
  articles      Article[]
  dialogues     Dialogue[]
  conversations SpeakConversation[]
  permission    UserModulePermission?
  loginLogs     LoginLog[]
  activities    UserActivity[]
}

// 新增：管理员表
model Admin {
  id            String   @id @default(uuid())
  username      String   @unique
  passwordHash  String
  role          String   @default("admin")  // admin, super_admin
  createdAt     DateTime @default(now())
  lastLoginAt   DateTime?
}

// 新增：用户模块权限表
model UserModulePermission {
  id           String  @id @default(uuid())
  userId       String
  user         User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  // 模块开关
  vocabulary   Boolean @default(true)   // 查词
  reading      Boolean @default(true)   // 阅读
  dialogue     Boolean @default(true)   // 对话/听力
  speak        Boolean @default(true)   // AI陪练

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([userId])
}

// 新增：登录日志表
model LoginLog {
  id          String   @id @default(uuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  username    String                    // 登录时输入的用户名（即使用户不存在也记录）
  status      String                     // success | failed
  failReason  String?                    // 失败原因：密码错误/账号禁用/已过期/锁定中
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
  @@map("login_logs")
}

// 新增：用户活动记录表
model UserActivity {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // 活动类型
  action      String                     // add_word | add_article | add_dialogue | add_conversation
  resourceId  String?                    // 关联的资源ID
  resourceType String?                   // word | article | dialogue | speak_conversation

  // 活动详情（JSON）
  details     String?                    // 例如：{"word": "apple", "chineseDefinition": "苹果"}

  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
  @@index([action])
  @@map("user_activities")
}
```

---

### 3.2 后台管理功能

#### 3.2.1 管理员登录

- 独立的后台登录入口
- 账号密码登录
- 默认超级管理员账号（首次部署时创建）

#### 3.2.2 用户管理

| 操作 | 描述 |
|------|------|
| 用户列表 | 分页展示，支持搜索（用户名/邮箱） |
| 查看详情 | 查看用户信息、使用期限、权限配置 |
| 设置期限 | 设置用户有效期（天数/具体日期） |
| 模块权限 | 开关各功能模块 |
| 启用/禁用 | 账号状态控制 |

#### 3.2.3 权限控制逻辑

```typescript
// 用户登录时的校验流程
async function validateUserAccess(user: User) {
  // 1. 检查账号状态
  if (!user.isActive) {
    return { allowed: false, reason: '账号已被禁用，请联系管理员' }
  }

  // 2. 检查使用期限
  if (user.expiresAt && new Date() > user.expiresAt) {
    return { allowed: false, reason: '使用权限已到期，请联系作者' }
  }

  // 3. 获取模块权限
  const permissions = await getUserPermissions(user.id)

  return { allowed: true, permissions }
}
```

#### 3.2.4 后台界面

| 页面 | 功能 |
|------|------|
| Dashboard | 统计概览（用户数、活跃度） |
| 用户管理 | 用户列表、搜索、编辑权限 |
| 系统设置 | 基础配置（预留） |

---

## 四、技术方案

### 4.1 认证方案

| 方案 | 选择 | 理由 |
|------|------|------|
| JWT Token | ✅ 推荐 | 无状态、易扩展、适合前后端分离 |
| Session | 备选 | 需要服务端存储 |

JWT 配置：
- Access Token: 2小时有效期
- Refresh Token: 7天有效期
- 存储位置: HttpOnly Cookie（防 XSS）

### 4.2 API 改造

所有数据 API 需要从 Token 中获取 userId，只查询当前用户的数据：

```typescript
// 改造前
async function getWords() {
  return prisma.word.findMany()
}

// 改造后
async function getWords(userId: string) {
  return prisma.word.findMany({
    where: { userId }
  })
}
```

### 4.3 前端改造

| 改造项 | 说明 |
|--------|------|
| 登录页面 | 新增登录/注册页面 |
| 路由守卫 | 未登录跳转登录页 |
| 权限控制 | 根据用户权限显示/隐藏功能 |
| Header | 显示用户信息、退出登录 |

### 4.4 后台管理技术方案

| 方案 | 选择 |
|------|------|
| 前端框架 | 同主应用 (React + Vite) |
| UI 组件 | 同主应用 (Radix UI + Tailwind) |
| 路由 | 独立路由 `/admin/*` |
| API | 复用后端，新增管理 API |

---

## 五、数据迁移策略

### 现有数据处理

| 数据 | 处理方式 |
|------|----------|
| 现有单词/文章等 | 关联到默认管理员账号 或 清空 |
| 建议 | 部署时清空测试数据，全新开始 |

---

## 六、文件结构规划

```
EasyWordsV4/
├── UI/src/app/
│   ├── pages/
│   │   ├── Login.tsx          # 新增：登录页
│   │   ├── Register.tsx       # 新增：注册页
│   │   ├── AdminDashboard.tsx # 新增：后台首页
│   │   ├── AdminUsers.tsx     # 新增：用户管理
│   │   └── ...现有页面
│   ├── components/
│   │   ├── auth/              # 新增：认证相关组件
│   │   └── admin/             # 新增：后台管理组件
│   └── hooks/
│       └── useAuth.ts         # 新增：认证 Hook
│
└── server/src/
    ├── app/api/
    │   ├── auth/              # 新增：认证 API
    │   │   ├── login/
    │   │   ├── register/
    │   │   └── logout/
    │   └── admin/             # 新增：管理 API
    │       ├── users/
    │       └── permissions/
    ├── lib/
    │   ├── auth.ts            # 新增：认证工具
    │   └── middleware.ts      # 新增：权限中间件
    └── middleware.ts          # 新增：Next.js 中间件
```

---

## 七、实施计划

### Phase 1: 用户登录 + 数据隔离（预估 3-5 天）

| 步骤 | 任务 |
|------|------|
| 1.1 | 数据库 Schema 改造 + 迁移 |
| 1.2 | 后端认证 API (注册/登录/登出) |
| 1.3 | JWT 中间件 + 权限校验 |
| 1.4 | 前端登录/注册页面 |
| 1.5 | 前端路由守卫 + 权限控制 |
| 1.6 | 现有 API 改造（添加 userId 过滤） |
| 1.7 | 测试 + 验证 |

### Phase 2: 后台管理（预估 2-3 天）

| 步骤 | 任务 |
|------|------|
| 2.1 | 管理员表 + 权限表 |
| 2.2 | 管理员认证 API |
| 2.3 | 用户管理 API（列表、查询、权限设置） |
| 2.4 | 后台管理前端页面 |
| 2.5 | 期限控制 + 登录校验逻辑 |
| 2.6 | 测试 + 验证 |

---

## 八、需求确认（已确认）

### 1. 登录方式
- ✅ 只做账号密码登录

### 2. 用户注册
- ✅ 开放用户自主注册
- ✅ 管理员账号：ckk521，密码：123456

### 3. 使用期限
- ✅ 管理员可配置
- ✅ 支持分钟级（如 3 分钟体验）和天数

### 4. 现有数据
- ✅ 迁移到管理员账号（ckk521），用于测试

### 5. 后台入口
- ✅ 独立路由 `/admin`

### 6. 其他
- ✅ 用户表保留 nickname 字段（可选）
- ✅ 注册需要邮箱（后续支持邮箱改密码）

---

## 九、新增需求

### 9.1 用户活动记录

管理员可查看用户的活动记录：

| 活动类型 | 说明 |
|----------|------|
| add_word | 新增单词 |
| add_article | 新增文章 |
| add_dialogue | 新增对话/听力 |
| add_conversation | 新增口语会话 |

后台展示：
- 用户列表 → 点击用户 → 活动记录 tab
- 显示：时间、操作类型、资源详情

### 9.2 登录日志

记录所有登录行为：

| 字段 | 说明 |
|------|------|
| username | 输入的用户名 |
| status | success / failed |
| failReason | 失败原因 |
| ipAddress | IP 地址 |
| createdAt | 登录时间 |

后台展示：
- 用户详情页 → 登录记录 tab
- 显示：时间、状态、失败原因

### 9.3 登录失败限制

安全策略：
- 连续失败 5 次 → 锁定 1 分钟
- 锁定期间登录 → 提示 "登录失败次数过多，请 X 秒后重试"
- 登录成功 → 清零失败计数

```typescript
// 登录校验逻辑
async function checkLoginLock(user: User) {
  if (user.loginLockedUntil && new Date() < user.loginLockedUntil) {
    const remaining = Math.ceil((user.loginLockedUntil - new Date()) / 1000)
    return { locked: true, remainingSeconds: remaining }
  }
  return { locked: false }
}

async function handleLoginFail(user: User) {
  const newCount = user.loginFailCount + 1
  if (newCount >= 5) {
    // 锁定 1 分钟
    await updateUser(user.id, {
      loginFailCount: newCount,
      loginLockedUntil: new Date(Date.now() + 60 * 1000)
    })
  } else {
    await updateUser(user.id, { loginFailCount: newCount })
  }
}

async function handleLoginSuccess(user: User) {
  await updateUser(user.id, {
    loginFailCount: 0,
    loginLockedUntil: null,
    lastLoginAt: new Date()
  })
}
```

### 9.4 注册需填写邮箱

注册表单：
- 用户名（必填）
- 邮箱（必填，格式校验，唯一性校验）
- 密码（必填）
- 确认密码（必填）

---

## 十、版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| V1.0 | 2026-03-20 | 初始草案 |
| V1.1 | 2026-03-20 | 新增：用户活动记录、登录日志、登录失败限制、注册邮箱 |
