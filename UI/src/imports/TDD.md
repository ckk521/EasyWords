# EasyWords - 技术设计文档 (TDD)

> 版本：MVP v1.0
> 更新日期：2026-03-15
> 关联文档：PRD.md

---

## 一、系统架构

### 1.1 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │  首页   │  │ 生词本  │  │  阅读   │  │  设置   │   │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘   │
│       │            │            │            │         │
│       └────────────┴────────────┴────────────┘         │
│                          │                              │
│                    React Components                     │
│                          │                              │
│                    State Management                     │
│                          │                              │
└──────────────────────────┼──────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────┐
│                     API Layer                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Next.js API Routes                  │   │
│  │  /api/words/*     /api/articles/*    /api/llm/* │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────┐
│                    Service Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ WordService │  │LLMService   │  │ArticleService│    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
└─────────┼────────────────┼────────────────┼─────────────┘
          │                │                │
┌─────────┼────────────────┼────────────────┼─────────────┐
│         │                │                │   Data      │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐     │
│  │   SQLite    │  │  LLM API    │  │   SQLite    │     │
│  │  (words)    │  │ (OpenAI等)  │  │ (articles)  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 1.2 技术选型明细

| 层级 | 技术 | 版本 | 选型理由 |
|------|------|------|----------|
| 框架 | Next.js | 14+ | App Router, SSR/CSR 灵活切换 |
| 语言 | TypeScript | 5+ | 类型安全，开发体验好 |
| 样式 | Tailwind CSS | 3+ | 快速开发，简洁现代风格 |
| UI 组件 | shadcn/ui | latest | 可定制，质量高 |
| 状态管理 | Zustand | 4+ | 轻量，支持持久化 |
| 数据库 | SQLite (better-sqlite3) | - | 轻量，本地存储，无需部署 |
| ORM | Prisma | 5+ | 类型安全，迁移方便 |
| LLM SDK | Vercel AI SDK | 3+ | 统一接口，支持多模型 |

---

## 二、目录结构

```
easywords/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 首页（查词）
│   ├── vocabulary/
│   │   └── page.tsx              # 生词本页
│   ├── reading/
│   │   └── page.tsx              # 阅读页
│   ├── settings/
│   │   └── page.tsx              # 设置页（API Key 配置）
│   └── api/                      # API Routes
│       ├── words/
│       │   ├── route.ts          # GET 列表, POST 添加
│       │   ├── [id]/
│       │   │   └── route.ts      # GET 详情, DELETE 删除
│       │   └── recommend/
│       │       └── route.ts      # POST 推荐
│       ├── articles/
│       │   ├── route.ts          # POST 生成文章
│       │   └── [id]/
│       │       └── route.ts      # GET 文章详情
│       └── llm/
│           ├── lookup/
│           │   └── route.ts      # POST 查词
│           └── generate/
│               └── route.ts      # POST 生成文章
│
├── components/                   # 组件
│   ├── ui/                       # shadcn/ui 基础组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── header.tsx            # 头部导航
│   │   └── footer.tsx            # 底部
│   ├── word/
│   │   ├── search-input.tsx      # 搜词输入框
│   │   ├── word-card.tsx         # 单词卡片
│   │   ├── word-detail.tsx       # 单词详情
│   │   └── word-list.tsx         # 单词列表
│   ├── vocabulary/
│   │   ├── word-item.tsx         # 生词列表项
│   │   ├── word-selector.tsx     # 选词组件
│   │   └── recommend-button.tsx  # 推荐按钮
│   └── reading/
│       ├── article-viewer.tsx    # 文章阅读器
│       ├── content-options.tsx   # 类型/长度选择
│       └── highlight-word.tsx    # 生词高亮
│
├── lib/                          # 工具库
│   ├── db.ts                     # 数据库连接
│   ├── llm.ts                    # LLM 客户端
│   ├── utils.ts                  # 通用工具函数
│   └── prompts/                  # Prompt 模板
│       ├── lookup.ts             # 查词 Prompt
│       └── generate.ts           # 生成文章 Prompt
│
├── services/                     # 业务逻辑层
│   ├── word.service.ts           # 单词服务
│   ├── article.service.ts        # 文章服务
│   └── llm.service.ts            # LLM 服务
│
├── stores/                       # 状态管理
│   ├── word.store.ts             # 单词状态
│   └── settings.store.ts         # 设置状态（API Key）
│
├── types/                        # 类型定义
│   ├── word.ts
│   ├── article.ts
│   └── llm.ts
│
├── prisma/                       # 数据库
│   ├── schema.prisma             # 数据模型
│   └── migrations/               # 迁移文件
│
├── public/                       # 静态资源
├── .env.local                    # 环境变量
├── .env.example                  # 环境变量示例
├── PRD.md                        # 产品需求文档
├── TDD.md                        # 技术设计文档
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 三、数据库设计

### 3.1 技术选型

**SQLite + Prisma**

- SQLite：轻量级，无需单独部署数据库服务，数据存储在本地文件
- Prisma：类型安全的 ORM，支持迁移，开发体验好

### 3.2 数据模型

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./data.db"
}

// 单词表
model Word {
  id                String    @id @default(uuid())
  word              String    @unique
  phoneticUs        String    // 美式音标
  phoneticUk        String    // 英式音标
  chineseDefinition String    // 中文释义
  englishDefinition String    // 英文释义
  sentences         String    // JSON: Sentence[]
  synonyms          String    // JSON: Synonym[]
  createdAt         DateTime  @default(now())
  lastReviewedAt    DateTime? // 上次复习时间
  reviewCount       Int       @default(0)  // 复习次数

  @@index([lastReviewedAt])
  @@index([createdAt])
}

// 文章表
model Article {
  id        String   @id @default(uuid())
  content   String   // 文章内容
  wordIds   String   // JSON: string[]
  type      String   // news | story
  length    String   // short | medium | long
  createdAt DateTime @default(now())

  @@index([createdAt])
}

// 用户设置表
model Settings {
  id        String @id @default("default")
  apiKey    String? // 加密存储的 API Key
  apiProvider String @default("openai") // openai | anthropic | others
  updatedAt DateTime @updatedAt
}
```

### 3.3 TypeScript 类型定义

```typescript
// types/word.ts

export interface Sentence {
  en: string
  zh: string
}

export interface Synonym {
  word: string
  difference: string
  example: string
}

export interface Word {
  id: string
  word: string
  phoneticUs: string
  phoneticUk: string
  chineseDefinition: string
  englishDefinition: string
  sentences: Sentence[]
  synonyms: Synonym[]
  createdAt: Date
  lastReviewedAt: Date | null
  reviewCount: number
}

// 创建单词请求
export interface CreateWordRequest {
  word: string
}

// 单词列表查询参数
export interface WordListQuery {
  search?: string
  sortBy?: 'createdAt' | 'lastReviewedAt'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}
```

```typescript
// types/article.ts

export interface Article {
  id: string
  content: string
  wordIds: string[]
  type: 'news' | 'story'
  length: 'short' | 'medium' | 'long'
  createdAt: Date
}

export interface GenerateArticleRequest {
  wordIds: string[]
  type: 'news' | 'story'
  length: 'short' | 'medium' | 'long'
}
```

---

## 四、API 设计

### 4.1 API 概览

| 模块 | 端点 | 方法 | 描述 |
|------|------|------|------|
| 单词 | `/api/words` | GET | 获取单词列表 |
| 单词 | `/api/words` | POST | 添加单词（先查 LLM） |
| 单词 | `/api/words/:id` | GET | 获取单词详情 |
| 单词 | `/api/words/:id` | DELETE | 删除单词 |
| 单词 | `/api/words/:id/review` | POST | 标记已复习 |
| 单词 | `/api/words/recommend` | POST | 获取推荐单词 |
| 单词 | `/api/words/batch-review` | POST | 批量标记已复习 |
| 文章 | `/api/articles` | POST | 生成文章 |
| 文章 | `/api/articles/:id` | GET | 获取文章详情 |
| LLM | `/api/llm/lookup` | POST | 查词（调用 LLM） |
| LLM | `/api/llm/generate` | POST | 生成文章（调用 LLM） |
| 设置 | `/api/settings` | GET | 获取设置状态 |
| 设置 | `/api/settings/api-key` | POST | 保存 API Key |
| 设置 | `/api/settings/api-key` | DELETE | 删除 API Key |
| 设置 | `/api/settings/verify` | POST | 验证 API Key |
| 健康 | `/api/health` | GET | 健康检查（Docker） |

### 4.2 详细 API 设计

#### 4.2.1 单词模块

**GET /api/words - 获取单词列表**

```typescript
// Request
GET /api/words?search=determine&sortBy=lastReviewedAt&order=desc&limit=20&offset=0

// Response 200
{
  "success": true,
  "data": {
    "words": [
      {
        "id": "uuid-1",
        "word": "determine",
        "phoneticUs": "/dɪˈtɜːrmɪn/",
        "phoneticUk": "/dɪˈtɜːmɪn/",
        "chineseDefinition": "v. 决定；确定",
        "englishDefinition": "to cause something to occur...",
        "createdAt": "2026-03-15T10:30:00Z",
        "lastReviewedAt": "2026-03-10T08:00:00Z",
        "reviewCount": 3
      }
    ],
    "total": 128,
    "limit": 20,
    "offset": 0
  }
}
```

**POST /api/words - 添加单词**

```typescript
// Request
POST /api/words
Content-Type: application/json

{
  "word": "determine"
}

// Response 201 (新单词)
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "word": "determine",
    "phoneticUs": "/dɪˈtɜːrmɪn/",
    "phoneticUk": "/dɪˈtɜːmɪn/",
    "chineseDefinition": "v. 决定；确定；查明",
    "englishDefinition": "to cause something to occur in a particular way...",
    "sentences": [
      { "en": "Several factors determine...", "zh": "几个因素决定了..." }
    ],
    "synonyms": [
      { "word": "decide", "difference": "...", "example": "..." }
    ],
    "createdAt": "2026-03-15T10:30:00Z",
    "lastReviewedAt": null,
    "reviewCount": 0
  }
}

// Response 200 (已存在)
{
  "success": true,
  "data": { /* 已存在的单词 */ },
  "message": "单词已存在于生词本中"
}
```

**GET /api/words/:id - 获取单词详情**

```typescript
// Request
GET /api/words/uuid-1

