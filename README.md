# EasyWords - 语境化单词学习工具

帮助英语学习爱好者通过在真实语境中阅读来复习单词。

## 项目结构

```
EasyWordsV2/
├── UI/                 # 前端项目 (Vite + React)
│   └── src/
│       └── app/
│           ├── pages/      # 页面组件
│           ├── components/ # UI 组件
│           ├── services/   # API 服务
│           └── types/      # 类型定义
│
├── server/             # 后端项目 (Next.js API)
│   ├── prisma/
│   │   └── schema.prisma   # 数据库模型
│   └── src/
│       ├── app/api/        # API 路由
│       └── lib/            # 工具函数
│
├── PRD.md              # 产品需求文档
├── TDD.md              # 技术设计文档
└── start.bat           # 启动脚本 (Windows)
```

## 快速开始

### 环境要求

- Node.js 18+
- pnpm (推荐)

### 安装依赖

```bash
# 后端
cd server
pnpm install
pnpm db:push    # 初始化数据库

# 前端
cd ../UI
pnpm install
```

### 启动服务

**方式一：使用启动脚本 (Windows)**
```bash
# 双击 start.bat
```

**方式二：手动启动**
```bash
# 终端 1 - 后端
cd server
pnpm dev

# 终端 2 - 前端
cd UI
pnpm dev
```

### 访问地址

- 前端: http://localhost:5173
- 后端: http://localhost:3001

## 功能特性

### 查词
- 输入英文单词，获取详细信息
- 音标（美式/英式）
- 中英文释义
- 5 个例句
- 4-5 个近义词及辨析

### 生词本
- 保存查询单词
- 搜索/筛选
- 自动推荐（按遗忘程度）
- 删除单词

### 内容生成
- 选择单词生成文章
- 支持新闻/故事类型
- 支持短/中/长篇幅
- 生词加粗显示

### 设置
- 配置智谱 AI API Key
- 加密存储
- 验证 API Key

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vite + React + TypeScript |
| UI 组件 | shadcn/ui + Tailwind CSS |
| 后端框架 | Next.js 14 App Router |
| 数据库 | SQLite + Prisma |
| LLM | 智谱 AI (glm-4-flash) |
| 结构化输出 | Vercel AI SDK + Zod |

## API 接口

### 单词模块
- `POST /api/words/lookup` - 查词
- `GET /api/words` - 获取单词列表
- `POST /api/words` - 添加单词
- `GET /api/words/:id` - 获取详情
- `DELETE /api/words/:id` - 删除
- `POST /api/words/recommend` - 推荐
- `POST /api/words/review` - 标记已复习

### 文章模块
- `POST /api/articles` - 生成文章
- `GET /api/articles/:id` - 获取文章

### 设置模块
- `GET /api/settings` - 获取设置状态
- `POST /api/settings/api-key` - 保存 API Key
- `DELETE /api/settings/api-key` - 删除 API Key
- `POST /api/settings/verify` - 验证 API Key

## 配置

### API Key 获取
1. 访问 [智谱AI开放平台](https://open.bigmodel.cn/)
2. 注册并创建应用
3. 获取 API Key
4. 在设置页面配置

### 环境变量 (后端)
```env
DATABASE_URL="file:./data/easywords.db"
ENCRYPTION_KEY="your-32-byte-hex-string"
```

## 开发命令

```bash
# 后端
cd server
pnpm dev          # 启动开发服务
pnpm db:studio    # 打开数据库管理界面
pnpm db:migrate   # 创建迁移

# 前端
cd UI
pnpm dev          # 启动开发服务
pnpm build        # 构建
```

## 版本

- MVP v1.0
- 更新日期：2026-03-15
