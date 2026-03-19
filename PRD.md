# EasyWords - 产品需求文档 (PRD)

> 版本：V3.0
> 更新日期：2026-03-18
> 状态：需求定义完成

---

## 一、产品概述

### 1.1 产品名称
**EasyWords** - 语境化单词学习工具

### 1.2 产品定位
帮助英语学习爱好者通过**在真实语境中阅读**来复习单词，解决生词本"存得多、记得少"的问题。

### 1.3 核心价值
- 在语境中记忆单词，比孤立背诵更有效
- 将查词、积累、复习形成闭环
- 个性化内容生成，学习不再枯燥

---

## 二、用户画像

### 2.1 目标用户
- 英语学习爱好者
- 日常阅读英文材料（文章、新闻、小说、专业文档）
- 有持续学习需求，无考试压力
- 每天可能查 0-5 个新单词

### 2.2 用户场景
1. 阅读英文材料时遇到生词
2. 查词典了解词义、发音、用法
3. 保存到生词本
4. 生词积累越来越多，复习跟不上
5. 孤立背单词枯燥，难以坚持

### 2.3 核心痛点
| 痛点 | 描述 |
|------|------|
| 生词量大 | 持续积累，但复习跟不上 |
| 记忆效率低 | 脱离语境背单词，效果差 |
| 缺乏动力 | 背单词过程枯燥 |

### 2.4 用户提出的解决方案
> "选一些单词生成新闻或故事，生词加粗，通过阅读来复习"

---

## 三、功能需求

### 3.1 功能架构

```
EasyWords
├── 模块一：查词与生词本
│   ├── 输入单词
│   ├── AI 查词
│   ├── 生词列表
│   └── 生词详情
│
├── 模块二：选词与推荐
│   ├── 手动选词
│   └── 自动推荐
│
├── 模块三：内容生成与阅读
│   ├── 选择内容类型/长度
│   ├── 生成内容
│   └── 阅读体验（生词加粗）
│
└── 模块四：对话音频生成（V2.0 新增）
    ├── 选择单词（最多3个）
    ├── AI 生成对话
    ├── TTS 语音合成
    └── 音频播放（含字幕）
```

### 3.2 功能清单

#### 模块一：查词与生词本

| 功能 | 描述 | 优先级 |
|------|------|--------|
| F-101 输入单词 | 用户手动输入生词 | P0 |
| F-102 AI 查词 | 调用大模型返回详细信息 | P0 |
| F-103 保存生词 | 将单词保存到生词本 | P0 |
| F-104 生词列表 | 展示所有已保存单词，支持搜索、排序；点击卡片行直接选中/取消选中 | P0 |
| F-105 生词详情 | 点击眼睛图标查看完整释义、造句、近义词（弹窗展示） | P0 |
| F-106 删除生词 | 点击删除图标从生词本移除单词 | P1 |

**AI 查词返回内容规范：**

```json
{
  "word": "determine",
  "phonetic": {
    "us": "/dɪˈtɜːrmɪn/",
    "uk": "/dɪˈtɜːmɪn/"
  },
  "chineseDefinition": "v. 决定；确定；查明",
  "englishDefinition": "to cause something to occur in a particular way; to be the decisive factor in",
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
      "difference": "decide 更强调做出选择或决断，determine 更强调因果关系或最终结果",
      "example": "We need to decide by tomorrow."
    }
    // ... 共 4-5 个近义词
  ],
  "createdAt": "2026-03-15T10:30:00Z",
  "lastReviewedAt": null
}
```

#### 模块二：选词与推荐

| 功能 | 描述 | 优先级 |
|------|------|--------|
| F-201 手动选词 | 勾选想复习的单词 | P0 |
| F-202 自动推荐 | 按遗忘程度推荐需复习的词 | P0 |
| F-203 推荐数量设置 | 设置推荐词数（默认 10） | P1 |

**推荐算法（MVP 简化版）：**
- 记录每个单词的「上次复习时间」
- 推荐规则：距离上次复习时间最长的 N 个词
- 如从未复习过，按添加时间排序

#### 模块三：内容生成与阅读

| 功能 | 描述 | 优先级 |
|------|------|--------|
| F-301 选择内容类型 | 新闻 / 故事 | P0 |
| F-302 选择内容长度 | 短篇（~200词）/ 中篇（~500词）/ 长篇（~800词） | P0 |
| F-303 生成内容 | 调用大模型生成文章 | P0 |
| F-304 生词加粗 | 在文章中加粗显示选中的生词（仅标记给定生词，需验证是否在生词列表中） | P0 |
| F-305 标记已复习 | 阅读完成后更新单词的「上次复习时间」 | P0 |
| F-306 重新生成 | 不满意可重新生成 | P1 |
| F-307 移动端查词 | 长按单词查看基本释义（移动端），双击查词（PC端） | P1 |
| F-308 推荐功能优化 | 推荐10词按钮移至生成文章表单内，推荐3词按钮在对话音频表单内 | P1 |

**内容生成 Prompt 规范：**
```
你是一位英语教育内容创作者。请根据以下单词列表，创作一篇【新闻/故事】。

要求：
1. 文章长度约【200/500/800】词
2. 自然地融入所有给定单词，不要生硬堆砌
3. 内容连贯、有逻辑，适合中级英语学习者阅读
4. 难度适中，句式不要过于复杂
5. **非常重要**：只有「给定单词列表」中的单词才需要用双星号包裹（如 **word**），其他任何单词都不要加星号！

给定单词列表（只有这些词需要加 ** 标记）：[word1, word2, word3, ...]

请先输出一个简短的英文标题（一行），然后空一行，再输出文章内容。
```