// Response 200
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "word": "determine",
    // ... 完整信息
  }
}

// Response 404
{
  "success": false,
  "error": "单词不存在"
}
```

**DELETE /api/words/:id - 删除单词**

```typescript
// Request
DELETE /api/words/uuid-1

// Response 200
{
  "success": true,
  "message": "删除成功"
}
```

**POST /api/words/recommend - 推荐单词**

```typescript
// Request
POST /api/words/recommend
Content-Type: application/json

{
  "count": 10  // 推荐 10 个单词
}

// Response 200
{
  "success": true,
  "data": {
    "words": [
      {
        "id": "uuid-1",
        "word": "determine",
        "reason": "5天未复习",
        // ... 其他字段
      }
    ]
  }
}
```

#### 4.2.2 文章模块

**POST /api/articles - 生成文章**

```typescript
// Request
POST /api/articles
Content-Type: application/json

{
  "wordIds": ["uuid-1", "uuid-2", "uuid-3"],
  "type": "story",
  "length": "medium"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "article-uuid",
    "content": "In the world of scientific research...",
    "wordIds": ["uuid-1", "uuid-2", "uuid-3"],
    "type": "story",
    "length": "medium",
    "createdAt": "2026-03-15T11:00:00Z"
  }
}
```

**GET /api/articles/:id - 获取文章详情**

```typescript
// Request
GET /api/articles/article-uuid

