# EasyWords V5.0 实施计划

> 版本：V1.0
> 日期：2026-03-20

---

## 实施顺序

按照渐进式开发原则，分阶段实施，每阶段完成后可独立测试。

---

## Phase 1: 用户登录 + 数据隔离

### Step 1: 数据库改造

**任务：**
1. 创建 `User` 表
2. 创建 `Admin` 表
3. 创建 `UserModulePermission` 表
4. 给现有表添加 `userId` 字段
5. 迁移现有数据到管理员账号

**Schema 改造：**

```prisma
// 用户表
model User {
  id            String   @id @default(uuid())
  username      String   @unique
  email         String   @unique
  passwordHash  String
  nickname      String?
  createdAt     DateTime @default(now())
  lastLoginAt   DateTime?
  expiresAt     DateTime?
  isActive      Boolean  @default(true)

  // 登录安全
  loginFailCount  Int      @default(0)
  loginLockedUntil DateTime?

  words         Word[]
  articles      Article[]
  dialogues     Dialogue[]
  conversations SpeakConversation[]
  permission    UserModulePermission?
  loginLogs     LoginLog[]
  activities    UserActivity[]

  @@map("users")
}

// 管理员表
model Admin {
  id            String   @id @default(uuid())
  username      String   @unique
  passwordHash  String
  nickname      String?
  role          String   @default("admin")
  createdAt     DateTime @default(now())
  lastLoginAt   DateTime?

  @@map("admins")
}

// 用户模块权限表
model UserModulePermission {
  id           String   @id @default(uuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  vocabulary   Boolean  @default(true)
  reading      Boolean  @default(true)
  dialogue     Boolean  @default(true)
  speak        Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("user_module_permissions")
}

// 登录日志表
model LoginLog {
  id          String   @id @default(uuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  username    String
  status      String   // success | failed
  failReason  String?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
  @@map("login_logs")
}

// 用户活动记录表
model UserActivity {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  action       String   // add_word | add_article | add_dialogue | add_conversation
  resourceId   String?
  resourceType String?
  details      String?
  createdAt    DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
  @@map("user_activities")
}

// Word 表添加 userId
model Word {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... 其他字段保持不变
}

// Article 表添加 userId
model Article {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... 其他字段保持不变
}

// Dialogue 表添加 userId
model Dialogue {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... 其他字段保持不变
}

// SpeakConversation 表添加 userId
model SpeakConversation {
  id          String    @id @default(uuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... 其他字段保持不变
}
```

**验证点：**
- [ ] 数据库迁移成功
- [ ] 管理员账号 ckk521 创建成功
- [ ] 现有数据关联到管理员账号

---

### Step 2: 后端认证 API

**新建文件：**

```
server/src/app/api/auth/
├── register/route.ts    # 注册
├── login/route.ts       # 登录
├── logout/route.ts      # 登出
├── me/route.ts          # 获取当前用户信息
└── refresh/route.ts     # 刷新 Token
```

**认证逻辑：**

```typescript
// 注册流程
POST /api/auth/register
Request: { username, email, password }
校验：
1. 用户名格式（3-20字符，字母数字下划线）
2. 邮箱格式 + 唯一性
3. 密码强度（6-20字符）
4. 用户名唯一性

// 登录流程
POST /api/auth/login
Request: { username, password }
Response: {
  success: true,
  data: {
    user: { id, username, nickname },
    expiresAt: "2026-04-20T00:00:00Z" | null
  }
}

// 登录校验流程
1. 查找用户
2. 检查是否被锁定（loginLockedUntil）
   - 如果锁定中，返回剩余秒数
3. 验证密码
   - 失败：loginFailCount + 1
   - 达到 5 次：锁定 1 分钟
4. 检查 isActive
5. 检查 expiresAt
6. 成功：清零 loginFailCount，更新 lastLoginAt
7. 记录登录日志（成功/失败）
```

**验证点：**
- [ ] 注册 API 可用
- [ ] 登录 API 返回正确 Token
- [ ] 登出 API 清除 Cookie

---

### Step 3: 认证中间件

**新建文件：**

```
server/src/middleware.ts       # Next.js 中间件
server/src/lib/auth.ts         # 认证工具函数
```