**前端渲染规则：**
- 解析 `**word**` 格式
- **必须验证** word 是否在生词列表中
- 只有真正的生词才高亮显示
- 非生词移除星号但不高亮

#### 模块四：对话音频生成（V2.0 新增）

| 功能 | 描述 | 优先级 |
|------|------|--------|
| F-401 选择单词 | 在生词本选择 1-3 个单词 | P0 |
| F-402 AI 生成对话 | 根据单词生成 20 秒左右的对话内容 | P0 |
| F-403 TTS 语音合成 | 使用 Web Speech API 将对话转换为自然语音（男女声） | P0 |
| F-404 音频播放 | 播放对话音频，支持暂停/重播 | P0 |
| F-405 字幕显示 | 实时显示对话字幕，目标单词高亮 | P0 |
| F-406 口音选择 | 支持美式、英式、印度、澳洲四种英语口音 | P1 |
| F-407 对话记录 | 保存历史生成的对话，可重新播放 | P1 |

**对话生成 Prompt 规范：**
```
你是一位英语教育内容创作者。请根据以下单词，创作一段 20 秒左右的对话（约 50-60 词）。

要求：
1. 两人对话形式（A 和 B），自然融入所有单词
2. 对话场景贴近日常生活或工作
3. 语言地道，适合中级学习者
4. 每个单词至少出现一次，用 **单词** 格式标记
5. **非常重要**：只有「给定单词列表」中的单词才需要用双星号包裹

单词列表（只有这些词需要加 ** 标记）：[word1, word2, word3]

返回 JSON 格式：
{
  "scene": "场景描述",
  "dialogue": [
    {"speaker": "A", "text": "对话内容，包含 **word1**"},
    {"speaker": "B", "text": "对话内容，包含 **word2**"},
    {"speaker": "A", "text": "..."}
  ]
}
```

**前端渲染规则：**
- 解析 `**word**` 格式
- **必须验证** word 是否在生词列表中
- 只有真正的生词才高亮显示
- 非生词移除星号但不高亮

**技术实现方案：**

| 环节 | 技术方案 | 成本 |
|------|----------|------|
| 对话生成 | 智谱 GLM-4-flash | 极低（现有） |
| 语音合成 | Web Speech API（浏览器原生） | 免费 |

**口音支持：**
- 🇺🇸 美式英语 (en-US)
- 🇬🇧 英式英语 (en-GB)
- 🇮🇳 印度英语 (en-IN)
- 🇦🇺 澳洲英语 (en-AU)

**音频规格：**
- 时长：约 20-30 秒（4-6 轮对话）
- 格式：浏览器原生 TTS 实时合成
- 说话人：自动分配男声(A) + 女声(B)
- 字幕：实时滚动，目标单词高亮（**word** 格式）

**移动端查词功能：**
- 长按 800ms 触发查词
- 使用 `caretRangeFromPoint` API 精确定位触摸位置的单词
- 调用快速查词 API 返回基本释义（音标 + 中文）
- 支持双击查词（PC端）

---

## 四、用户故事

### P0 - 必须有（MVP）

**US-001：查词**
> 作为学习者，我输入一个单词，系统调用大模型返回音标、释义、造句、近义词，以便我全面理解这个词。

**验收标准：**
- 输入框支持输入英文单词
- 点击查询按钮后显示完整信息
- 加载状态提示
- 查询失败有错误提示

---

**US-002：保存生词**
> 作为学习者，我查阅完单词后可以保存到生词本，以便后续复习。

**验收标准：**
- 查询结果页有"保存到生词本"按钮
- 已保存的单词显示"已保存"状态
- 重复保存有提示

---

**US-003：查看生词本**
> 作为学习者，我可以看到所有保存的单词列表，包括单词、音标、简要释义、添加时间。

**验收标准：**
- 生词本按添加时间倒序排列
- 支持按单词搜索
- 显示单词总数
- 点击单词可查看详情

---

**US-004：手动选词生成内容**
> 作为学习者，我勾选若干单词，选择内容类型和长度，系统生成一篇包含这些词的文章。

**验收标准：**
- 生词列表支持多选
- 内容类型可选：新闻/故事
- 内容长度可选：短/中/长
- 点击生成后跳转到阅读页
- 生词在文章中加粗显示

---

**US-005：自动推荐选词**
> 作为学习者，我点击"推荐"按钮，系统自动选出最需要复习的 N 个单词。

**验收标准：**
- 点击推荐按钮后自动勾选推荐单词
- 推荐规则：最久未复习优先
- 显示推荐理由（如"5天未复习"）

---

**US-006：阅读生词加粗内容**
> 作为学习者，我阅读生成的文章，生词被加粗显示，便于在语境中记忆。

**验收标准：**
- 生词在文章中以粗体显示
- 阅读完成后可标记"已复习"
- 标记后更新单词的复习时间

---

### P1 - 第二优先级

**US-007：删除生词**
> 作为学习者，我可以删除已掌握或不需要的单词。

**US-008：重新生成内容**
> 作为学习者，我对生成的内容不满意时可以重新生成。

---

### P0 - V2.0 新增