// Response 200
{
  "success": true,
  "data": {
    "id": "article-uuid",
    "content": "...",
    "wordIds": ["uuid-1", "uuid-2"],
    "words": [
      { "id": "uuid-1", "word": "determine" },
      { "id": "uuid-2", "word": "brilliant" }
    ],
    "type": "story",
    "length": "medium",
    "createdAt": "2026-03-15T11:00:00Z"
  }
}
```

#### 4.2.3 LLM 模块

**POST /api/llm/lookup - 查词**

```typescript
// Request
POST /api/llm/lookup
Content-Type: application/json

{
  "word": "determine"
}

// Response 200
{
  "success": true,
  "data": {
    "word": "determine",
    "phoneticUs": "/dɪˈtɜːrmɪn/",
    "phoneticUk": "/dɪˈtɜːmɪn/",
    "chineseDefinition": "v. 决定；确定；查明",
    "englishDefinition": "to cause something to occur in a particular way...",
    "sentences": [
      {
        "en": "Several factors determine the success of the project.",
        "zh": "几个因素决定了项目的成功。"
      }
      // ... 共 5 句
    ],
    "synonyms": [
      {
        "word": "decide",
        "difference": "decide 更强调做出选择，determine 更强调因果关系",
        "example": "We need to decide by tomorrow."
      }
      // ... 共 4-5 个
    ]
  }
}