**中间件逻辑：**

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 公开路径不需要认证
  const publicPaths = ['/api/auth/login', '/api/auth/register']
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 管理员路径
  if (pathname.startsWith('/api/admin')) {
    return handleAdminAuth(request)
  }

  // 用户 API 路径需要认证
  if (pathname.startsWith('/api/')) {
    return handleUserAuth(request)
  }

  return NextResponse.next()
}
```

**验证点：**
- [ ] 未登录访问 API 返回 401
- [ ] 已登录可正常访问

---

### Step 4: 前端登录/注册页面

**新建文件：**

```
UI/src/app/pages/
├── Login.tsx
└── Register.tsx
UI/src/app/hooks/
└── useAuth.ts
UI/src/app/components/auth/
└── ProtectedRoute.tsx
```

**页面设计：**

- 登录页：用户名 + 密码 + 登录按钮 + 注册链接
- 注册页：用户名 + 密码 + 确认密码 + 注册按钮

**验证点：**
- [ ] 登录页 UI 正常
- [ ] 注册页 UI 正常
- [ ] 登录成功跳转首页
- [ ] 注册成功自动登录

---

### Step 5: 前端路由守卫

**改造文件：**

- `UI/src/app/routes.tsx` - 添加路由守卫

**逻辑：**

```typescript
// 未登录访问受保护页面 → 跳转登录页
// 已登录访问登录页 → 跳转首页
```

**验证点：**
- [ ] 未登录访问首页跳转登录页
- [ ] 登录后可访问各页面

---

### Step 6: 现有 API 改造 + 活动记录

**改造内容：**

所有数据 API 添加 userId 过滤 + 活动记录：

```typescript
// 改造前
prisma.word.findMany()

// 改造后
prisma.word.findMany({
  where: { userId: currentUser.id }
})

// 新增数据时，记录活动
async function addWord(userId: string, wordData: WordData) {
  const word = await prisma.word.create({
    data: { ...wordData, userId }
  })

  // 记录活动
  await prisma.userActivity.create({
    data: {
      userId,
      action: 'add_word',
      resourceId: word.id,
      resourceType: 'word',
      details: JSON.stringify({ word: word.word })
    }
  })

  return word
}
```

**需要改造的 API：**

| API | 改造内容 |
|-----|----------|
| GET /api/words | 添加 userId 过滤 |
| POST /api/words | 添加 userId + 记录活动 |
| GET /api/articles | 添加 userId 过滤 |
| POST /api/articles | 添加 userId + 记录活动 |
| GET /api/dialogue | 添加 userId 过滤 |
| POST /api/dialogue | 添加 userId + 记录活动 |
| GET /api/speak/conversations | 添加 userId 过滤 |
| POST /api/speak/conversations | 添加 userId + 记录活动 |

**验证点：**
- [ ] 用户 A 看不到用户 B 的数据
- [ ] 新增数据正确关联当前用户

---

### Step 7: 前端 Header 改造

**改造内容：**

- 显示用户信息（用户名）
- 添加退出登录按钮
- 根据权限显示/隐藏菜单

**验证点：**
- [ ] 显示当前用户名
- [ ] 退出登录成功

---

## Phase 2: 后台管理

### Step 8: 管理员认证 + 用户管理 API

**新建文件：**

```
server/src/app/api/admin/
├── auth/
│   └── login/route.ts
├── users/
│   ├── route.ts           # 用户列表
│   └── [id]/
│       ├── route.ts       # 用户详情/更新
│       ├── permission/route.ts  # 权限设置
│       ├── activities/route.ts  # 用户活动记录
│       └── login-logs/route.ts  # 登录日志
└── stats/
    └── route.ts           # 统计数据（Dashboard）
```

**API 设计：**

```
GET /api/admin/users
- 参数：page, pageSize, search, status(active/expired/disabled)
- 返回：用户列表 + 分页

GET /api/admin/users/:id
- 返回：用户详情 + 权限配置

PUT /api/admin/users/:id/permission
- Body：{ expiresAt, isActive, vocabulary, reading, dialogue, speak }

GET /api/admin/users/:id/activities
- 参数：page, pageSize, action(可选过滤)
- 返回：活动记录列表

GET /api/admin/users/:id/login-logs
- 参数：page, pageSize
- 返回：登录日志列表

GET /api/admin/stats
- 返回：总用户数、今日新增、活跃用户等
```

**验证点：**
- [ ] 管理员登录成功
- [ ] 管理员 Token 区别于用户 Token

---

### Step 9: 后台管理前端

**新建文件：**

```
UI/src/app/pages/admin/
├── Login.tsx
├── Dashboard.tsx
├── Users.tsx
└── UserDetail.tsx
UI/src/app/routes.tsx      # 添加 /admin/* 路由
```

**页面功能：**

| 页面 | 功能 |
|------|------|
| /admin/login | 管理员登录 |
| /admin | Dashboard（统计概览） |
| /admin/users | 用户列表 + 搜索 |
| /admin/users/:id | 用户详情 + 权限设置 + 活动记录 + 登录日志 |

**用户详情页 Tabs：**

```
Tab 1: 基本信息
- 用户名、邮箱、昵称
- 注册时间、最后登录时间
- 账号状态