**US-009：生成对话音频**
> 作为学习者，我在生词本选择 1-3 个单词，系统生成一段包含这些词的对话音频，通过听力加深记忆。

**验收标准：**
- 生词本页面新增「生成对话音频」入口（最多选 3 个单词）
- 「生成文章」入口保持不变
- 生成过程显示进度（对话生成 → 语音合成）
- 音频时长约 20 秒
- 字幕中目标单词高亮显示
- 支持在线播放

---

**US-010：收听对话音频**
> 作为学习者，我收听生成的对话音频，在真实对话场景中听单词的用法。

**验收标准：**
- 音频播放器支持播放/暂停/进度拖动
- 字幕实时滚动显示
- 目标单词以不同颜色显示
- 可重复播放

---

## 五、界面设计

### 5.1 设计原则
- **简洁现代** - 白色背景，卡片式布局
- **阅读友好** - 适合长时间阅读的字体和行距
- **操作简单** - 核心流程不超过 3 步

### 5.2 页面结构

```
/
├── 首页（查词）
│   ├── 搜索框
│   ├── 查词结果卡片
│   └── [保存到生词本] 按钮
│
├── /vocabulary
│   ├── 生词本列表
│   ├── 搜索/筛选
│   ├── 选词操作（手动勾选/自动推荐）
│   └── [生成内容] 按钮
│
└── /reading
    ├── 内容类型/长度选择
    ├── 生成的内容（生词加粗）
    └── [标记已复习] 按钮
```

### 5.3 界面草图

**首页 - 查词**
```
┌─────────────────────────────────────────────┐
│  📚 EasyWords                               │
├─────────────────────────────────────────────┤
│                                             │
│     ┌─────────────────────────────────┐     │
│     │  🔍 输入单词查询...              │     │
│     └─────────────────────────────────┘     │
│                                             │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐    │
│  │  determine  /dɪˈtɜːrmɪn/            │    │
│  │                                     │    │
│  │  v. 决定；确定；查明                │    │
│  │  to cause something to occur...     │    │
│  │                                     │    │
│  │  📝 造句 (5)                        │    │
│  │  • Several factors determine...     │    │
│  │                                     │    │
│  │  🔄 近义词                          │    │
│  │  • decide: 更强调做出选择...        │    │
│  │                                     │    │
│  │  [ 保存到生词本 ]                   │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

**生词本页**
```
┌─────────────────────────────────────────────┐
│  📚 生词本 (共 128 词)                       │
├─────────────────────────────────────────────┤
│  🔍 搜索...          [自动推荐 10 词]        │
├─────────────────────────────────────────────┤
│  ☑ determine   3天前添加    ⏰ 5天未复习    │
│  ☑ brilliant   1周前添加    ⏰ 7天未复习    │
│  ☐ courage     昨天                        │
│  ☑ eager       2天前添加    ⏰ 4天未复习    │
│  ☐ ...                                      │
├─────────────────────────────────────────────┤
│  已选 3 词                                  │
│  类型: [ 新闻 ▼ ]    长度: [ 短篇 ▼ ]       │
│              [ ✨ 生成内容 ]                 │
└─────────────────────────────────────────────┘
```

**阅读页**
```
┌─────────────────────────────────────────────┐
│  ← 返回生词本                               │
├─────────────────────────────────────────────┤
│                                             │
│  In the world of scientific research,       │
│  several factors **determine** the          │
│  success of a project. A **brilliant**      │
│  scientist must be **eager** to discover    │
│  new findings...                            │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│          [ ✅ 标记已复习 ]                   │
└─────────────────────────────────────────────┘
```

**对话音频页（V2.0 新增）**
```
┌─────────────────────────────────────────────┐
│  ← 返回生词本                               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  🎧 对话音频                         │    │
│  │                                     │    │
│  │  A: Have you **determined** where   │    │
│  │     to go this weekend?             │    │
│  │                                     │    │
│  │  B: Not yet. I'm still **eager**    │    │
│  │     to find a **brilliant** spot.   │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ▶ ━━━━━━━━━━━━━○━━━━━━━━━━ 0:12/0:20      │
│                                             │
├─────────────────────────────────────────────┤
│  单词：determine, eager, brilliant          │
└─────────────────────────────────────────────┘
```

**生词本页更新（新增入口）**
```
┌─────────────────────────────────────────────┐
│  📚 生词本 (共 128 词)                       │
├─────────────────────────────────────────────┤
│  🔍 搜索...                                 │
├─────────────────────────────────────────────┤
│  ☑ determine   3天前添加    ⏰ 5天未复习    │
│  ☑ brilliant   1周前添加    ⏰ 7天未复习    │
│  ☐ courage     昨天                        │
│  ☑ eager       2天前添加    ⏰ 4天未复习    │
│  ☐ ...                                      │
├─────────────────────────────────────────────┤
│  已选 3 词                                  │
│  ┌─────────────────────────────────────┐    │
│  │ ✨ 生成文章                          │    │
│  │ 类型: [ 新闻 ▼ ]  长度: [ 短篇 ▼ ]   │    │
│  │ [ 推荐 10 词 ]    [ 生成文章 ]       │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ 🎧 生成对话音频（最多 3 词）          │    │
│  │ 主题: [ 可选 ]    口音: [ 美式 ▼ ]   │    │
│  │ [ 推荐 3 词 ]    [ 生成对话音频 ]    │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