// Response 400 (API Key 未配置)
{
  "success": false,
  "error": "API_KEY_NOT_CONFIGURED",
  "message": "请先在设置页面配置 API Key"
}

// Response 500 (LLM 调用失败)
{
  "success": false,
  "error": "LLM_ERROR",
  "message": "查词失败，请稍后重试"
}
```

**POST /api/llm/generate - 生成文章**

```typescript
// Request
POST /api/llm/generate
Content-Type: application/json

{
  "words": ["determine", "brilliant", "eager"],
  "type": "story",
  "length": "medium"
}

// Response 200
{
  "success": true,
  "data": {
    "content": "In the world of scientific research, several factors determine the success of a project. A brilliant scientist must be eager to discover new findings..."
  }
}
```

#### 4.2.4 设置模块

**GET /api/settings - 获取设置状态**

```typescript
// Request
GET /api/settings

// Response 200 (已配置)
{
  "success": true,
  "data": {
    "hasApiKey": true,
    "apiProvider": "zhipu"
  }
}

// Response 200 (未配置)
{
  "success": true,
  "data": {
    "hasApiKey": false,
    "apiProvider": null
  }
}
```

**POST /api/settings/api-key - 保存 API Key**

```typescript
// Request
POST /api/settings/api-key
Content-Type: application/json

{
  "apiKey": "your-zhipu-api-key"
}

// Response 200
{
  "success": true,
  "message": "API Key 保存成功"
}

// Response 400 (无效的 API Key)
{
  "success": false,
  "error": "INVALID_API_KEY",
  "message": "API Key 格式无效"
}
```

**DELETE /api/settings/api-key - 删除 API Key**

```typescript
// Request
DELETE /api/settings/api-key

// Response 200
{
  "success": true,
  "message": "API Key 已删除"
}
```

**POST /api/settings/verify - 验证 API Key**

```typescript
// Request
POST /api/settings/verify
Content-Type: application/json

{
  "apiKey": "your-zhipu-api-key"
}

// Response 200 (验证成功)
{
  "success": true,
  "data": {
    "valid": true,
    "message": "API Key 有效"
  }
}

// Response 200 (验证失败)
{
  "success": true,
  "data": {
    "valid": false,
    "message": "API Key 无效或已过期"
  }
}
```

#### 4.2.5 复习模块

**POST /api/words/:id/review - 标记已复习**

```typescript
// Request
POST /api/words/uuid-1/review
Content-Type: application/json

{
  "articleId": "article-uuid"  // 可选：关联的文章
}

// Response 200
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "word": "determine",
    "lastReviewedAt": "2026-03-15T12:00:00Z",
    "reviewCount": 4  // 原来是 3，现在 +1
  }
}
```

**POST /api/words/batch-review - 批量标记已复习**

```typescript
// Request
POST /api/words/batch-review
Content-Type: application/json

{
  "wordIds": ["uuid-1", "uuid-2", "uuid-3"],
  "articleId": "article-uuid"  // 可选
}

// Response 200
{
  "success": true,
  "data": {
    "updated": 3,
    "words": [
      {
        "id": "uuid-1",
        "word": "determine",
        "lastReviewedAt": "2026-03-15T12:00:00Z",
        "reviewCount": 4
      }
      // ...
    ]
  }
}
```

---

## 五、核心业务流程

### 5.1 查词流程

```
用户输入单词
    │
    ▼
┌─────────────┐
│ 本地查重    │ ← 单词是否已存在？
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
  是      否
   │       │
   ▼       ▼
返回    调用 LLM API
已有     │
单词     ▼
      解析响应
         │
         ▼
      存入数据库
         │
         ▼
      返回结果