Tab 2: 权限设置
用户有效期：
○ 永久
○ 指定天数：[  30  ] 天
○ 指定日期：[ 2026-04-20 ]
○ 体验时长：[   3  ] 分钟

模块权限：
☑ 查词功能
☑ 阅读功能
☑ 对话/听力
☑ AI陪练

账号状态：
○ 启用
○ 禁用

Tab 3: 活动记录
| 时间 | 操作 | 详情 |
|------|------|------|
| 2026-03-20 14:30 | 新增单词 | apple - 苹果 |
| 2026-03-20 14:25 | 新增文章 | 短篇新闻 |

Tab 4: 登录日志
| 时间 | 状态 | 失败原因 |
|------|------|----------|
| 2026-03-20 14:30 | 成功 | - |
| 2026-03-20 14:28 | 失败 | 密码错误 |
| 2026-03-20 14:27 | 失败 | 密码错误 |
```

**验证点：**
- [ ] 管理员登录成功
- [ ] 用户列表显示正常
- [ ] 权限设置保存成功

---

### Step 10: 登录校验逻辑

**改造登录 API：**

```typescript
// 登录时校验
async function validateLogin(user: User) {
  // 1. 检查账号状态
  if (!user.isActive) {
    return { success: false, error: '账号已被禁用，请联系管理员' }
  }

  // 2. 检查使用期限
  if (user.expiresAt && new Date() > user.expiresAt) {
    return { success: false, error: '使用权限已到期，请联系作者' }
  }

  return { success: true }
}
```

**验证点：**
- [ ] 过期用户登录显示提示
- [ ] 禁用用户登录显示提示

---

### Step 11: 前端权限控制

**改造内容：**

根据用户权限显示/隐藏菜单和页面：

```typescript
// useAuth.ts
const hasPermission = (module: string) => {
  return user?.permission?.[module] ?? true
}

// Header.tsx
{hasPermission('reading') && <a href="/articles">阅读</a>}
```

**验证点：**
- [ ] 无权限模块不显示菜单
- [ ] 直接访问无权限页面显示提示

---

## 验收清单

### Phase 1 验收

- [ ] 用户可以自主注册（用户名 + 邮箱 + 密码）
- [ ] 邮箱格式校验 + 唯一性校验
- [ ] 用户可以登录/登出
- [ ] 连续 5 次登录失败后锁定 1 分钟
- [ ] 用户只能看到自己的数据
- [ ] 新注册用户有默认权限（所有模块开放）
- [ ] 管理员账号 ckk521 包含原有测试数据

### Phase 2 验收

- [ ] 管理员可以登录后台
- [ ] 管理员可以查看用户列表
- [ ] 管理员可以设置用户使用期限（分钟/天）
- [ ] 管理员可以控制用户模块权限
- [ ] 管理员可以禁用/启用用户
- [ ] 过期用户登录时显示正确提示
- [ ] 权限控制生效（菜单和页面）
- [ ] 管理员可查看用户活动记录（单词/文章/对话/口语）
- [ ] 管理员可查看用户登录日志
- [ ] 用户活动记录正确关联时间和详情

---

## 文件清单

### 新建文件

```
server/src/
├── app/api/auth/
│   ├── register/route.ts
│   ├── login/route.ts
│   ├── logout/route.ts
│   ├── me/route.ts
│   └── refresh/route.ts
├── app/api/admin/
│   ├── auth/login/route.ts
│   ├── users/route.ts
│   ├── users/[id]/route.ts
│   ├── users/[id]/permission/route.ts
│   ├── users/[id]/activities/route.ts
│   ├── users/[id]/login-logs/route.ts
│   └── stats/route.ts
├── lib/
│   ├── auth.ts
│   ├── password.ts
│   └── activity.ts          # 活动记录工具
└── middleware.ts

UI/src/app/
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   └── admin/
│       ├── Login.tsx
│       ├── Dashboard.tsx
│       ├── Users.tsx
│       └── UserDetail.tsx
├── components/auth/
│   └── ProtectedRoute.tsx
└── hooks/
    └── useAuth.ts
```

### 改造文件

```
server/prisma/schema.prisma     # 数据模型改造
server/src/app/api/words/*      # 添加 userId 过滤 + 活动记录
server/src/app/api/articles/*   # 添加 userId 过滤 + 活动记录
server/src/app/api/dialogue/*   # 添加 userId 过滤 + 活动记录
server/src/app/api/speak/*      # 添加 userId 过滤 + 活动记录
UI/src/app/routes.tsx           # 路由改造
UI/src/app/components/layout/Header.tsx  # Header 改造
```

---

## 开始实施？

请确认以上计划，确认后我将从 **Step 1: 数据库改造** 开始实施。