**对话音频页更新**
```
┌─────────────────────────────────────────────┐
│  ← 返回生词本                               │
├─────────────────────────────────────────────┤
│  对话音频                                   │
│  主题：周末计划    场景：办公室聊天          │
│  单词：determine, eager, brilliant          │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐    │
│  │  🅰️ A: Have you determined where     │    │
│  │      to go this weekend?             │    │
│  │                                     │    │
│  │  🅱️ B: Not yet. I'm still **eager**  │    │
│  │      to find a **brilliant** spot.  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  当前口音：🇺🇸 美式英语                      │
│  ━━━━━━━━━━━━━○━━━━━━━━━━ 第 2/4 句         │
│                                             │
│     [ ↻ 重播 ]    [ ▶ 播放 ]                │
├─────────────────────────────────────────────┤
│  长按/双击单词可查看释义                     │
└─────────────────────────────────────────────┘
```

---

## 六、技术方案

### 6.1 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 14+ | App Router |
| UI 组件 | Tailwind CSS + shadcn/ui | 简洁现代风格 |
| 状态管理 | React Context / Zustand | MVP 够用 |
| 数据存储 | LocalStorage / IndexedDB | 本地存储 |
| LLM 调用 | 用户提供的 API Key | 支持多种模型 |

### 6.2 数据模型

```typescript
// 单词
interface Word {
  id: string
  word: string
  phonetic: {
    us: string
    uk: string
  }
  chineseDefinition: string
  englishDefinition: string
  sentences: Sentence[]
  synonyms: Synonym[]
  createdAt: Date
  lastReviewedAt: Date | null
}

interface Sentence {
  en: string
  zh: string
}

interface Synonym {
  word: string
  difference: string
  example: string
}

// 生成的文章
interface Article {
  id: string
  content: string
  wordIds: string[]
  type: 'news' | 'story'
  length: 'short' | 'medium' | 'long'
  createdAt: Date
}

// 对话音频（V2.0 新增）
interface Dialogue {
  id: string
  wordIds: string[]
  words: string[]      // 单词文本列表
  scene: string        // 场景描述
  topic?: string       // 用户自定义主题
  dialogue: DialogueLine[]
  createdAt: Date
}

interface DialogueLine {
  speaker: 'A' | 'B'
  text: string         // 包含 **word** 格式的生词标记
}
```

### 6.3 对话音频技术架构（V2.0 新增）

```
┌─────────────────────────────────────────────────────────┐
│              生词本页面选择单词                          │
└─────────────────────────────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
    ┌───────────────┐           ┌───────────────┐
    │   生成文章    │           │ 生成对话音频  │
    └───────────────┘           └───────────────┘
            │                           │
            ▼                           ▼
    ┌───────────────┐           ┌───────────────┐
    │ AI 生成文章   │           │ Step 1: AI    │
    │ (现有功能)    │           │ 生成对话内容  │
    └───────────────┘           │ 2-3 秒        │
                                └───────────────┘
                                        │
                                        ▼
                                ┌───────────────┐
                                │ Step 2: 返回  │
                                │ 对话数据      │
                                │ (JSON格式)    │
                                └───────────────┘
                                        │
                                        ▼
                                ┌───────────────┐
                                │ Step 3: 前端  │
                                │ Web Speech API│
                                │ 实时语音合成  │
                                └───────────────┘
```

**技术亮点：**
- 使用浏览器原生 Web Speech API，无需服务端 TTS
- 支持多种英语口音（美式/英式/印度/澳洲）
- 自动分配男声(A)、女声(B)
- 对话数据存储到数据库，可重复播放

---

## 七、非功能需求

| 类型 | 要求 |
|------|------|
| 性能 | 页面加载 < 2s，AI 查词响应 < 5s |
| 兼容性 | 支持 Chrome、Edge、Safari 最新版 |
| 可用性 | 界面简洁，核心操作不超过 3 步 |
| 扩展性 | 预留 API Key 配置，支持切换不同模型 |

---

## 八、MVP 里程碑

| 阶段 | 内容 | 预计时间 |
|------|------|----------|
| Phase 1 | 项目搭建 + 查词功能 | 1 周 |
| Phase 2 | 生词本管理 + 选词推荐 | 1 周 |
| Phase 3 | 内容生成 + 阅读页 | 1 周 |
| Phase 4 | 测试 + 优化 | 0.5 周 |

---

## 九、待讨论事项

- [ ] API Key 存储方式（本地存储 vs 用户输入）
- [ ] 支持哪些 LLM（OpenAI / Claude / 其他）
- [ ] 是否需要用户账号系统
- [ ] 是否需要云端同步生词本

---

## 十、版本规划

### V1.0 (MVP) ✅ 已完成
- 查词 + 生词本 + 内容生成 + 阅读

### V1.1
- 悬停显示释义
- 点击播放发音
- 学习统计（已学词数、复习次数）

### V2.0 ✅ 已完成
- **对话音频生成**（新增核心功能）
  - 生词本选择 1-3 个单词
  - AI 生成对话内容（4-6 轮对话）
  - Web Speech API 实时语音合成
  - 四种口音选择（美式/英式/印度/澳洲）
  - 音频播放 + 字幕显示 + 生词高亮
  - 对话记录保存与回放
- **移动端查词优化**
  - 长按单词查看释义（移动端）
  - 双击单词查看释义（PC端）
  - 快速查词 API
- **界面优化**
  - 导航标题更新（生词阅读、生词会话）
  - 推荐功能移入生成表单内