```

### 5.2 生成文章流程

```
用户选词 + 选择类型/长度
    │
    ▼
获取单词列表
    │
    ▼
构建 Prompt
    │
    ▼
调用 LLM API
    │
    ▼
处理响应（高亮生词）
    │
    ▼
存入数据库
    │
    ▼
返回文章
```

### 5.3 推荐算法

```typescript
// 简化版：按上次复习时间排序
// 优先推荐：从未复习过的 > 最久未复习的

async function recommendWords(count: number) {
  const words = await prisma.word.findMany({
    orderBy: [
      { lastReviewedAt: 'asc' },  // null 排在前面（从未复习）
      { createdAt: 'asc' }
    ],
    take: count
  })

  return words.map(word => ({
    ...word,
    reason: word.lastReviewedAt
      ? `${daysSince(word.lastReviewedAt)}天未复习`
      : '从未复习'
  }))
}
```

---

## 六、LLM 集成方案

### 6.1 API Key 管理

**安全考虑：前端 localStorage 不安全，API Key 会暴露给用户。**

**方案：服务端加密存储**

```
用户输入 API Key
    │
    ▼
前端发送到后端
    │
    ▼
后端加密存储到 SQLite
    │
    ▼
调用 LLM 时解密使用
```

```typescript
// lib/encryption.ts

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

// 从环境变量获取加密密钥
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY not configured')
  }
  return Buffer.from(key, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // 格式: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey()
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':')

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)

  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
```

```typescript
// lib/llm.ts

import { createOpenAI } from '@ai-sdk/openai'

type Provider = 'zhipu'

// 从数据库获取并解密 API Key
async function getApiKey(): Promise<string> {
  const settings = await prisma.settings.findUnique({
    where: { id: 'default' }
  })

  if (!settings?.apiKey) {
    throw new Error('API Key 未配置，请在设置页面添加')
  }

  return decrypt(settings.apiKey)
}

// 创建智谱 AI 客户端
export async function createLLMClient() {
  const apiKey = await getApiKey()

  // 智谱 AI 使用 OpenAI 兼容接口
  return createOpenAI({
    apiKey,
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  })('glm-4-flash')  // 可选: glm-4, glm-4-flash, glm-4-plus
}
```

### 6.2 结构化输出方案

**问题：** 仅靠 Prompt 让 LLM 返回 JSON 不够可靠，可能出现格式错误、字段缺失等问题。

**解决方案：** 使用 Vercel AI SDK 的 `generateObject` + Zod Schema

```
┌─────────────────────────────────────────────────────────┐
│                    结构化输出流程                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Zod Schema ──→ generateObject ──→ 类型安全的 JSON       │
│       │              │                │                 │
│       │              │                │                 │
│   定义结构      强制模型遵守      自动验证+解析            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 6.2.1 定义 Schema

```typescript
// lib/schemas/word.schema.ts

import { z } from 'zod'

// 例句 Schema
export const SentenceSchema = z.object({
  en: z.string().describe('英文例句'),
  zh: z.string().describe('中文翻译'),
})

// 近义词 Schema
export const SynonymSchema = z.object({
  word: z.string().describe('近义词'),
  difference: z.string().describe('与原词的主要使用区别'),
  example: z.string().describe('例句'),
})

// 查词结果 Schema
export const LookupResultSchema = z.object({
  phoneticUs: z.string().describe('美式音标，如 /dɪˈtɜːrmɪn/'),
  phoneticUk: z.string().describe('英式音标'),
  chineseDefinition: z.string().describe('中文释义'),
  englishDefinition: z.string().describe('英文释义，用简单词汇解释'),
  sentences: z.array(SentenceSchema).min(5).max(5).describe('5个例句'),
  synonyms: z.array(SynonymSchema).min(4).max(5).describe('4-5个近义词'),
})

// 导出 TypeScript 类型
export type LookupResult = z.infer<typeof LookupResultSchema>
export type Sentence = z.infer<typeof SentenceSchema>
export type Synonym = z.infer<typeof SynonymSchema>
```

#### 6.2.2 生成文章 Schema

