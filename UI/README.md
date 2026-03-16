# EasyWords - 语境化单词学习工具

通过在真实语境中阅读来复习单词，让学习更有效。

## 功能特性

### 1. 查词功能
- 输入单词查询详细信息
- 显示美式/英式音标
- 提供中文和英文释义
- 5个实用例句（含中英对照）
- 4-5个近义词对比（含使用区别和例句）

### 2. 生词本管理
- 保存查询过的单词
- 支持搜索和筛选
- 显示添加时间和复习状态
- 删除不需要的单词

### 3. 智能推荐
- 自动推荐需要复习的单词
- 基于复习时间的智能算法
- 优先推荐从未复习过的单词

### 4. 语境阅读
- 选择生词生成个性化文章
- 支持两种内容类型：新闻、故事
- 三种长度选项：短篇(~200词)、中篇(~500词)、长篇(~800词)
- 生词在文章中加粗显示
- 标记已复习，自动更新复习时间

## 技术栈

- **前端框架**: React 18
- **路由**: React Router 7
- **UI组件**: shadcn/ui + Tailwind CSS
- **样式**: Tailwind CSS v4
- **图标**: Lucide React
- **通知**: Sonner
- **数据存储**: LocalStorage（模拟后端API）

## 项目结构

```
src/app/
├── components/          # 组件
│   ├── layout/         # 布局组件
│   ├── word/           # 单词相关组件
│   └── ui/             # UI基础组件
├── pages/              # 页面
│   ├── Home.tsx        # 查词页
│   ├── Vocabulary.tsx  # 生词本页
│   ├── Reading.tsx     # 阅读页
│   └── Settings.tsx    # 设置页
├── services/           # 服务层
│   ├── api.ts          # API服务（模拟）
│   ├── storage.ts      # 本地存储
│   ├── mockData.ts     # 模拟数据
│   └── initData.ts     # 初始化数据
├── types/              # 类型定义
│   ├── word.ts
│   └── article.ts
├── routes.tsx          # 路由配置
└── App.tsx             # 主应用

## 使用指南

### 快速开始

1. **查词并保存**
   - 在首页输入英文单词
   - 查看详细释义
   - 点击"保存到生词本"

2. **选词复习**
   - 进入生词本页面
   - 手动勾选单词或点击"推荐 10 词"
   - 选择文章类型和长度

3. **生成阅读**
   - 点击"生成内容"按钮
   - 阅读生成的文章（生词加粗显示）
   - 阅读完成后点击"标记已复习"

### 示例数据

应用已预置3个示例单词：
- **determine** - 决定、确定
- **brilliant** - 杰出的、灿烂的
- **eager** - 渴望的、热切的

您可以直接进入生词本体验完整流程！

## API接口说明

本应用使用LocalStorage模拟后端API，所有数据存储在浏览器本地。

### 主要API

- `GET /api/words` - 获取单词列表
- `POST /api/words` - 添加单词
- `DELETE /api/words/:id` - 删除单词
- `POST /api/words/recommend` - 推荐单词
- `POST /api/articles` - 生成文章
- `POST /api/llm/lookup` - 查词（模拟LLM调用）

## 数据模型

### Word（单词）
```typescript
{
  id: string
  word: string
  phoneticUs: string
  phoneticUk: string
  chineseDefinition: string
  englishDefinition: string
  sentences: Sentence[]
  synonyms: Synonym[]
  createdAt: string
  lastReviewedAt: string | null
  reviewCount: number
}
```

### Article（文章）
```typescript
{
  id: string
  content: string
  wordIds: string[]
  type: 'news' | 'story'
  length: 'short' | 'medium' | 'long'
  createdAt: string
}
```

## 设计理念

- **简洁现代** - 白色背景，卡片式布局
- **阅读友好** - 适合长时间阅读的字体和行距
- **操作简单** - 核心流程不超过3步
- **语境学习** - 在真实语境中记忆单词，效果更好

## 浏览器支持

- Chrome（最新版）
- Edge（最新版）
- Safari（最新版）
- Firefox（最新版）

## 版本信息

- 版本：MVP v1.0
- 更新日期：2026-03-15

## 未来规划

- V1.1: 悬停显示释义、播放发音、学习统计
- V2.0: 浏览器插件、云端同步、社交功能

---

**注意**: 这是一个演示版本，使用模拟数据。实际生产环境需要接入真实的LLM API（如智谱AI）和后端数据库。