### V2.1（未来规划）
- 浏览器插件（自动抓取查词）
- 云端同步
- 社交功能（分享文章/视频）

### V3.0 AI 口语陪练（SpeakV2 整合）

> 状态：需求已确认
> 更新日期：2026-03-18
> 来源：SpeakV2 模块整合

#### 产品定位

**核心价值**：让 AI 成为用户的英语语伴，在口语对话中多频次使用生词本中的单词，加深记忆。

**与生词本的关联**：
- 用户可从生词本选择单词带入对话场景
- AI 在对话中自然使用这些生词
- 每次对话都是一次生词复习

#### 功能架构

```
EasyWords V3.0
├── 模块一：查词与生词本（已有）
│
├── 模块二：选词与推荐（已有）
│
├── 模块三：内容生成与阅读（已有）
│
├── 模块四：对话音频生成（V2.0 已有）
│
└── 模块五：AI 口语陪练（V3.0 新增）  ← SpeakV2 整合
    ├── 场景选择（餐厅点餐、问路、面试、购物、闲聊）
    ├── 难度选择（初级/中级/高级）
    ├── 按住说话模式
    ├── 自由对话模式
    ├── 生词带入对话
    ├── 对话记录
    └── 学习反馈（语法纠错、表达建议）
```

#### 功能清单

| 编号 | 功能模块 | 功能点 | 描述 | 优先级 |
|------|----------|--------|------|--------|
| F-501 | 场景选择 | 选择难度等级 | 初级/中级/高级 | P0 |
| F-502 | 场景选择 | 选择对话场景 | 点餐、问路、面试、购物、闲聊 | P0 |
| F-503 | 语音交互 | 按住说话模式 | 按住按钮说话，松开后自动发送 | P0 |
| F-504 | 语音交互 | AI 语音回复 | AI 以语音形式回复，响应时间 < 1.5s | P0 |
| F-505 | 语音交互 | 自由对话模式 | 开启后像打电话一样与 AI 对话 | P0 |
| F-505a | 语音交互 | 自由对话超时保护 | 5秒无说话提示，3秒倒计时后自动发送，避免占用资源 | P0 |
| F-506 | 对话过程 | 多轮对话 | 持续与 AI 进行多轮对话 | P0 |
| F-507 | 对话过程 | 对话记录 | 显示对话的文字记录 | P0 |
| F-508 | 学习反馈 | 语法纠错 | 对话结束后展示语法错误 | P0 |
| F-509 | 学习反馈 | 表达建议 | 提供更好的表达方式建议 | P0 |
| F-510 | 对话管理 | 重新开始对话 | 随时重置当前对话 | P1 |
| F-511 | 对话管理 | 切换场景 | 在不同场景之间切换 | P1 |
| F-512 | 生词关联 | 选择生词带入对话 | 从生词本选择单词，AI 在对话中使用 | P1 |
| F-513 | 学习记录 | 历史记录 | 查看过往练习记录 | P1 |

#### 交互模式

**模式一：按住说话**
- 用户长按按钮录音，松开自动发送
- 显示录音状态和时长
- 支持最长 60 秒单条语音
- 支持上滑取消发送

**模式二：自由对话**
- 点击开启后持续监听麦克风
- VAD 自动检测用户说话状态
- 静音 1.5 秒后自动发送
- AI 回复完成后自动恢复监听
- **超时保护机制**：
  - 如果用户 5 秒内没有开始说话，显示提示「3秒后将自动发送当前语音」
  - 倒计时 3 秒后自动发送已识别的内容（如果有）
  - 如果没有任何识别内容，自动结束本次录音，等待用户再次说话
  - 目的：避免长时间占用语音识别资源，节省系统开销

#### 对话场景设计

| 场景 | 难度适配 | 场景描述 | 学习目标 |
|------|----------|----------|----------|
| **餐厅点餐** | 初/中/高 | 在餐厅与服务员对话 | 餐饮词汇、礼貌请求、数量表达 |
| **问路导航** | 初/中/高 | 向路人询问如何到达目的地 | 方向词汇、位置描述、理解指示 |
| **求职面试** | 中/高 | 模拟英文面试场景 | 自我介绍、职业表达、应对问题 |
| **商场购物** | 初/中/高 | 在商店与店员交流购买商品 | 价格询问、尺寸颜色、讨价还价 |
| **日常闲聊** | 初/中/高 | 与朋友进行日常对话 | 话题展开、情感表达、地道表达 |

#### 生词关联机制

```
用户从生词本选择单词
        │
        ▼
  选择对话场景/难度
        │
        ▼
  AI 生成开场白（自然融入生词）
        │
        ▼
  对话过程中 AI 持续使用这些生词
        │
        ▼
  对话结束后标记生词已复习
```

#### 技术方案

| 环节 | 技术方案 | 成本 | 说明 |
|------|----------|------|------|
| **语音识别(ASR)** | Web Speech API | 免费 | Chrome/Edge 支持好，即时响应 |
| **对话生成(LLM)** | GLM-4-FLASH | 极低 | ¥0.0001/千tokens |
| **语音合成(TTS)** | Web Speech API（主） | 免费 | 即时播放，无延迟 |
| **语音合成(TTS)** | Edge TTS（备选） | 免费 | 质量更好但有延迟 |

#### TTS 方案说明