```typescript
// lib/schemas/article.schema.ts

import { z } from 'zod'

// 文章生成结果 Schema
export const ArticleResultSchema = z.object({
  content: z.string().describe('生成的文章内容，包含指定的单词'),
})

export type ArticleResult = z.infer<typeof ArticleResultSchema>
```

### 6.3 LLM Service 实现

```typescript
// services/llm.service.ts

import { generateObject } from 'ai'
import { createLLMClient } from '@/lib/llm'
import { LookupResultSchema } from '@/lib/schemas/word.schema'
import { LENGTH_MAP, TYPE_MAP } from '@/lib/prompts'

export class LLMService {
  /**
   * 查词 - 使用结构化输出
   *
   * 优势：
   * 1. 强制模型按 Schema 输出
   * 2. 自动验证字段类型和数量
   * 3. 返回类型安全的数据
   */
  async lookupWord(word: string) {
    const client = await createLLMClient()

    const { object } = await generateObject({
      model: client,
      schema: LookupResultSchema,
      prompt: `你是一位专业的英语词典编辑。请查询单词 "${word}" 并返回以下信息：

1. 音标（美式和英式，使用 IPA 国际音标格式）
2. 中文释义
3. 英文释义（用简单词汇解释，适合中级学习者）
4. 5个例句（难度适中，每句附带中文翻译）
5. 4-5个近义词（每个附带使用区别和例句）

注意：
- 例句要自然、地道，不要太简单也不要太复杂
- 近义词要说明与原词在语义和使用场景上的区别`,
      temperature: 0.3,  // 低温度，输出更稳定
    })

    return object  // 类型自动推断为 LookupResult
  }

  /**
   * 生成文章 - 使用结构化输出
   */
  async generateArticle(
    words: string[],
    type: 'news' | 'story',
    length: 'short' | 'medium' | 'long'
  ) {
    const client = await createLLMClient()

    const wordCount = LENGTH_MAP[length]
    const typeName = TYPE_MAP[type]

    const { object } = await generateObject({
      model: client,
      schema: ArticleResultSchema,
      prompt: `你是一位英语教育内容创作者。请根据以下单词创作一篇${typeName}。

单词列表：${words.join(', ')}

要求：
1. 文章长度约 ${wordCount} 词
2. 自然地融入所有给定单词，加粗显示（用 **单词** 格式）
3. 内容连贯、有逻辑，适合中级英语学习者阅读
4. 难度适中，句式不要太复杂
5. 不要添加标题，直接开始正文

示例输出格式：
In the world of scientific research, several factors **determine** the success...`,
      temperature: 0.7,  // 高温度，更有创意
    })

    return object.content
  }

  /**
   * 验证 API Key 是否有效
   */
  async verifyApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = createOpenAI({
        apiKey,
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
      })('glm-4-flash')

      // 发送一个简单请求测试
      await generateObject({
        model: client,
        schema: z.object({ success: z.boolean() }),
        prompt: '回复 {"success": true}',
      })

      return true
    } catch {
      return false
    }
  }
}
```

### 6.4 错误处理

```typescript
// services/llm.service.ts (续)

import { AI_InvalidResponseError, AI_NoOutputSpecifiedError } from 'ai'

export class LLMService {
  async lookupWord(word: string) {
    try {
      const client = await createLLMClient()

      const { object } = await generateObject({
        model: client,
        schema: LookupResultSchema,
        prompt: `...`,
        temperature: 0.3,
        maxRetries: 2,  // 失败时自动重试 2 次
      })

      return object

    } catch (error) {
      // Schema 验证失败
      if (error instanceof AI_InvalidResponseError) {
        console.error('LLM 输出格式错误:', error.cause)
        throw new Error('查词结果格式异常，请重试')
      }

      // API Key 问题
      if (error.message?.includes('API key')) {
        throw new Error('API Key 无效，请检查配置')
      }

      // 网络问题
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('网络连接失败，请稍后重试')
      }

      // 其他错误
      console.error('LLM 调用失败:', error)
      throw new Error('查词失败，请稍后重试')
    }
  }
}
```

### 6.5 结构化输出 vs 普通 Prompt 对比

| 方案 | 可靠性 | 类型安全 | 错误处理 |
|------|--------|----------|----------|
| 普通 Prompt + JSON.parse | ❌ 低（可能输出非法 JSON） | ❌ 无 | ❌ 需手动处理 |
| Prompt + JSON Mode | ⚠️ 中（格式正确但结构不定） | ❌ 无 | ⚠️ 部分 |
| **generateObject + Zod** | ✅ 高（强制遵守 Schema） | ✅ 完整 | ✅ 自动验证 |

### 6.6 智谱 AI 兼容性说明

智谱 AI 提供 **OpenAI 兼容接口**，支持：

| 功能 | 支持情况 | 说明 |
|------|----------|------|
| Chat Completions API | ✅ 支持 | 使用 OpenAI SDK |
| JSON Mode | ✅ 支持 | `response_format: { type: "json_object" }` |
| Function Calling | ⚠️ 部分支持 | 建议用 generateObject 替代 |
| Structured Output | ✅ 支持 | 通过 Vercel AI SDK |

**Vercel AI SDK 底层实现：**
- 自动添加 JSON Mode 参数
- 将 Zod Schema 转换为 JSON Schema
- 验证输出是否符合 Schema
- 不符合时自动重试

### 6.7 Prompt 常量定义

```typescript
// lib/prompts/index.ts

// 文章长度映射
export const LENGTH_MAP = {
  short: '200',
  medium: '500',
  long: '800'
} as const

// 文章类型映射
export const TYPE_MAP = {
  news: '英语新闻',
  story: '英语短篇故事'
} as const

// 类型导出
export type ArticleLength = keyof typeof LENGTH_MAP
export type ArticleType = keyof typeof TYPE_MAP
```

---

## 七、状态管理

### 7.1 Settings Store（API Key）

```typescript
// stores/settings.store.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  apiKey: string
  apiProvider: 'openai' | 'anthropic'
  setApiKey: (key: string) => void
  setApiProvider: (provider: 'openai' | 'anthropic') => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      apiProvider: 'openai',
      setApiKey: (key) => set({ apiKey: key }),
      setApiProvider: (provider) => set({ apiProvider: provider }),
    }),
    {
      name: 'easywords-settings',
    }
  )
)
```

### 7.2 Word Store（可选，用于前端缓存）

```typescript
// stores/word.store.ts

import { create } from 'zustand'
import { Word } from '@/types/word'

interface WordState {
  words: Word[]
  selectedIds: string[]
  setWords: (words: Word[]) => void
  addWord: (word: Word) => void
  removeWord: (id: string) => void
  toggleSelect: (id: string) => void
  clearSelection: () => void
}

export const useWordStore = create<WordState>((set) => ({
  words: [],
  selectedIds: [],
  setWords: (words) => set({ words }),
  addWord: (word) => set((state) => ({
    words: [word, ...state.words]
  })),
  removeWord: (id) => set((state) => ({
    words: state.words.filter(w => w.id !== id)
  })),
  toggleSelect: (id) => set((state) => ({
    selectedIds: state.selectedIds.includes(id)
      ? state.selectedIds.filter(i => i !== id)
      : [...state.selectedIds, id]
  })),
  clearSelection: () => set({ selectedIds: [] }),
}))
```

---

## 八、安全考虑

### 8.1 API Key 存储

```typescript
// 方案一：前端 localStorage（MVP 推荐）
// 使用 Zustand persist 中间件自动持久化

// 方案二：服务端加密存储
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const SECRET_KEY = process.env.ENCRYPTION_KEY!

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decrypt(text: string): string {
  const [ivHex, encrypted] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

### 8.2 输入验证

```typescript
// 使用 Zod 进行输入验证
import { z } from 'zod'

export const LookupWordSchema = z.object({
  word: z.string().min(1).max(50).regex(/^[a-zA-Z-]+$/),
})

export const GenerateArticleSchema = z.object({
  wordIds: z.array(z.string().uuid()).min(1).max(20),
  type: z.enum(['news', 'story']),
  length: z.enum(['short', 'medium', 'long']),
})
```

---

## 九、开发环境配置

### 9.1 环境变量

```bash
# .env.example

# 加密密钥（用于服务端存储 API Key）
# 生成方式: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your-32-byte-hex-string-here

# 数据库路径（Docker 部署时需要映射到持久化卷）
DATABASE_URL="file:./data/easywords.db"

# 服务端口（默认 3000）
PORT=3000