**主方案：Web Speech API（浏览器原生）**
- 优点：即时播放，无延迟，免费
- 缺点：音质一般，依赖浏览器支持
- 适用：口语对话场景（响应速度优先）

**备选方案：Edge TTS（服务端）**
- 优点：音质更好，多音色
- 缺点：生成需要 ~10 秒延迟
- 适用：非实时场景（音质优先）

#### AI 回复规则

| 难度 | 句子数 | 语言特点 | 生词要求 |
|------|--------|----------|----------|
| **初级** | 1-2 句 | 简单词汇，短句 | 每次回复包含 1-2 个生词 |
| **中级** | 2-3 句 | 中等词汇，自然表达 | 每次回复包含 1-2 个生词 |
| **高级** | 1-5 句 | 高级词汇，复杂句式 | 每次回复包含 1-2 个生词 |

**开场白规则：**
- 初级：1 句简短开场白
- 中级/高级：1-2 句开场白
- 如有生词，开场白中自然融入 1-2 个生词

#### 成本估算（MVP 阶段）

| 服务 | 月调用量 | 月成本 |
|------|----------|--------|
| ASR（Web Speech API） | 无限制 | **免费** |
| LLM (GLM-4-FLASH) | ~500 万 tokens | ~¥1（新用户免费额度够用） |
| TTS (Web Speech API) | 无限制 | **免费** |
| **合计** | - | **~¥0-1/月** |

#### 用户故事

**US-011：选择场景开始对话**
> 作为学习者，我选择对话场景和难度，开始与 AI 进行口语练习。

**验收标准：**
- 显示至少 5 个可选场景
- 每个场景显示简要说明和学习目标
- 支持 3 个难度等级选择
- 选择后可直接进入对话

**US-012：按住说话进行对话**
> 作为学习者，我按住按钮说话，松开后 AI 用语音回复，模拟真实对话。

**验收标准：**
- 按住时显示录音状态和时长
- 松开后 AI 立即显示文字回复
- AI 语音即时播放（使用 Web Speech API，无延迟）
- AI 回复时显示正在播放语音的状态
- 回复符合难度规则（初级 1-2 句，中级 2-3 句，高级 1-5 句）
- 如有生词，回复中包含 1-2 个生词

**US-013：自由对话模式**
> 作为学习者，我开启自由对话模式，像打电话一样与 AI 对话。

**验收标准：**
- 点击开启后持续监听
- VAD 自动检测说话状态
- 静音 1.5 秒后自动发送
- 点击关闭退出模式

**US-014：生词带入对话**
> 作为学习者，我从生词本选择单词带入对话，AI 在对话中使用这些词。

**验收标准：**
- 可选择 1-5 个生词
- AI 在对话中自然融入这些生词
- 对话结束后更新生词复习时间

**US-015：查看学习反馈**
> 作为学习者，我在对话结束后看到语法纠错和更好的表达建议。

**验收标准：**
- 对话结束时自动生成反馈
- 标注语法错误（高亮显示）
- 提供正确的表达方式
- 提供更地道的表达建议

#### 待后续版本优化

| 功能 | 描述 | 优先级 |
|------|------|--------|
| F-514 | 自由对话中的打断能力 | P2 |
| F-515 | 学习激励（打卡/进度） | P2 |
| F-516 | 社交功能（排行榜） | P3 |

---

## 十一、更新日志

### 2026-03-18 V3.0 更新

**1. TTS 方案优化**
- 主方案改为 Web Speech API（即时播放，无延迟）
- Edge TTS 作为备选方案（音质更好但有 ~10 秒延迟）
- 删除付费 ASR 降级方案，成本降至 ¥0-1/月

**2. AI 回复规则细化**
- 初级：1-2 句，简单词汇短句
- 中级：2-3 句，中等词汇自然表达
- 高级：1-5 句，高级词汇复杂句式
- 所有级别：每次回复必须包含 1-2 个生词

**3. 生词高亮修复**
- 前端渲染时验证 `**word**` 是否在生词列表中
- 只有真正的生词才高亮显示
- LLM 错误标记的非生词移除星号但不高亮

**4. 开场白规则**
- 如有生词，开场白中自然融入 1-2 个生词
- 初级：1 句简短开场白
- 中级/高级：1-2 句开场白

**5. Prompt 优化**
- 文章生成和对话生成都强调「只有给定单词列表中的单词才需要标记」
- 增加前端渲染验证规则的文档说明

### 2026-03-19 V3.0 优化更新

**1. TTS 优化**
- AI 语音播放时自动过滤 emoji 和特殊符号，只读纯英文文本
- LLM prompt 中明确要求「不使用任何 emoji、图标或特殊符号」

**2. 生词使用规则优化**
- 原规则：每次回复必须使用 1-2 个生词（过于生硬）
- 新规则：AI 在 2-3 轮对话内至少使用 1 个生词，更自然地融入对话

**3. 语音识别优化（按住说话）**
- 改为连续识别模式（continuous: true），用户可持续说话
- 最高支持 60 秒录音时长
- 松开按钮后等待识别完全结束再发送，避免最后内容丢失
- 累积所有识别结果（最终结果 + 临时结果），确保完整

**4. 对话音频预生成优化**
- 播放当前句时同时预加载下一句音频
- 句与句之间几乎无等待，播放更流畅
- 使用 preloadingRef 管理预加载状态

**5. 口语陪练界面优化**
- 「开始练习」和「查看练习记录」按钮并排显示
- 移除步骤指示器（选择场景与难度 → 开始练习）
- 开始练习按钮移除箭头图标
- 练习提示简化：「AI 会在对话中带入生词」

**6. AI 对话引导优化**
- AI 在对话中主动引导用户多说话
- 每次回复必须以开放式问题结尾
- 鼓励用户分享观点、经历、偏好等
- 正向反馈机制：反馈报告中新增「goodExpressions」字段，对说得好的句子给予鼓励

---

## 十二、AI 提示词设计规范

> 本节记录口语陪练模块的提示词设计原则和具体配置
> 更新日期：2026-03-19

### 12.1 对话引导原则

**核心目标**：让用户在对话中多说，AI 作为引导者而非主导者。

**设计理念**：
1. **开放式问题**：AI 每次回复必须以开放式问题结尾，引导用户继续表达
2. **话题延伸**：询问用户的观点、经历、偏好，而非仅进行信息交换
3. **自然互动**：适度分享相关经历建立 rapport，然后询问用户的经历
4. **正向鼓励**：对用户的回应表示兴趣，避免让用户感到被"考试"

### 12.2 难度级别配置

| 难度 | 回复长度 | 语言特点 | 示例开场白 |
|------|----------|----------|------------|
| **初级** | 1-2 句 | 简单词汇，短句 | "Hello! Welcome to our restaurant. I'm here to help you today. First, tell me, what kind of food do you usually like to eat?" |
| **中级** | 2-3 句 | 中等词汇，自然表达 | "Good evening! Welcome. Before I show you the menu, I'd love to know - what brings you here tonight? Are you celebrating something special?" |
| **高级** | 1-5 句 | 高级词汇，复杂句式 | "Good evening, and welcome. I notice you seem like someone who appreciates good food. What's the most memorable meal you've ever had?" |

### 12.3 对话场景提示词

#### 餐厅点餐 (restaurant)

**初级提示词**：
> You are a friendly waiter at a casual restaurant. Your goal is to help the customer practice English speaking. Use simple sentences and speak slowly. Always ask open-ended follow-up questions to encourage the customer to speak more. For example, ask about their preferences, what they like to eat, or if they have any food allergies. Be patient and encouraging.

**中级提示词**：
> You are a professional waiter at a nice restaurant. Your goal is to help the customer practice English through natural conversation. Engage them with questions about their dining preferences, past restaurant experiences, or favorite cuisines. Ask follow-up questions to keep them talking. Make the conversation feel natural and enjoyable.

**高级提示词**：
> You are an experienced sommelier and waiter at an upscale restaurant. Help the customer practice sophisticated English. Discuss food pairings, cooking techniques, and wine selections. Ask thought-provoking questions about their culinary experiences and preferences. Encourage detailed responses.

#### 问路导航 (directions)

**初级提示词**：
> You are a friendly local helping a tourist find their way. Your goal is to help them practice English. After giving simple directions, ask follow-up questions to encourage more conversation. Ask where they are from, what they plan to do there, or if they need help with anything else.

**中级提示词**：
> You are a helpful local giving directions. Practice natural English conversation by asking about their trip - where are they from, how long are they visiting, what places have they already seen. Provide directions while keeping the conversation going.

**高级提示词**：
> You are a local expert who knows the area well. Engage in deeper conversation about the place they want to visit. Ask about their interest in that location, recommend local spots, and share interesting facts. Encourage them to share their travel experiences.

#### 求职面试 (interview)

**中级提示词**：
> You are a professional HR interviewer. Help the candidate practice interview English. Ask one question at a time, then follow up on their answers to encourage more detailed responses. Ask about their experiences, skills, and why they want the job. Be encouraging and give them time to express themselves.

**高级提示词**：
> You are a senior hiring manager. Conduct a realistic interview to help them practice professional English. After each answer, dig deeper with follow-up questions. Ask behavioral questions like "Tell me about a time when..." and probe for specific details. Help them practice articulating complex ideas clearly.

#### 商场购物 (shopping)

**初级提示词**：
> You are a friendly shop assistant. Help customers practice English shopping vocabulary. Ask questions about what they are looking for, their preferences, and what occasion they are shopping for. Encourage them to describe what they want in detail.

**中级提示词**：
> You are a helpful sales associate at a clothing store. Engage customers in natural conversation about their style preferences, favorite brands, or shopping habits. Ask follow-up questions to keep the conversation flowing while helping them find what they need.

**高级提示词**：
> You are a personal shopper at a high-end boutique. Have sophisticated conversations about fashion, style, and personal image. Ask about their lifestyle, fashion inspirations, and preferences. Encourage them to express their personal style in detail.

#### 日常闲聊 (casual)

**初级提示词**：
> You are a friendly person having a casual chat. Your main goal is to help them practice everyday English. After they respond, always ask a follow-up question about their life, hobbies, family, or weekend plans. Keep the conversation light and fun while encouraging them to speak more.

**中级提示词**：
> You are a friend having a relaxed conversation. Actively engage them in topics like hobbies, movies, books, travel, or weekend plans. Share your own experiences briefly, then ask about theirs. Use natural expressions and encourage detailed responses.

**高级提示词**：
> You are an interesting conversationalist. Have deep, meaningful conversations about topics like travel experiences, cultural differences, current events, or personal growth. Ask thought-provoking questions that encourage them to express opinions and share detailed stories.

### 12.4 通用对话引导规则