# Node 环境
NODE_ENV=development
```

### 9.2 开发脚本

```json
// package.json

{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

---

## 十、Docker 部署

### 10.1 Docker 兼容性设计

**关键注意事项：**

| 问题 | 解决方案 |
|------|----------|
| 数据持久化 | 数据库文件映射到 Docker Volume |
| 路径硬编码 | 使用环境变量配置路径 |
| 加密密钥 | 通过环境变量注入 |
| 端口配置 | 支持环境变量 PORT |
| 构建依赖 | 明确声明 node 版本 |

### 10.2 数据库路径配置

```typescript
// lib/db.ts

import { PrismaClient } from '@prisma/client'

// 使用环境变量配置数据库路径，支持 Docker 部署
const databaseUrl = process.env.DATABASE_URL || 'file:./data/easywords.db'

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasourceUrl: databaseUrl,
  })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
```

```prisma
// prisma/schema.prisma

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

### 10.3 Dockerfile

```dockerfile
# Dockerfile

# Stage 1: 依赖安装
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 安装依赖
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# Stage 2: 构建
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 构建 Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: 运行
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# 创建数据目录
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 10.4 docker-compose.yml

```yaml
# docker-compose.yml

version: '3.8'

services:
  easywords:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: easywords
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/data/easywords.db
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - PORT=3000
    volumes:
      # 持久化数据库
      - easywords-data:/app/data
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  easywords-data:
```

### 10.5 Docker 部署命令

```bash
# 生成加密密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 创建 .env 文件
cat > .env << EOF
ENCRYPTION_KEY=刚才生成的密钥
DATABASE_URL=file:/app/data/easywords.db
EOF

# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 备份数据
docker run --rm -v easywords-data:/data -v $(pwd):/backup alpine tar czf /backup/easywords-backup.tar.gz -C /app/data .
```

### 10.6 健康检查 API

```typescript
// app/api/health/route.ts

import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    // 测试数据库连接
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
    }, { status: 503 })
  }
}
```

---

## 十一、部署方案

### 11.1 本地开发

```bash
# 安装依赖
pnpm install

# 生成加密密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入 ENCRYPTION_KEY

# 创建数据目录
mkdir -p data

# 初始化数据库
pnpm db:migrate

# 启动开发服务器
pnpm dev
```

### 11.2 Docker 部署（推荐生产环境）

```bash
# 1. 生成加密密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. 创建 .env 文件
ENCRYPTION_KEY=你的密钥

# 3. 构建并启动
docker-compose up -d --build

# 4. 访问应用
open http://localhost:3000
```

### 11.3 数据备份

```bash
# 备份 SQLite 数据库
cp data/easywords.db backup/easywords-$(date +%Y%m%d).db

# Docker 环境
docker-compose exec easywords sqlite3 /app/data/easywords.db ".backup /app/data/backup.db"
```

---

## 十二、下一步

1. **确认技术方案** - 是否有需要调整的地方？
2. **初始化项目** - 创建 Next.js 项目 + 安装依赖
3. **实现 Phase 1** - 查词功能

---

**已确认的技术决策：**

| 决策项 | 结论 |
|--------|------|
| API Key 存储 | ✅ 服务端加密存储（安全） |
| LLM 提供商 | ✅ 智谱 AI（国内访问稳定） |
| 数据库 | ✅ 本地 SQLite |
| 部署方式 | ✅ Docker（兼容容器化部署） |

---

## 十三、智谱 AI 接入说明

### 模型选择

| 模型 | 特点 | 适用场景 |
|------|------|----------|
| glm-4-flash | 快速、便宜 | 查词、日常使用（推荐） |
| glm-4 | 平衡性价比 | 文章生成 |
| glm-4-plus | 高质量 | 复杂任务 |

### API 调用示例

```typescript
// 使用 OpenAI 兼容接口调用智谱 AI
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

const zhipu = createOpenAI({
  apiKey: 'your-zhipu-api-key',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
})

const { text } = await generateText({
  model: zhipu('glm-4-flash'),
  prompt: '你好',
})
```

### 获取 API Key

1. 访问 [智谱开放平台](https://open.bigmodel.cn/)
2. 注册/登录账号
3. 进入控制台 → API 密钥
4. 创建新密钥