以下规则会自动添加到所有场景的提示词中：

```
【重要规则】
- Your response MUST be exactly {1-2/2-3/1-5} sentences. Do not exceed this limit.
- {Use simple vocabulary/Use moderate vocabulary/Use sophisticated vocabulary}.
- Do NOT use any emojis, icons, or special symbols. Only use plain English text.

【引导对话规则】
- ALWAYS end your response with an open-ended follow-up question to encourage the learner to speak more.
- Ask about their opinions, experiences, preferences, or details related to the topic.
- If they give a short answer, gently encourage elaboration (e.g., "That's interesting! Can you tell me more about that?").
- Keep the conversation flowing naturally by showing genuine interest in what they say.
- Occasionally share brief relevant experiences to build rapport, then ask about theirs.

【生词使用】(如有关联生词)
- VOCABULARY WORDS TO USE: {word1, word2, ...}
- You MUST use at least 1 of these vocabulary words within every 2-3 turns of conversation.
- Try to use 1 vocabulary word in your current response if you haven't used one recently.
- Use the words naturally in context, do not force them awkwardly.
```

### 12.5 学习反馈提示词

**反馈类型**：
1. **grammarErrors**：语法错误（最多 3 个）
2. **betterExpressions**：更好的表达建议（最多 2 个）
3. **goodExpressions**：说得好的句子（正向鼓励，所有说得好的句子都要列出）

**提示词规范**：
```
你是一位专业的英语口语教练。请分析以下用户的英语口语表达，给出学习反馈。

用户说的话：
{用户所有发言}

请返回 JSON 格式的反馈：
{
  "grammarErrors": [
    {
      "userSentence": "用户的原句（英文）",
      "correctedSentence": "正确的句子（英文）",
      "errorType": "错误类型（中文，如：时态错误、冠词缺失等）",
      "explanation": "中文解释错误原因和改正方法"
    }
  ],
  "betterExpressions": [
    {
      "userSentence": "用户的原句（英文）",
      "suggestedExpression": "更好的表达方式（英文）",
      "reason": "用中文说明为什么这个表达更地道、更自然"
    }
  ],
  "goodExpressions": [
    {
      "userSentence": "用户的原句（英文）",
      "praise": "用中文说明为什么这句话说得好，鼓励用户（如：用词准确、句式地道、表达自然等）"
    }
  ]
}

【重要规则】
- 每个用户句子都必须出现在 goodExpressions、grammarErrors 或 betterExpressions 中至少一个
- 对于没有语法错误且表达自然的句子，必须放入 goodExpressions 给予正向鼓励
- praise 字段用中文写，具体说明优点
```

### 12.6 开场白生成提示词

当用户选择生词带入对话时，系统会生成融入生词的开场白：

```
{场景系统提示词}

Generate an opening line that naturally includes 1-2 of these words: {word1, word2, ...}
Requirements:
- Keep it to {1 short sentence / 1-2 sentences} (根据难度)
- Make it natural and friendly
- Do not emphasize the words awkwardly
- Do NOT use any emojis, icons, or special symbols. Only use plain English text.
- Output ONLY the opening line, nothing else
```

### 12.7 对话回复提示词完整示例

以「餐厅点餐 + 中级难度 + 生词: determine, brilliant」为例，最终发送给 LLM 的完整提示词：

```
You are a professional waiter at a nice restaurant. Your goal is to help the customer practice English through natural conversation. Engage them with questions about their dining preferences, past restaurant experiences, or favorite cuisines. Ask follow-up questions to keep them talking. Make the conversation feel natural and enjoyable.

【重要规则】
- Your response MUST be exactly 2-3 sentences. Do not exceed this limit.
- Use moderate vocabulary and natural expressions.
- Do NOT use any emojis, icons, or special symbols. Only use plain English text.

【引导对话规则】
- ALWAYS end your response with an open-ended follow-up question to encourage the learner to speak more.
- Ask about their opinions, experiences, preferences, or details related to the topic.
- If they give a short answer, gently encourage elaboration (e.g., "That's interesting! Can you tell me more about that?").
- Keep the conversation flowing naturally by showing genuine interest in what they say.
- Occasionally share brief relevant experiences to build rapport, then ask about theirs.

【生词使用】
- VOCABULARY WORDS TO USE: determine, brilliant
- You MUST use at least 1 of these vocabulary words within every 2-3 turns of conversation.
- Try to use 1 vocabulary word in your current response if you haven't used one recently.
- Use the words naturally in context, do not force them awkwardly.
```

### 12.9 实现代码位置

| 功能 | 文件路径 |
|------|----------|
| 对话生成逻辑 | `server/src/lib/speak-llm.ts` |
| 场景配置数据 | `server/src/app/api/speak/scenarios/route.ts` |
| 开场白生成 | `server/src/app/api/speak/conversations/route.ts` |

### 12.10 提示词迭代记录

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-18 | v1.0 | 初始版本，基础对话功能 |
| 2026-03-19 | v1.1 | 新增「引导对话规则」，要求 AI 每次回复以开放式问题结尾 |
| 2026-03-19 | v1.2 | 新增「goodExpressions」正向反馈字段 |
| 2026-03-19 | v1.3 | 优化所有场景的开场白，改为开放式问题形式 |
| 2026-03-19 | v1.4 | 生词使用规则优化：从「每次必须使用」改为「2-3轮内至少使用1个」 |
