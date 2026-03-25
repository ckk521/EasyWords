# EasySpeak 技术方案文档

> AI 英语口语陪练应用 - 技术架构设计
> 文档版本：v1.2
> 更新日期：2026-03-17

---

## 一、技术选型

### 1.1 前端技术栈

| 模块 | 技术选型 | 选型理由 |
|------|----------|----------|
| **框架** | React 18 + TypeScript | 生态成熟，Figma 代码导出支持 |
| **状态管理** | Zustand / Jotai | 轻量级，支持 Hooks |
| **UI 组件库** | Ant Design / Tailwind CSS | Figma 设计稿对接友好 |
| **构建工具** | Vite / Next.js | 开发体验好，HMR 快 |
| **语音录制** | Web Audio API + MediaRecorder | 原生支持，无需依赖 |
| **音频播放** | Howler.js / HTML5 Audio | 支持 WebSocket 流式播放 |
| **实时通信** | Socket.IO Client | 自动重连、心跳检测、房间管理 |
| **小程序** | Taro (React 语法) | 一套代码多端运行，兼容 React |

### 1.1.1 Figma 设计稿对接流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Figma → React 代码流程                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                 │
│   │   Figma     │     │   导出工具   │     │  React 代码 │                 │
│   │   设计稿    │ ──▶ │ (插件/平台)  │ ──▶ │   生成      │                 │
│   └─────────────┘     └─────────────┘     └─────────────┘                 │
│                                                                             │
│   推荐工具：                                                                │
│   • Figma to Code 插件 - 直接导出 React + Tailwind 代码                    │
│   • Locofy.ai - AI 增强的代码生成，支持组件化                               │
│   • Anima - 支持响应式设计和交互                                            │
│   • Builder.io - 设计到代码的自动化平台                                     │
│                                                                             │
│   代码规范：                                                                │
│   ├── components/           # Figma 导出的 UI 组件                         │
│   │   ├── Button/                                                   │
│   │   ├── Input/                                                    │
│   │   └── ...                                                       │
│   ├── hooks/                # 自定义 Hooks（业务逻辑）                     │
│   │   ├── useAudioRecorder.ts  # 录音 Hook                              │
│   │   ├── useAudioPlayer.ts    # 播放 Hook                              │
│   │   ├── useWebSocket.ts      # WebSocket Hook                         │
│   │   └── useVAD.ts            # VAD 检测 Hook                          │
│   ├── services/             # API 服务层                                  │
│   ├── store/                # 状态管理 (Zustand)                          │
│   └── pages/                # 页面组件                                    │
│                                                                             │
│   注意事项：                                                                │
│   1. Figma 导出的代码需要二次封装，提取可复用组件                           │
│   2. 业务逻辑（录音、WebSocket）需要在 Hooks 中实现                         │
│   3. 导出的样式通常是 Tailwind，需要与项目规范统一                          │
│   4. 交互逻辑需要手动绑定事件处理                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 后端技术栈

| 模块 | 技术选型 | 选型理由 |
|------|----------|----------|
| **语言** | Node.js (TypeScript) | 高并发 I/O 性能，适合实时通信，与前端技术栈统一 |
| **框架** | Express | 轻量级、成熟稳定、中间件丰富 |
| **实时通信** | ws (原生 WebSocket) | 轻量级、高性能、无额外抽象开销 |
| **消息队列** | Redis Streams / RabbitMQ | 异步处理，削峰填谷 |
| **缓存** | Redis / Upstash Redis | 会话管理、热点数据缓存 |
| **关系数据库** | **Turso** (SQLite 边缘数据库) | 边缘部署低延迟、成本低、免费额度大、存储所有数据 |

**后端项目结构：**
```
server/
├── src/
│   ├── config/           # 配置文件
│   │   └── models.config.ts    # AI 模型白名单配置
│   ├── adapters/         # AI 服务适配器
│   │   ├── base.adapter.ts     # 适配器基类
│   │   ├── llm.adapter.ts      # LLM 适配器
│   │   ├── asr.adapter.ts      # ASR 适配器
│   │   └── tts.adapter.ts      # TTS 适配器
│   ├── services/         # 业务服务
│   │   ├── ai-gateway.service.ts    # AI 服务网关
│   │   ├── conversation.service.ts  # 对话管理服务
│   │   └── websocket.service.ts     # WebSocket 实时通信
│   ├── routes/           # API 路由
│   │   └── api.routes.ts
│   ├── types/            # 类型定义
│   │   └── index.ts
│   └── index.ts          # 入口文件
├── package.json
├── tsconfig.json
└── .env.example
```

### 1.2.1 Turso 数据库说明

[Turso](https://turso.tech/) 是基于 SQLite 的边缘数据库服务，**本项目统一使用 Turso 存储所有数据**。

| 优势 | 说明 |
|------|------|
| **边缘部署** | 数据库节点靠近用户，延迟 < 10ms |
| **成本低** | 免费额度大，适合初创项目 |
| **SQLite 兼容** | 标准 SQL，迁移成本低 |
| **支持 JSON** | 对话记录可用 JSON 字段存储，灵活方便 |
| **嵌入式** | 可嵌入边缘函数，无网络开销 |
| **多语言 SDK** | 支持 TypeScript、Go、Python 等 |

```typescript
// Turso 连接示例（TypeScript）

import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// 查询示例
const users = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
```

**Turso 适合本项目的原因：**
1. 统一数据存储，架构简单
2. SQLite 支持 JSON 字段，对话记录存储灵活
3. 边缘部署降低 API 延迟
4. 免费额度：3 个数据库、9GB 存储、10 亿行读取/月
5. 可与其他项目共用，统一管理

**存储策略：**
| 数据类型 | 存储方式 |
|----------|----------|
| 用户信息、订阅、限额 | 结构化字段 |
| 场景配置 | 结构化字段 + JSON |
| 对话记录 | JSON 字段存储完整对话 |
| 反馈报告 | JSON 字段 |
| 音频文件 | **不存储**（实时处理） |

### 1.3 AI 服务选型

**设计原则：** 模型解耦设计，支持热插拔和降级策略。

| 服务 | 主选 | 备选 | 特点 |
|------|------|------|------|
| **ASR 语音识别** | 通义听悟（阿里云） | Mock 模式 | 实时语音转文字，中英文识别准确 |
| **LLM 对话** | **GLM-4-FLASH**（智谱 AI） | 通义千问、DeepSeek | 响应速度极快，适合实时对话 |
| **TTS 语音合成** | Edge TTS | Mock 模式 | 完全免费，质量优秀 |
| **VAD 检测** | WebRTC VAD (前端) | - | 前端实时检测，延迟 < 50ms |

**为什么选择 GLM-4-FLASH：**
- ⚡ **响应速度极快** - 首字延迟 < 100ms，适合实时口语对话
- 💰 **成本极低** - ¥0.0001/千tokens，新用户赠送 1000 万 tokens
- 🔌 **OpenAI 兼容 API** - 接入简单，迁移成本低

#### 1.3.1 通义听悟 (ASR)

**产品特点：**
- 阿里达摩院语音技术，识别准确率高
- 支持中英文混合、实时流式识别
- 支持多种音频格式：PCM、WAV、Opus 等
- API 兼容性好，接入简单

**接入方式：**
```typescript
// 通义听悟 API 调用
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr',
});

// 实时语音识别
const response = await client.audio.transcriptions.create({
  file: audioFile,
  model: 'paraformer-realtime-v2',  // 实时版模型
  language: 'en',  // 英文
});
```

**价格：**
- 免费额度：前 3 个月免费
- 付费：¥0.006/15秒（比阿里云语音更便宜）

#### 1.3.2 GLM-4-FLASH (LLM)

**模型特点：**
| 特性 | 说明 |
|------|------|
| **响应速度** | 极快，首字延迟 < 100ms |
| **上下文长度** | 128K tokens |
| **对话质量** | 中文理解优秀，英文对话流畅 |
| **流式输出** | 支持 SSE 流式返回 |

**为什么选择 GLM-4-FLASH：**
1. **响应速度快** - 适合实时口语对话场景，用户等待时间短
2. **免费额度大** - 新用户赠送大量 tokens
3. **价格极低** - 比其他模型便宜很多
4. **OpenAI 兼容 API** - 接入简单，迁移成本低

**价格：**
| 项目 | 价格 |
|------|------|
| 输入 | ¥0.0001/千tokens |
| 输出 | ¥0.0001/千tokens |
| **免费额度** | 新用户赠送 1000 万 tokens |

**接入方式：**
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.ZHIPU_API_KEY,
  baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
});

// 流式对话
const stream = await client.chat.completions.create({
  model: 'glm-4-flash',
  messages: [...],
  stream: true,
});
```

**免费额度：** 新用户赠送 1000 万 tokens，足够 MVP 阶段使用

#### 1.3.3 Edge TTS (语音合成)

**选用 Edge TTS 的原因：**
- ✅ **完全免费** - 无使用限制，无费用
- ✅ **质量优秀** - 微软神经网络语音，自然流畅
- ✅ **多语言支持** - 支持中英文等多种语言
- ✅ **多种音色** - 丰富的男声/女声选择

**英文音色推荐：**
| 音色 | 特点 |
|------|------|
| en-US-JennyNeural | 女声，自然亲切 |
| en-US-GuyNeural | 男声，沉稳专业 |
| en-GB-SoniaNeural | 英式女声，优雅 |
| en-AU-NatashaNeural | 澳式女声，活泼 |

**接入方式：**
```typescript
// edge-tts Node.js 库
import { Synthesize } from 'edge-tts';

// 合成语音
const synthesis = new Synthesize({
  voice: 'en-US-JennyNeural',
  text: 'Hello, how can I help you today?',
});

const audioBuffer = await synthesis.toStream();
```

**价格：** 完全免费 ✅

#### 1.3.4 服务账号管理

| 服务 | 平台 | API Key |
|------|------|---------|
| ASR 语音识别 | 阿里云 DashScope | `DASHSCOPE_API_KEY` |
| LLM 对话 | 智谱 AI | `ZHIPU_API_KEY` |
| TTS 语音合成 | Edge TTS | 无需 API Key ✅ |

#### 1.3.5 成本估算

**MVP 阶段（1000 DAU，每人每天 5 次对话）：**

| 服务 | 月调用量 | 月成本 |
|------|----------|--------|
| 通义听悟 (ASR) | ~150,000 次 × 15秒 | ¥40-60 |
| GLM-4-FLASH (LLM) | ~500 万 tokens | **¥1** |
| Edge TTS | ~50 万字符 | **免费** ✅ |
| **合计** | - | **¥40-60/月** |

**免费额度覆盖期：**
- ASR：前 3 个月免费
- LLM：新用户赠送 1000 万 tokens（够用 2 个月）
- TTS：完全免费

---

### 1.4 模型解耦设计

#### 1.4.1 设计原则

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           模型解耦架构设计                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  核心目标：                                                                  │
│  ├── 统一接口：所有 AI 服务通过统一接口调用                                  │
│  ├── 热插拔：支持运行时切换模型，无需改代码                                  │
│  ├── 白名单控制：限制可用的模型范围                                          │
│  └── 降级策略：主模型不可用时自动切换备用模型                                │
│                                                                             │
│  架构图：                                                                    │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     AI Gateway (统一网关)                           │   │
│   │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │   │
│   │   │ 模型路由  │ │ 白名单校验│ │ 配置管理  │ │ 熔断降级  │              │   │
│   │   └──────────┘ └──────────┘ └──────────┘ └──────────┘              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                    ┌───────────────┼───────────────┐                       │
│                    ▼               ▼               ▼                       │
│   ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐   │
│   │     ASR Adapter     │ │     LLM Adapter     │ │     TTS Adapter     │   │
│   │  ┌───────────────┐  │ │  ┌───────────────┐  │ │  ┌───────────────┐  │   │
│   │  │ 通义听悟      │  │ │  │ GLM-4-FLASH   │  │ │  │ Edge TTS      │  │   │
│   │  │ 阿里云 ASR    │  │ │  │ 通义千问      │  │ │  │ 阿里云 TTS    │  │   │
│   │  │ ...           │  │ │  │ DeepSeek      │  │ │  │ Azure TTS     │  │   │
│   │  └───────────────┘  │ │  └───────────────┘  │ │  └───────────────┘  │   │
│   └─────────────────────┘ └─────────────────────┘ └─────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 1.4.2 模型白名单配置

```typescript
// config/ai-models.config.ts

export const AIModelConfig = {
  // ASR 语音识别 - 允许的模型
  asr: {
    allowed: [
      'aliyun-dashscope',     // 通义听悟
      'google-speech',        // Google Speech (备用)
    ],
    default: 'aliyun-dashscope',
    providers: {
      'aliyun-dashscope': {
        type: 'asr',
        name: '通义听悟',
        apiKey: process.env.DASHSCOPE_API_KEY,
        baseUrl: 'wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1',
        features: ['realtime', 'streaming', 'en', 'zh'],
      },
      'google-speech': {
        type: 'asr',
        name: 'Google Speech-to-Text',
        apiKey: process.env.GOOGLE_API_KEY,
        features: ['realtime', 'streaming', 'en'],
      },
    },
  },

  // LLM 对话 - 允许的模型
  llm: {
    allowed: [
      'glm-4-flash',          // 智谱 AI (推荐)
      'glm-4',                // 智谱 AI (高级)
      'qwen-turbo',           // 通义千问
      'deepseek-chat',        // DeepSeek
    ],
    default: 'glm-4-flash',
    providers: {
      'glm-4-flash': {
        type: 'llm',
        name: 'GLM-4-FLASH',
        apiKey: process.env.ZHIPU_API_KEY,
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
        features: ['streaming', 'fast'],
        pricing: { input: 0.0001, output: 0.0001 }, // 元/千tokens
      },
      'glm-4': {
        type: 'llm',
        name: 'GLM-4',
        apiKey: process.env.ZHIPU_API_KEY,
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
        features: ['streaming', 'advanced'],
      },
      'qwen-turbo': {
        type: 'llm',
        name: '通义千问 Turbo',
        apiKey: process.env.DASHSCOPE_API_KEY,
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        features: ['streaming'],
      },
      'deepseek-chat': {
        type: 'llm',
        name: 'DeepSeek Chat',
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseUrl: 'https://api.deepseek.com/v1',
        features: ['streaming', 'cheap'],
      },
    },
  },

  // TTS 语音合成 - 允许的模型
  tts: {
    allowed: [
      'edge-tts',             // Edge TTS (免费)
      'aliyun-tts',           // 阿里云 TTS
      'azure-tts',            // Azure TTS
    ],
    default: 'edge-tts',
    providers: {
      'edge-tts': {
        type: 'tts',
        name: 'Edge TTS',
        apiKey: null, // 无需 API Key
        voices: ['en-US-JennyNeural', 'en-US-GuyNeural', 'en-GB-SoniaNeural'],
        features: ['free', 'streaming'],
      },
      'aliyun-tts': {
        type: 'tts',
        name: '阿里云语音合成',
        apiKey: process.env.DASHSCOPE_API_KEY,
        voices: ['aida', 'eva', 'luna', 'andy'],
        features: ['streaming', 'high-quality'],
      },
      'azure-tts': {
        type: 'tts',
        name: 'Azure Speech',
        apiKey: process.env.AZURE_SPEECH_KEY,
        region: process.env.AZURE_REGION,
        voices: ['en-US-JennyNeural', 'en-US-GuyNeural'],
        features: ['streaming', 'ssml'],
      },
    },
  },
};
```

#### 1.4.3 统一接口定义

```typescript
// services/ai/types.ts

/** ASR 统一接口 */
export interface IASRProvider {
  readonly name: string;
  readonly type: 'asr';

  /** 流式识别 */
  recognizeStream(
    audioStream: AsyncIterable<Buffer>,
    options: ASROptions
  ): AsyncGenerator<ASRResult>;

  /** 检查模型是否在白名单中 */
  isAllowed(): boolean;
}

/** LLM 统一接口 */
export interface ILLMProvider {
  readonly name: string;
  readonly type: 'llm';

  /** 流式生成 */
  generateStream(
    messages: ChatMessage[],
    options: LLMOptions
  ): AsyncGenerator<string>;

  /** 检查模型是否在白名单中 */
  isAllowed(): boolean;
}

/** TTS 统一接口 */
export interface ITTSProvider {
  readonly name: string;
  readonly type: 'tts';

  /** 流式合成 */
  synthesizeStream(
    text: string,
    options: TTSOptions
  ): AsyncGenerator<Buffer>;

  /** 检查模型是否在白名单中 */
  isAllowed(): boolean;
}

/** 通用选项 */
export interface BaseOptions {
  model?: string;        // 指定模型
  timeout?: number;      // 超时时间
  fallback?: string;     // 备用模型
}
```

#### 1.4.4 适配器实现示例

```typescript
// services/ai/adapters/base-adapter.ts

import { AIModelConfig } from '@/config/ai-models.config';

/**
 * 适配器基类 - 提供白名单校验等通用逻辑
 */
export abstract class BaseAIAdapter {
  constructor(
    protected readonly serviceType: 'asr' | 'llm' | 'tts',
    protected readonly providerName: string,
  ) {}

  /**
   * 检查当前模型是否在白名单中
   */
  isAllowed(): boolean {
    const config = AIModelConfig[this.serviceType];
    return config.allowed.includes(this.providerName);
  }

  /**
   * 获取模型配置
   */
  protected getConfig() {
    const config = AIModelConfig[this.serviceType];
    return config.providers[this.providerName];
  }

  /**
   * 校验并获取模型（核心方法）
   * @throws Error 如果模型不在白名单中
   */
  protected validateAndGetConfig() {
    if (!this.isAllowed()) {
      throw new Error(
        `Model "${this.providerName}" is not in the allowed list for ${this.serviceType}. ` +
        `Allowed models: ${AIModelConfig[this.serviceType].allowed.join(', ')}`
      );
    }
    return this.getConfig();
  }

  /**
   * 获取备用模型适配器
   */
  protected getFallbackAdapter(): BaseAIAdapter | null {
    const config = AIModelConfig[this.serviceType];
    const fallbackModel = config.allowed.find(m => m !== this.providerName);
    if (!fallbackModel) return null;

    // 返回备用适配器实例（由子类实现）
    return this.createFallbackAdapter(fallbackModel);
  }

  abstract createFallbackAdapter(model: string): BaseAIAdapter;
}
```

```typescript
// services/ai/adapters/llm-adapter.ts

import OpenAI from 'openai';
import { ILLMProvider, LLMOptions, ChatMessage } from '../types';
import { BaseAIAdapter } from './base-adapter';
import { AIModelConfig } from '@/config/ai-models.config';

/**
 * LLM 适配器 - 支持 OpenAI 兼容 API 的所有模型
 */
export class LLMAdapter extends BaseAIAdapter implements ILLMProvider {
  readonly type = 'llm' as const;
  readonly name: string;
  private client: OpenAI;

  constructor(providerName: string = AIModelConfig.llm.default) {
    super('llm', providerName);
    this.name = providerName;

    const config = this.validateAndGetConfig();
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async *generateStream(
    messages: ChatMessage[],
    options: LLMOptions = {}
  ): AsyncGenerator<string> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.name,
        messages,
        stream: true,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 500,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      // 自动降级到备用模型
      if (options.fallback) {
        console.warn(`LLM ${this.name} failed, falling back to ${options.fallback}`);
        const fallbackAdapter = new LLMAdapter(options.fallback);
        yield* fallbackAdapter.generateStream(messages, { ...options, fallback: undefined });
      } else {
        throw error;
      }
    }
  }

  createFallbackAdapter(model: string): LLMAdapter {
    return new LLMAdapter(model);
  }
}
```

```typescript
// services/ai/adapters/asr-adapter.ts

import { IASRProvider, ASROptions, ASRResult } from '../types';
import { BaseAIAdapter } from './base-adapter';
import { AIModelConfig } from '@/config/ai-models.config';
import WebSocket from 'ws';

/**
 * ASR 适配器 - 通义听悟实现
 */
export class ASRAdapter extends BaseAIAdapter implements IASRProvider {
  readonly type = 'asr' as const;
  readonly name: string;

  constructor(providerName: string = AIModelConfig.asr.default) {
    super('asr', providerName);
    this.name = providerName;
    this.validateAndGetConfig();
  }

  async *recognizeStream(
    audioStream: AsyncIterable<Buffer>,
    options: ASROptions = {}
  ): AsyncGenerator<ASRResult> {
    if (!this.isAllowed()) {
      throw new Error(`ASR model "${this.name}" is not allowed`);
    }

    const config = this.getConfig();

    // 根据不同 provider 调用不同的实现
    switch (this.name) {
      case 'aliyun-dashscope':
        yield* this.recognizeWithAliyun(audioStream, config, options);
        break;
      case 'google-speech':
        yield* this.recognizeWithGoogle(audioStream, config, options);
        break;
      default:
        throw new Error(`Unknown ASR provider: ${this.name}`);
    }
  }

  private async *recognizeWithAliyun(
    audioStream: AsyncIterable<Buffer>,
    config: any,
    options: ASROptions
  ): AsyncGenerator<ASRResult> {
    // 通义听悟 WebSocket 流式识别实现
    // ... 具体实现代码
  }

  private async *recognizeWithGoogle(
    audioStream: AsyncIterable<Buffer>,
    config: any,
    options: ASROptions
  ): AsyncGenerator<ASRResult> {
    // Google Speech 流式识别实现
    // ... 具体实现代码
  }

  createFallbackAdapter(model: string): ASRAdapter {
    return new ASRAdapter(model);
  }
}
```

#### 1.4.5 AI Gateway 统一入口

```typescript
// services/ai/ai-gateway.ts

import { AIModelConfig } from '@/config/ai-models.config';
import { LLMAdapter } from './adapters/llm-adapter';
import { ASRAdapter } from './adapters/asr-adapter';
import { TTSAdapter } from './adapters/tts-adapter';

/**
 * AI 统一网关 - 所有 AI 服务的入口
 */
@Injectable()
export class AIGateway {
  private llmInstances: Map<string, LLMAdapter> = new Map();
  private asrInstances: Map<string, ASRAdapter> = new Map();
  private ttsInstances: Map<string, TTSAdapter> = new Map();

  /**
   * 获取 LLM 实例
   * @param model 指定模型，不传则使用默认
   */
  getLLM(model?: string): LLMAdapter {
    const modelName = model || AIModelConfig.llm.default;

    // 白名单校验
    if (!AIModelConfig.llm.allowed.includes(modelName)) {
      throw new Error(
        `LLM model "${modelName}" is not allowed. ` +
        `Allowed: ${AIModelConfig.llm.allowed.join(', ')}`
      );
    }

    // 单例缓存
    if (!this.llmInstances.has(modelName)) {
      this.llmInstances.set(modelName, new LLMAdapter(modelName));
    }

    return this.llmInstances.get(modelName)!;
  }

  /**
   * 获取 ASR 实例
   */
  getASR(model?: string): ASRAdapter {
    const modelName = model || AIModelConfig.asr.default;

    if (!AIModelConfig.asr.allowed.includes(modelName)) {
      throw new Error(
        `ASR model "${modelName}" is not allowed. ` +
        `Allowed: ${AIModelConfig.asr.allowed.join(', ')}`
      );
    }

    if (!this.asrInstances.has(modelName)) {
      this.asrInstances.set(modelName, new ASRAdapter(modelName));
    }

    return this.asrInstances.get(modelName)!;
  }

  /**
   * 获取 TTS 实例
   */
  getTTS(model?: string): TTSAdapter {
    const modelName = model || AIModelConfig.tts.default;

    if (!AIModelConfig.tts.allowed.includes(modelName)) {
      throw new Error(
        `TTS model "${modelName}" is not allowed. ` +
        `Allowed: ${AIModelConfig.tts.allowed.join(', ')}`
      );
    }

    if (!this.ttsInstances.has(modelName)) {
      this.ttsInstances.set(modelName, new TTSAdapter(modelName));
    }

    return this.ttsInstances.get(modelName)!;
  }

  /**
   * 获取所有可用模型
   */
  getAvailableModels() {
    return {
      asr: AIModelConfig.asr.allowed,
      llm: AIModelConfig.llm.allowed,
      tts: AIModelConfig.tts.allowed,
    };
  }
}
```

#### 1.4.6 使用示例

```typescript
// 在业务服务中使用

@Injectable()
export class ConversationService {
  constructor(private readonly aiGateway: AIGateway) {}

  async handleConversation(audioStream: AsyncIterable<Buffer>) {
    // 1. ASR 语音识别（使用默认模型）
    const asr = this.aiGateway.getASR();
    const textStream = asr.recognizeStream(audioStream);

    // 2. LLM 对话（可指定模型或使用默认）
    const llm = this.aiGateway.getLLM('glm-4-flash'); // 或不传使用默认
    const responseStream = llm.generateStream([
      { role: 'user', content: 'Hello!' }
    ], {
      fallback: 'qwen-turbo', // 失败时自动降级
    });

    // 3. TTS 语音合成
    const tts = this.aiGateway.getTTS();
    for await (const textChunk of responseStream) {
      const audioStream = tts.synthesizeStream(textChunk);
      for await (const audioChunk of audioStream) {
        yield audioChunk;
      }
    }
  }
}
```

#### 1.4.7 动态配置（支持运行时切换）

```typescript
// config/ai-models.manager.ts

/**
 * 模型配置管理器 - 支持运行时动态修改
 */
@Injectable()
export class AIModelManager {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 添加新模型到白名单
   */
  addModel(serviceType: 'asr' | 'llm' | 'tts', modelName: string, config: any) {
    AIModelConfig[serviceType].allowed.push(modelName);
    AIModelConfig[serviceType].providers[modelName] = config;
  }

  /**
   * 从白名单移除模型
   */
  removeModel(serviceType: 'asr' | 'llm' | 'tts', modelName: string) {
    const index = AIModelConfig[serviceType].allowed.indexOf(modelName);
    if (index > -1) {
      AIModelConfig[serviceType].allowed.splice(index, 1);
    }
  }

  /**
   * 切换默认模型
   */
  setDefault(serviceType: 'asr' | 'llm' | 'tts', modelName: string) {
    if (!AIModelConfig[serviceType].allowed.includes(modelName)) {
      throw new Error(`Cannot set default: model "${modelName}" is not in allowed list`);
    }
    AIModelConfig[serviceType].default = modelName;
  }

  /**
   * 健康检查 - 检测模型可用性
   */
  async healthCheck(serviceType: 'asr' | 'llm' | 'tts'): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    const models = AIModelConfig[serviceType].allowed;

    for (const model of models) {
      try {
        // 发送测试请求
        results[model] = await this.testModel(serviceType, model);
      } catch {
        results[model] = false;
      }
    }

    return results;
  }

  private async testModel(serviceType: string, model: string): Promise<boolean> {
    // 实现具体的健康检查逻辑
    return true;
  }
}
```

---

## 二、系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              客户端层 (Client Layer)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                     │
│   │   H5 App    │   │   Web App   │   │  小程序      │                     │
│   │  (React 18) │   │  (React 18) │   │  (后续迭代)  │                     │
│   │   ✅ MVP    │   │   ✅ MVP    │   │   ⏸️ 暂缓    │                     │
│   └──────┬──────┘   └──────┬──────┘   └─────────────┘                     │
│          │                 │                 │                             │
│   ┌──────┴─────────────────┴─────────────────┴──────┐                     │
│   │              音频处理模块 (Audio Module)         │                     │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│   │  │ 录音管理  │ │ VAD检测  │ │ 音频播放  │ │ 音频编解码│                 │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                 │
│   └─────────────────────────────────────────────────┘                     │
│                                                                             │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   │ HTTPS / WSS
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              网关层 (Gateway Layer)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                        Nginx / Kong API Gateway                      │  │
│   │   • SSL 终止        • 负载均衡        • 限流熔断        • 路由分发   │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              服务层 (Service Layer)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   │
│   │  API 服务    │   │ WebSocket   │   │  用户服务    │   │  订阅服务    │   │
│   │  (RESTful)  │   │   服务       │   │             │   │             │   │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   │
│          │                 │                 │                 │          │
│   ┌──────┴──────┐   ┌──────┴──────┐   ┌──────┴──────┐   ┌──────┴──────┐   │
│   │  场景服务    │   │  对话服务    │   │  反馈服务    │   │  音频服务    │   │
│   │             │   │             │   │             │   │             │   │
│   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   │
│                                                                             │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AI 服务层 (AI Service Layer)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                        AI 编排服务 (AI Orchestrator)                  │  │
│   │                                                                      │  │
│   │   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │  │
│   │   │ ASR 网关    │──▶│ LLM 网关    │──▶│ TTS 网关    │              │  │
│   │   │ (流式识别)  │   │ (流式生成)  │   │ (流式合成)  │              │  │
│   │   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘              │  │
│   │          │                 │                 │                      │  │
│   │   ┌──────┴─────────────────┴─────────────────┴──────┐              │  │
│   │   │              流式处理管道 (Streaming Pipeline)   │              │  │
│   │   └─────────────────────────────────────────────────┘              │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                     │
│   │ 通义听悟    │   │ GLM-4-FLASH │   │  Edge TTS   │                     │
│   │ ASR 语音识别│   │ (智谱 AI)   │   │  语音合成   │                     │
│   └─────────────┘   └─────────────┘   └─────────────┘                     │
│                                                                             │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据层 (Data Layer)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   │
│   │   Turso     │   │   Redis     │   │   (音频不存) │   │
│   │  (用户数据)  │   │ (对话记录)  │   │ (缓存/会话) │   │  (音频文件)  │   │
│   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 实时对话架构（核心）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         自由对话模式 - 数据流架构                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  客户端                                              服务端                 │
│  ───────                                              ───────                 │
│                                                                             │
│  ┌─────────────┐                                    ┌─────────────┐         │
│  │   麦克风     │                                    │             │         │
│  │   输入流     │                                    │             │         │
│  └──────┬──────┘                                    │             │         │
│         │                                           │             │         │
│         ▼                                           │             │         │
│  ┌─────────────┐      音频数据块       WebSocket     │             │         │
│  │   VAD 检测   │ ──────────────────────────────────▶│  WS 网关    │         │
│  │  (前端实时)  │      (检测到说话才发送)             │             │         │
│  └─────────────┘                                    └──────┬──────┘         │
│                                                            │               │
│                                                            ▼               │
│                                                    ┌───────────────┐       │
│                                                    │  ASR 流式识别  │       │
│                                                    │  (边收边识别)  │       │
│                                                    └───────┬───────┘       │
│                                                            │               │
│                                                            │ 文本片段      │
│                                                            ▼               │
│                                                    ┌───────────────┐       │
│                                                    │  LLM 流式生成  │       │
│                                                    │  (逐token输出) │       │
│                                                    └───────┬───────┘       │
│                                                            │               │
│                                                            │ 文本片段      │
│                                                            ▼               │
│                                                    ┌───────────────┐       │
│                                                    │  TTS 流式合成  │       │
│                                                    │  (逐句合成)    │       │
│                                                    └───────┬───────┘       │
│                                                            │               │
│                                                            │ 音频数据块    │
│                                                            ▼               │
│  ┌─────────────┐                                    ┌───────────────┐       │
│  │   音频播放   │◀─────────────────────────────────│  WS 推送      │       │
│  │  (流式播放)  │       音频数据块                   │               │       │
│  └─────────────┘                                    └───────────────┘       │
│                                                                            │
│  用户打断流程:                                                             │
│  ┌─────────────┐                                    ┌───────────────┐       │
│  │   VAD 检测   │ ────── interrupt ─────────────────▶│  停止 TTS     │       │
│  │  (用户说话)  │                                    │  清空播放队列  │       │
│  └─────────────┘                                    └───────────────┘       │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 三、核心模块设计

### 3.1 前端音频处理模块

```typescript
// 音频管理器 - 核心类设计

/**
 * 音频录制管理器
 * 负责：录音控制、VAD检测、音频编码
 */
class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private vadDetector: VADDetector;

  // 配置
  private config = {
    sampleRate: 16000,        // ASR 要求 16kHz
    channelCount: 1,          // 单声道
    vadThreshold: 0.5,        // VAD 灵敏度
    silenceDuration: 1000,    // 静音 1s 视为说话结束
  };

  /**
   * 初始化麦克风
   */
  async init(): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: this.config.sampleRate,
        channelCount: this.config.channelCount,
        echoCancellation: true,     // 回声消除
        noiseSuppression: true,     // 降噪
        autoGainControl: true,      // 自动增益
      }
    });

    this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });

    // 加载 AudioWorklet 用于 VAD 检测
    await this.audioContext.audioWorklet.addModule('/worklets/vad-processor.js');

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(this.audioContext, 'vad-processor');

    // 处理 VAD 消息
    this.workletNode.port.onmessage = (event) => {
      if (event.data.type === 'voice-start') {
        this.onVoiceStart?.();
      } else if (event.data.type === 'voice-end') {
        this.onVoiceEnd?.();
      } else if (event.data.type === 'audio-chunk') {
        this.onAudioChunk?.(event.data.audio);
      }
    };

    source.connect(this.workletNode);
  }

  /**
   * 开始录音（按住说话模式）
   */
  startRecording(): void {
    this.recording = true;
    this.audioChunks = [];
  }

  /**
   * 停止录音
   */
  stopRecording(): ArrayBuffer {
    this.recording = false;
    return this.encodeAudio(this.audioChunks);
  }

  /**
   * 开始自由对话模式
   */
  startFreeTalk(): void {
    this.freeTalkMode = true;
    // 持续监听，VAD 触发时自动发送
  }

  /**
   * 停止自由对话模式
   */
  stopFreeTalk(): void {
    this.freeTalkMode = false;
  }

  // 回调
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  onAudioChunk?: (audio: ArrayBuffer) => void;
}

/**
 * 音频播放管理器
 * 负责：流式播放、打断控制
 */
class AudioPlayer {
  private audioContext: AudioContext;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;

  /**
   * 添加音频块到播放队列（流式播放）
   */
  async enqueueAudioChunk(audioData: ArrayBuffer): Promise<void> {
    const audioBuffer = await this.audioContext.decodeAudioData(audioData);
    this.audioQueue.push(audioBuffer);

    if (!this.isPlaying) {
      this.playNext();
    }
  }

  /**
   * 播放下一个音频块
   */
  private playNext(): void {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.onPlaybackEnd?.();
      return;
    }

    this.isPlaying = true;
    const buffer = this.audioQueue.shift()!;

    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = buffer;
    this.currentSource.connect(this.audioContext.destination);

    this.currentSource.onended = () => {
      this.playNext();
    };

    this.currentSource.start();
  }

  /**
   * 立即停止播放（用户打断）
   */
  stopImmediately(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.audioQueue = [];
    this.isPlaying = false;
  }

  // 回调
  onPlaybackEnd?: () => void;
}
```

### 3.2 VAD 检测实现（前端 AudioWorklet）

```javascript
// public/worklets/vad-processor.js

class VADProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 480;           // 30ms @ 16kHz
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.isSpeaking = false;
    this.silenceFrames = 0;
    this.energyThreshold = 0.01;     // 能量阈值
    this.silenceThreshold = 33;      // ~1s 静音 (33 frames * 30ms)
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channel = input[0];

    // 累积音频到缓冲区
    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.bufferIndex++] = channel[i];

      if (this.bufferIndex >= this.bufferSize) {
        this.processBuffer();
        this.bufferIndex = 0;
      }
    }

    return true;
  }

  processBuffer() {
    // 计算能量
    let energy = 0;
    for (let i = 0; i < this.bufferSize; i++) {
      energy += this.buffer[i] * this.buffer[i];
    }
    energy = Math.sqrt(energy / this.bufferSize);

    // 发送音频数据
    this.port.postMessage({
      type: 'audio-chunk',
      audio: this.buffer.slice(0)
    });

    // VAD 检测
    if (energy > this.energyThreshold) {
      this.silenceFrames = 0;

      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.port.postMessage({ type: 'voice-start' });
      }
    } else {
      if (this.isSpeaking) {
        this.silenceFrames++;

        if (this.silenceFrames > this.silenceThreshold) {
          this.isSpeaking = false;
          this.port.postMessage({ type: 'voice-end' });
        }
      }
    }
  }
}

registerProcessor('vad-processor', VADProcessor);
```

### 3.3 WebSocket 通信协议

```typescript
// 服务端消息类型定义

enum MessageType {
  // 连接管理
  JOIN_SESSION = 'join_session',
  LEAVE_SESSION = 'leave_session',

  // 音频数据
  AUDIO_CHUNK = 'audio_chunk',
  AUDIO_END = 'audio_end',

  // ASR 结果
  ASR_PARTIAL = 'asr_partial',      // 实时识别结果
  ASR_FINAL = 'asr_final',          // 最终识别结果

  // LLM 响应
  LLM_CHUNK = 'llm_chunk',          // 文本片段
  LLM_DONE = 'llm_done',            // 生成完成

  // TTS 音频
  TTS_CHUNK = 'tts_chunk',          // 音频片段
  TTS_DONE = 'tts_done',            // 合成完成

  // 控制
  INTERRUPT = 'interrupt',          // 打断
  ERROR = 'error',
}

// 消息结构
interface WSMessage<T = any> {
  type: MessageType;
  sessionId: string;
  timestamp: number;
  data: T;
}

// 加入会话
interface JoinSessionData {
  userId: string;
  scenarioId: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  mode: 'press-to-talk' | 'free-talk';
}

// 音频数据
interface AudioChunkData {
  audio: string;        // base64 编码的音频数据
  sequence: number;     // 序列号
  isFinal: boolean;     // 是否最后一块
}

// ASR 结果
interface ASRResultData {
  text: string;
  isFinal: boolean;
  confidence: number;
}

// LLM 响应
interface LLMChunkData {
  text: string;
  isComplete: boolean;
}

// TTS 音频
interface TTSChunkData {
  audio: string;        // base64 编码
  sequence: number;
  isFinal: boolean;
}

// 打断
interface InterruptData {
  reason: 'user_speaking' | 'user_action';
}
```

### 3.4 后端对话服务

```typescript
// 对话服务核心逻辑

@Injectable()
export class ConversationService {
  constructor(
    private readonly asrService: ASRService,
    private readonly llmService: LLMService,
    private readonly ttsService: TTSService,
    private readonly sessionManager: SessionManager,
  ) {}

  /**
   * 处理自由对话模式的 WebSocket 连接
   */
  async handleFreeTalkSession(socket: Socket, data: JoinSessionData) {
    const session = await this.sessionManager.createSession({
      userId: data.userId,
      scenarioId: data.scenarioId,
      difficulty: data.difficulty,
      mode: 'free-talk',
    });

    // 发送开场白
    const openingLine = await this.getOpeningLine(data.scenarioId, data.difficulty);
    await this.sendAIResponse(socket, session, openingLine);

    // 监听音频数据
    socket.on(MessageType.AUDIO_CHUNK, async (msg: WSMessage<AudioChunkData>) => {
      await this.processAudioChunk(socket, session, msg.data);
    });

    // 监听打断
    socket.on(MessageType.INTERRUPT, async (msg: WSMessage<InterruptData>) => {
      await this.handleInterrupt(socket, session);
    });
  }

  /**
   * 处理音频块 - 流式处理管道
   */
  private async processAudioChunk(
    socket: Socket,
    session: Session,
    data: AudioChunkData
  ) {
    // 加入 ASR 队列
    session.asrQueue.push(data.audio);

    // 如果是最后一块，开始处理
    if (data.isFinal) {
      await this.processCompleteUtterance(socket, session);
    }
  }

  /**
   * 处理完整话语 - 流水线处理
   */
  private async processCompleteUtterance(socket: Socket, session: Session) {
    try {
      // 1. ASR 识别
      const audioBuffer = this.mergeAudioChunks(session.asrQueue);
      const asrResult = await this.asrService.recognize(audioBuffer, {
        language: 'en-US',
        onPartial: (text) => {
          socket.emit(MessageType.ASR_PARTIAL, { text, isFinal: false });
        }
      });

      socket.emit(MessageType.ASR_FINAL, {
        text: asrResult.text,
        isFinal: true,
        confidence: asrResult.confidence
      });

      // 清空队列
      session.asrQueue = [];
      session.conversationHistory.push({
        role: 'user',
        content: asrResult.text,
      });

      // 2. LLM 生成（流式）
      const llmStream = await this.llmService.generateStream({
        messages: session.conversationHistory,
        systemPrompt: this.buildSystemPrompt(session),
        onChunk: (text) => {
          socket.emit(MessageType.LLM_CHUNK, { text, isComplete: false });
        }
      });

      // 收集完整回复
      let fullResponse = '';
      for await (const chunk of llmStream) {
        fullResponse += chunk;
      }

      socket.emit(MessageType.LLM_DONE, { text: fullResponse, isComplete: true });

      session.conversationHistory.push({
        role: 'assistant',
        content: fullResponse,
      });

      // 3. TTS 合成（流式）
      await this.ttsService.synthesizeStream(fullResponse, {
        voice: 'en-US-JennyNeural',
        onChunk: (audioChunk, sequence, isFinal) => {
          socket.emit(MessageType.TTS_CHUNK, {
            audio: audioChunk.toString('base64'),
            sequence,
            isFinal,
          });
        }
      });

      socket.emit(MessageType.TTS_DONE, {});

    } catch (error) {
      socket.emit(MessageType.ERROR, {
        code: 'PROCESSING_ERROR',
        message: error.message
      });
    }
  }

  /**
   * 处理打断
   */
  private async handleInterrupt(socket: Socket, session: Session) {
    // 停止当前 TTS 任务
    await this.ttsService.cancel(session.id);

    // 清空播放队列
    socket.emit(MessageType.INTERRUPT, { reason: 'user_speaking' });
  }

  /**
   * 发送 AI 响应
   */
  private async sendAIResponse(socket: Socket, session: Session, text: string) {
    // LLM 流式生成
    const llmStream = await this.llmService.generateStream({
      messages: [{ role: 'assistant', content: text }],
    });

    let fullResponse = '';
    for await (const chunk of llmStream) {
      fullResponse += chunk;
      socket.emit(MessageType.LLM_CHUNK, { text: chunk, isComplete: false });
    }

    socket.emit(MessageType.LLM_DONE, { text: fullResponse, isComplete: true });

    // TTS 流式合成
    await this.ttsService.synthesizeStream(fullResponse, {
      voice: 'en-US-JennyNeural',
      onChunk: (audio, seq, isFinal) => {
        socket.emit(MessageType.TTS_CHUNK, {
          audio: audio.toString('base64'),
          sequence: seq,
          isFinal,
        });
      }
    });

    socket.emit(MessageType.TTS_DONE, {});
  }
}
```

### 3.5 AI 服务封装

```typescript
// ASR 服务 - 通义听悟实时语音识别

import OpenAI from 'openai';
import FormData from 'form-data';
import fs from 'fs';

@Injectable()
export class ASRService {
  private client: OpenAI;

  constructor() {
    // 通义听悟使用 DashScope API
    this.client = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
  }

  /**
   * 流式语音识别（实时版）
   */
  async recognize(audioBuffer: Buffer, options: {
    language: string;
    onPartial: (text: string) => void;
  }): Promise<{ text: string; confidence: number }> {
    // 将 audioBuffer 转换为文件流
    const audioFile = this.bufferToReadStream(audioBuffer);

    // 调用通义听悟 ASR
    const response = await this.client.audio.transcriptions.create({
      file: audioFile,
      model: 'paraformer-realtime-v2',  // 实时版模型
      language: options.language || 'en',
      response_format: 'json',
    });

    return {
      text: response.text,
      confidence: 0.95,  // 通义听悟准确率
    };
  }

  /**
   * WebSocket 实时流式识别（自由对话模式）
   */
  async *recognizeStream(
    audioStream: AsyncIterable<Buffer>,
    options: { language: string }
  ): AsyncGenerator<{ text: string; isFinal: boolean }> {
    // 通义听悟 WebSocket 实时识别
    const wsUrl = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/paraformer-realtime-v2';

    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      },
    });

    let partialText = '';

    ws.on('message', (data) => {
      const result = JSON.parse(data.toString());
      if (result.output?.sentence) {
        partialText = result.output.sentence.text;
      }
    });

    // 发送音频数据
    for await (const chunk of audioStream) {
      ws.send(JSON.stringify({
        header: { action: 'continue' },
        payload: {
          audio: chunk.toString('base64'),
          format: 'pcm',
          sample_rate: 16000,
        },
      }));

      if (partialText) {
        yield { text: partialText, isFinal: false };
      }
    }

    // 结束识别
    ws.send(JSON.stringify({ header: { action: 'finish' } }));

    // 等待最终结果
    const finalResult = await new Promise((resolve) => {
      ws.on('close', () => {
        resolve({ text: partialText, isFinal: true });
      });
    });

    yield finalResult as { text: string; isFinal: boolean };
  }

  private bufferToReadStream(buffer: Buffer): fs.ReadStream {
    // 创建临时文件并返回流
    const tempPath = `/tmp/audio_${Date.now()}.wav`;
    fs.writeFileSync(tempPath, buffer);
    return fs.createReadStream(tempPath);
  }
}

// LLM 服务 - 智谱 GLM-4-FLASH 流式生成

import OpenAI from 'openai';  // GLM 兼容 OpenAI SDK

@Injectable()
export class LLMService {
  private client: OpenAI;

  constructor() {
    // GLM-4-FLASH 兼容 OpenAI API 格式
    this.client = new OpenAI({
      apiKey: process.env.ZHIPU_API_KEY,
      baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
    });
  }

  /**
   * 流式生成对话
   */
  async *generateStream(options: {
    messages: ChatMessage[];
    systemPrompt?: string;
    onChunk?: (text: string) => void;
  }): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: 'glm-4-flash',  // 响应速度极快
      messages: [
        { role: 'system', content: options.systemPrompt || '' },
        ...options.messages,
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 500,  // 限制回复长度，加快响应
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        options.onChunk?.(content);
        yield content;
      }
    }
  }
}

// TTS 服务 - Edge TTS（完全免费）

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class TTSService {
  // Edge TTS 音色映射
  private voices = {
    'female-us': 'en-US-JennyNeural',
    'male-us': 'en-US-GuyNeural',
    'female-uk': 'en-GB-SoniaNeural',
    'female-au': 'en-AU-NatashaNeural',
  };

  /**
   * 流式语音合成
   */
  async synthesizeStream(
    text: string,
    options: {
      voice?: string;
      onChunk: (audio: Buffer, sequence: number, isFinal: boolean) => void;
    }
  ): Promise<void> {
    const voice = this.voices[options.voice || 'female-us'] || 'en-US-JennyNeural';
    const tempFile = path.join('/tmp', `tts_${Date.now()}.mp3`);

    try {
      // 使用 edge-tts 命令行工具合成语音
      await execAsync(`edge-tts --voice "${voice}" --text "${text}" --write-media "${tempFile}"`);

      // 读取生成的音频文件
      const audioData = await fs.readFile(tempFile);

      // 分块发送（模拟流式）
      const chunkSize = 4096;
      let sequence = 0;

      for (let i = 0; i < audioData.length; i += chunkSize) {
        const chunk = audioData.slice(i, i + chunkSize);
        const isFinal = i + chunkSize >= audioData.length;
        options.onChunk(chunk, sequence++, isFinal);
      }

      // 清理临时文件
      await fs.unlink(tempFile).catch(() => {});

    } catch (error) {
      console.error('TTS Error:', error);
      throw error;
    }
  }

  /**
   * 取消合成
   */
  async cancel(sessionId: string): Promise<void> {
    // Edge TTS 无需特殊处理
  }
}
```

### 3.6 对话交互界面设计

#### 3.6.1 界面布局

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           对话界面布局（类微信风格）                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         顶部导航栏                                   │   │
│  │  ┌─────┐                            ┌─────────────────────────────┐ │   │
│  │  │ ← │   场景：餐厅点餐             │  ⚙️ 设置  │  📊 反馈  │   │   │
│  │  └─────┘                            └─────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │                         对话消息区域                                 │   │
│  │                                                                     │   │
│  │    ┌──────────────────────┐                                         │   │
│  │    │ AI: Good morning!    │  ← AI 消息（左对齐）                    │   │
│  │    │ How can I help you?  │                                         │   │
│  │    └──────────────────────┘                                         │   │
│  │                    🔊  ← 点击播放 AI 语音                           │   │
│  │                                                                     │   │
│  │                    ┌──────────────────────┐                         │   │
│  │                    │ User: I'd like to    │  ← 用户消息（右对齐）    │   │
│  │                    │ order a coffee.      │                         │   │
│  │                    └──────────────────────┘                         │   │
│  │                                                                     │   │
│  │    ┌──────────────────────┐                                         │   │
│  │    │ AI: Sure! What size  │                                         │   │
│  │    │ would you like?      │                                         │   │
│  │    └──────────────────────┘                                         │   │
│  │                    🔊  正在播放... ◻️停止                           │   │
│  │                                                                     │   │
│  │                     ▼ 滚动到最新消息                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         底部输入区域                                 │   │
│  │                                                                     │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │                                                             │   │   │
│  │   │    ┌─────────────────┐      ┌─────────────────┐            │   │   │
│  │   │    │                 │      │    🎙️ 自由      │            │   │   │
│  │   │    │   🎙️ 按住说话    │      │    对话模式     │            │   │   │
│  │   │    │                 │      │                 │            │   │   │
│  │   │    │  按住录音       │      │   点击开启      │            │   │   │
│  │   │    │  松开发送       │      │   再次点击关闭  │            │   │   │
│  │   │    │                 │      │                 │            │   │   │
│  │   │    └─────────────────┘      └─────────────────┘            │   │   │
│  │   │                                                             │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.6.2 两种对话模式

**设计参考：** 类似微信语音消息的交互方式，提供两种对话模式供用户选择。

| 模式 | 交互方式 | 适用场景 | 参考应用 |
|------|----------|----------|----------|
| **按住说话** | 长按按钮录音，松开发送 | 嘈杂环境、需要精确控制 | 微信语音消息 |
| **自由对话** | 点击开启，VAD 自动检测说话 | 安静环境、流畅对话体验 | 微信视频通话 |

**交互设计细节：**

1. **按住说话模式**
   - 用户长按麦克风按钮开始录音
   - 松开按钮自动发送音频
   - 支持上滑取消发送
   - 显示录音时长计时器

2. **自由对话模式**
   - 用户点击按钮开启/关闭对话
   - 开启后，VAD 自动检测用户是否在说话
   - 检测到说话时自动开始录音
   - 检测到停顿时自动发送
   - AI 回复时支持打断

#### 3.6.3 按住说话模式

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           按住说话模式交互流程                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  状态机：                                                                    │
│                                                                             │
│   ┌──────────┐    按下     ┌──────────┐    松开     ┌──────────┐          │
│   │   空闲    │ ─────────▶ │   录音    │ ─────────▶ │   发送    │          │
│   │  (idle)  │            │(recording)│            │(sending) │          │
│   └──────────┘            └──────────┘            └──────────┘          │
│        ▲                                                 │                │
│        │                   发送完成                      │                │
│        └─────────────────────────────────────────────────┘                │
│                                                                             │
│  UI 状态：                                                                   │
│                                                                             │
│   空闲状态：                                                                 │
│   ┌─────────────────┐                                                      │
│   │                 │                                                      │
│   │   🎙️ 按住说话    │  ← 灰色背景，提示文字                                │
│   │                 │                                                      │
│   └─────────────────┘                                                      │
│                                                                             │
│   录音中：                                                                   │
│   ┌─────────────────┐                                                      │
│   │   🔴 00:03      │  ← 红色指示灯，显示录音时长                           │
│   │   松开发送      │  ← 波形动画显示音量                                   │
│   │   ~~~~~~~~      │                                                      │
│   └─────────────────┘                                                      │
│                                                                             │
│   发送中：                                                                   │
│   ┌─────────────────┐                                                      │
│   │   ⏳ 发送中...   │  ← 加载动画                                          │
│   └─────────────────┘                                                      │
│                                                                             │
│  手势交互：                                                                  │
│  ├── 按下：开始录音，震动反馈                                               │
│  ├── 上滑取消：显示"松开取消"提示，松开后取消发送                           │
│  ├── 松开：停止录音，发送音频                                               │
│  └── 超时：最长 60 秒，自动停止并发送                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.6.4 自由对话模式

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           自由对话模式交互流程                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  状态机：                                                                    │
│                                                                             │
│   ┌──────────┐   点击开启   ┌──────────┐   点击关闭   ┌──────────┐         │
│   │   空闲    │ ──────────▶ │  监听中   │ ──────────▶ │   结束    │         │
│   │  (idle)  │             │(listening)│             │ (stopped) │         │
│   └──────────┘             └──────────┘             └──────────┘         │
│        ▲                                                   │               │
│        └───────────────────────────────────────────────────┘               │
│                                                                             │
│  监听中状态流转：                                                            │
│                                                                             │
│   ┌──────────┐   VAD检测说话   ┌──────────┐   静音1秒   ┌──────────┐      │
│   │  等待说话  │ ─────────────▶ │  用户说话  │ ─────────▶ │  AI回复   │      │
│   │(listening)│               │ (speaking)│            │(responding)│     │
│   └──────────┘               └──────────┘            └──────────┘      │
│        ▲                                                     │             │
│        │                    AI回复完成                       │             │
│        └─────────────────────────────────────────────────────┘             │
│                                                                             │
│  UI 状态：                                                                   │
│                                                                             │
│   监听中（等待说话）：                                                        │
│   ┌─────────────────┐                                                      │
│   │   🎤 正在监听... │  ← 绿色脉冲动画                                       │
│   │   点击关闭      │                                                      │
│   └─────────────────┘                                                      │
│                                                                             │
│   用户说话中：                                                               │
│   ┌─────────────────┐                                                      │
│   │   🔴 说话中...   │  ← 红色指示                                          │
│   │   ~~~~~~~~      │  ← 实时波形                                          │
│   │   "I want..."   │  ← 实时显示识别文字                                   │
│   └─────────────────┘                                                      │
│                                                                             │
│   AI 回复中：                                                                │
│   ┌─────────────────┐                                                      │
│   │   🤖 AI思考中... │  ← AI 头像动画                                       │
│   │                 │                                                      │
│   │   或            │                                                      │
│   │                 │                                                      │
│   │   🔊 正在播放... │  ← 播放 AI 语音                                      │
│   │   ◻️ 停止       │  ← 可点击打断                                         │
│   └─────────────────┘                                                      │
│                                                                             │
│  打断机制：                                                                  │
│  ├── 用户说话时 VAD 检测到声音 → 自动打断 AI 回复                            │
│  ├── 点击"停止"按钮 → 停止当前 AI 播放                                      │
│  └── AI 播放完毕 → 自动回到监听状态                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.6.5 消息组件设计

```typescript
// components/ChatMessage.tsx

interface ChatMessageProps {
  message: Message;
  onPlayAudio?: () => void;
  isPlaying?: boolean;
  onStopAudio?: () => void;
}

/**
 * 消息类型
 */
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;         // 音频 URL
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
};

/**
 * 对话消息组件
 */
const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onPlayAudio,
  isPlaying,
  onStopAudio,
}) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`
          max-w-[70%] rounded-2xl px-4 py-3
          ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}
        `}
      >
        {/* 消息文本 */}
        <p className="text-sm">{message.content}</p>

        {/* AI 消息附加音频控制 */}
        {!isUser && message.audioUrl && (
          <div className="mt-2 flex items-center gap-2">
            {isPlaying ? (
              <button
                onClick={onStopAudio}
                className="flex items-center gap-1 text-xs text-gray-500"
              >
                <StopIcon /> 停止
              </button>
            ) : (
              <button
                onClick={onPlayAudio}
                className="flex items-center gap-1 text-xs text-gray-500"
              >
                <SpeakerIcon /> 播放
              </button>
            )}
          </div>
        )}

        {/* 时间戳 */}
        <span className="text-xs text-gray-400 mt-1 block">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
};
```

#### 3.6.6 底部输入区组件

```typescript
// components/ChatInput.tsx

interface ChatInputProps {
  mode: 'push-to-talk' | 'free-talk';
  onModeChange: (mode: 'push-to-talk' | 'free-talk') => void;
  onAudioRecord: (audio: Blob) => void;
  isProcessing?: boolean;
}

/**
 * 底部输入区组件
 */
const ChatInput: React.FC<ChatInputProps> = ({
  mode,
  onModeChange,
  onAudioRecord,
  isProcessing,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isFreeTalkActive, setIsFreeTalkActive] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // 按住说话 - 触摸事件
  const handleTouchStart = () => {
    if (mode !== 'push-to-talk' || isProcessing) return;
    startRecording();
  };

  const handleTouchEnd = () => {
    if (!isRecording) return;
    stopRecording();
  };

  // 自由对话 - 点击切换
  const toggleFreeTalk = () => {
    if (mode !== 'free-talk' || isProcessing) return;
    setIsFreeTalkActive(!isFreeTalkActive);
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="flex gap-4">
        {/* 按住说话按钮 */}
        <button
          className={`
            flex-1 py-4 rounded-2xl font-medium transition-all
            ${mode === 'push-to-talk'
              ? isRecording
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              : 'bg-gray-50 text-gray-400'}
          `}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          disabled={mode !== 'push-to-talk' || isProcessing}
        >
          {isRecording ? (
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span>{formatTime(recordingTime)}</span>
              <span>松开发送</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <MicIcon />
              <span>按住说话</span>
            </div>
          )}
        </button>

        {/* 自由对话按钮 */}
        <button
          className={`
            flex-1 py-4 rounded-2xl font-medium transition-all
            ${mode === 'free-talk'
              ? isFreeTalkActive
                ? 'bg-green-500 text-white'
                : 'bg-green-100 text-green-700'
              : 'bg-gray-50 text-gray-400'}
          `}
          onClick={toggleFreeTalk}
          disabled={mode !== 'free-talk' || isProcessing}
        >
          {isFreeTalkActive ? (
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span>点击关闭</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <MicIcon />
              <span>自由对话</span>
            </div>
          )}
        </button>
      </div>

      {/* 模式切换 */}
      <div className="flex justify-center mt-3 gap-2">
        <button
          className={`text-xs ${mode === 'push-to-talk' ? 'text-blue-500' : 'text-gray-400'}`}
          onClick={() => onModeChange('push-to-talk')}
        >
          按住说话
        </button>
        <span className="text-gray-300">|</span>
        <button
          className={`text-xs ${mode === 'free-talk' ? 'text-blue-500' : 'text-gray-400'}`}
          onClick={() => onModeChange('free-talk')}
        >
          自由对话
        </button>
      </div>
    </div>
  );
};
```

#### 3.6.7 状态管理

```typescript
// store/chatStore.ts (Zustand)

interface ChatState {
  // 消息列表
  messages: Message[];

  // 当前模式
  inputMode: 'push-to-talk' | 'free-talk';
  isFreeTalkActive: boolean;

  // 录音状态
  isRecording: boolean;
  recordingTime: number;

  // AI 回复状态
  isAiResponding: boolean;
  isAiSpeaking: boolean;
  currentAiAudio: string | null;

  // 操作
  addMessage: (message: Message) => void;
  setInputMode: (mode: 'push-to-talk' | 'free-talk') => void;
  setFreeTalkActive: (active: boolean) => void;
  setRecording: (recording: boolean) => void;
  setAiResponding: (responding: boolean) => void;
  setAiSpeaking: (speaking: boolean, audioId?: string) => void;
  interruptAi: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  inputMode: 'push-to-talk',
  isFreeTalkActive: false,
  isRecording: false,
  recordingTime: 0,
  isAiResponding: false,
  isAiSpeaking: false,
  currentAiAudio: null,

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),

  setInputMode: (mode) => set({ inputMode: mode }),

  setFreeTalkActive: (active) => set({ isFreeTalkActive: active }),

  setRecording: (recording) => set({ isRecording: recording }),

  setAiResponding: (responding) => set({ isAiResponding: responding }),

  setAiSpeaking: (speaking, audioId) => set({
    isAiSpeaking: speaking,
    currentAiAudio: audioId || null,
  }),

  interruptAi: () => {
    const { currentAiAudio } = get();
    if (currentAiAudio) {
      // 停止音频播放
      audioPlayer.stop(currentAiAudio);
    }
    set({ isAiSpeaking: false, currentAiAudio: null });
  },
}));
```

---

## 四、性能优化方案

### 4.1 响应速度优化

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         响应速度优化策略                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  目标：用户说完后 AI 在 1.5 秒内开始回复                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     延迟分解（优化前）                               │   │
│  │                                                                     │   │
│  │  用户说完 → ASR识别(800ms) → LLM生成(1500ms) → TTS合成(1000ms)     │   │
│  │                                                                     │   │
│  │  总延迟：~3300ms ❌ 无法接受                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     延迟优化（流式处理）                             │   │
│  │                                                                     │   │
│  │  用户说着 → ASR流式识别(实时)                                       │   │
│  │     ↓                                                               │   │
│  │  ASR有结果 → LLM流式生成(首字<500ms)                               │   │
│  │     ↓                                                               │   │
│  │  LLM有输出 → TTS流式合成(首音频<300ms)                             │   │
│  │     ↓                                                               │   │
│  │  用户听到 AI 回复                                                   │   │
│  │                                                                     │   │
│  │  总延迟：首字响应 < 1000ms ✅                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     进一步优化策略                                   │   │
│  │                                                                     │   │
│  │  1. 预测缓存                                                        │   │
│  │     - 常用回复模板预先合成 TTS                                       │   │
│  │     - 如 "Great!" "Let me think..." "That's interesting!"           │   │
│  │                                                                     │   │
│  │  2. 连接池                                                          │   │
│  │     - ASR/LLM/TTS 服务连接复用                                       │   │
│  │     - 减少建连开销                                                   │   │
│  │                                                                     │   │
│  │  3. 边缘部署                                                        │   │
│  │     - AI 服务就近部署                                                │   │
│  │     - 减少网络延迟                                                   │   │
│  │                                                                     │   │
│  │  4. 模型优化                                                        │   │
│  │     - LLM 使用更小模型做简单回复                                     │   │
│  │     - 复杂场景才用大模型                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 并发与扩展

```yaml
# Kubernetes 部署配置示例

apiVersion: apps/v1
kind: Deployment
metadata:
  name: easyspeak-api
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: api
          image: easyspeak/api:latest
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          env:
            - name: NODE_ENV
              value: "production"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: easyspeak-websocket
spec:
  replicas: 5  # WebSocket 服务需要更多实例
  template:
    spec:
      containers:
        - name: websocket
          image: easyspeak/websocket:latest
          resources:
            requests:
              memory: "1Gi"
              cpu: "1000m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
```

### 4.3 缓存策略

```typescript
// 缓存策略

// 1. 场景配置缓存
const scenarioCache = {
  ttl: 3600,  // 1小时
  key: 'scenarios:all',
  refresh: 'on-demand',
};

// 2. 用户会话缓存
const sessionCache = {
  ttl: 1800,  // 30分钟
  key: 'session:{sessionId}',
  storage: 'redis',
};

// 3. 常用回复 TTS 缓存
const ttsCache = {
  ttl: 86400,  // 24小时
  key: 'tts:{voice}:{text_hash}',
  storage: 'redis',
};

// 示例：预合成常用回复
const PRECOMPOSED_RESPONSES = [
  "Great! Let me think about that.",
  "That's a good question!",
  "Can you tell me more?",
  "I understand. Go on.",
  "Interesting! What else?",
];
```

---

## 五、数据库设计

### 5.1 Turso / SQLite（用户数据、订阅、使用记录）

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,  -- UUID 字符串
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  nickname TEXT,
  avatar TEXT,
  english_level TEXT DEFAULT 'beginner',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 订阅表
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,  -- UUID 字符串
  user_id TEXT NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL,           -- free, monthly, yearly
  status TEXT NOT NULL,         -- active, expired, cancelled
  started_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 使用记录表（用于限额）
CREATE TABLE usage_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,            -- YYYY-MM-DD 格式
  conversation_count INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0,  -- 秒
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, date)
);

-- 场景配置表
CREATE TABLE scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  difficulty_levels TEXT,        -- JSON 数组: ["beginner","intermediate","advanced"]
  system_prompts TEXT,           -- JSON 对象，按难度分
  opening_lines TEXT,            -- JSON 对象，按难度分
  learning_goals TEXT,           -- JSON 数组
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_expires ON subscriptions(expires_at);
CREATE INDEX idx_usage_user_date ON usage_records(user_id, date);
```

### 5.2 Turso 使用示例

```typescript
// src/lib/database.ts

import { createClient, InStatement } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// 用户相关操作
export const UserRepository = {
  async findById(id: string) {
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id],
    });
    return result.rows[0];
  },

  async findByEmail(email: string) {
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email],
    });
    return result.rows[0];
  },

  async create(data: { id: string; email?: string; phone?: string }) {
    await db.execute({
      sql: `INSERT INTO users (id, email, phone) VALUES (?, ?, ?)`,
      args: [data.id, data.email, data.phone],
    });
    return this.findById(data.id);
  },

  async updateEnglishLevel(id: string, level: string) {
    await db.execute({
      sql: `UPDATE users SET english_level = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [level, id],
    });
  },
};

// 使用记录操作
export const UsageRepository = {
  async getTodayUsage(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const result = await db.execute({
      sql: 'SELECT * FROM usage_records WHERE user_id = ? AND date = ?',
      args: [userId, today],
    });
    return result.rows[0] || { conversation_count: 0, total_duration: 0 };
  },

  async incrementConversation(userId: string) {
    const today = new Date().toISOString().split('T')[0];

    // SQLite 使用 INSERT OR REPLACE
    await db.execute({
      sql: `
        INSERT INTO usage_records (id, user_id, date, conversation_count)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(user_id, date) DO UPDATE SET
          conversation_count = conversation_count + 1
      `,
      args: [crypto.randomUUID(), userId, today],
    });
  },
};
```

### 5.2 对话记录表（Turso - JSON 字段）

```sql
-- 对话记录表
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  scenario_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,       -- beginner, intermediate, advanced
  mode TEXT NOT NULL,             -- press-to-talk, free-talk

  -- 使用 JSON 存储 messages 和 feedback
  messages TEXT NOT NULL,         -- JSON 数组，存储完整对话记录
  feedback TEXT,                  -- JSON 对象，存储反馈报告

  duration INTEGER,               -- 对话时长（秒）
  started_at TEXT NOT NULL,
  ended_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_started ON conversations(started_at);
CREATE INDEX idx_conversations_scenario ON conversations(scenario_id);
```

### 5.3 JSON 字段结构示例

#### messages 字段示例

```json
[
  {
    "id": "msg_001",
    "role": "assistant",
    "content": "Hello! Welcome to our restaurant. What would you like to order?",
    "timestamp": "2026-03-17T10:30:00Z"
  },
  {
    "id": "msg_002",
    "role": "user",
    "content": "I want a hamburger please",
    "timestamp": "2026-03-17T10:30:15Z"
  },
  {
    "id": "msg_003",
    "role": "assistant",
    "content": "Great choice! Would you like fries with that?",
    "timestamp": "2026-03-17T10:30:16Z"
  }
]
```

#### feedback 字段示例

```json
{
  "grammarErrors": [
    {
      "userSentence": "I want a hamburger",
      "correctedSentence": "I'd like a hamburger",
      "errorType": "politeness",
      "explanation": "'I'd like' is more polite in restaurant contexts"
    }
  ],
  "betterExpressions": [
    {
      "userSentence": "I want a hamburger please",
      "suggestedExpression": "Could I have a hamburger, please?",
      "reason": "More polite and formal"
    }
  ],
  "summary": {
    "totalMessages": 6,
    "userMessages": 3,
    "duration": 180,
    "errorCount": 1
  }
}
```

### 5.4 数据访问层封装

```typescript
// src/lib/repositories/conversation.repository.ts

import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const ConversationRepository = {
  /**
   * 创建新对话
   */
  async create(data: {
    id: string;
    userId: string;
    scenarioId: string;
    difficulty: string;
    mode: string;
  }) {
    await db.execute({
      sql: `INSERT INTO conversations (id, user_id, scenario_id, difficulty, mode, messages, started_at)
            VALUES (?, ?, ?, ?, ?, '[]', datetime('now'))`,
      args: [data.id, data.userId, data.scenarioId, data.difficulty, data.mode],
    });
    return this.findById(data.id);
  },

  /**
   * 添加消息到对话
   */
  async addMessage(conversationId: string, message: Message) {
    // 获取当前 messages
    const result = await db.execute({
      sql: 'SELECT messages FROM conversations WHERE id = ?',
      args: [conversationId],
    });

    const messages = JSON.parse(result.rows[0].messages as string);
    messages.push(message);

    // 更新 messages
    await db.execute({
      sql: 'UPDATE conversations SET messages = ? WHERE id = ?',
      args: [JSON.stringify(messages), conversationId],
    });
  },

  /**
   * 获取用户历史对话
   */
  async findByUserId(userId: string, limit = 20) {
    const result = await db.execute({
      sql: `SELECT * FROM conversations WHERE user_id = ? ORDER BY started_at DESC LIMIT ?`,
      args: [userId, limit],
    });

    return result.rows.map(row => ({
      ...row,
      messages: JSON.parse(row.messages as string),
      feedback: row.feedback ? JSON.parse(row.feedback as string) : null,
    }));
  },

  /**
   * 保存反馈报告
   */
  async saveFeedback(conversationId: string, feedback: Feedback) {
    await db.execute({
      sql: `UPDATE conversations SET feedback = ?, ended_at = datetime('now') WHERE id = ?`,
      args: [JSON.stringify(feedback), conversationId],
    });
  },
};
```

---

## 六、安全设计

### 6.1 认证与授权

```typescript
// JWT 认证中间件

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }
}

// WebSocket 认证
@WebSocketGateway()
export class ConversationGateway implements OnGatewayConnection {
  handleConnection(client: Socket) {
    const token = client.handshake.auth.token;

    try {
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }
}
```

### 6.2 限流策略

```typescript
// 限流配置

// API 限流
const apiRateLimit = {
  windowMs: 60 * 1000,  // 1分钟
  max: 100,             // 最多 100 次请求
};

// WebSocket 连接限流
const wsRateLimit = {
  windowMs: 60 * 1000,
  max: 10,              // 最多 10 次连接
};

// 免费用户对话限流
const freeUserLimit = {
  dailyConversations: 3,
  maxTurns: 10,
};

// 实现检查
async function checkUsageLimit(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const usage = await db.usageRecords.findOne({ userId, date: today });

  if (usage.conversationCount >= freeUserLimit.dailyConversations) {
    throw new LimitExceededException('Daily conversation limit reached');
  }

  return true;
}
```

### 6.3 数据安全

```typescript
// 敏感数据加密

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

class DataEncryption {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor(secretKey: string) {
    this.key = Buffer.from(secretKey, 'hex');
  }

  encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

---

## 七、监控与运维

### 7.1 监控指标

```yaml
# Prometheus 监控指标

# 业务指标
- conversation_total{status="success|failed"}
- conversation_duration_seconds
- asr_latency_seconds
- llm_latency_seconds
- tts_latency_seconds
- user_active_count

# 系统指标
- http_request_duration_seconds
- websocket_connections_active
- websocket_message_total{type="audio|text"}
- cpu_usage_percent
- memory_usage_bytes
- error_rate
```

### 7.2 日志规范

```typescript
// 结构化日志

import { Logger } from 'winston';

const logger = Logger.create({
  format: combine(
    timestamp(),
    json(),
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
  ],
});

// 使用示例
logger.info('Conversation started', {
  userId: 'xxx',
  sessionId: 'xxx',
  scenarioId: 'restaurant',
  difficulty: 'intermediate',
});

logger.error('ASR failed', {
  userId: 'xxx',
  sessionId: 'xxx',
  error: error.message,
  stack: error.stack,
});
```

### 7.3 告警规则

```yaml
# 告警配置

alerts:
  - name: HighLatency
    expr: histogram_quantile(0.95, conversation_duration_seconds) > 5
    for: 5m
    severity: warning
    message: "95% 响应延迟超过 5 秒"

  - name: HighErrorRate
    expr: rate(conversation_total{status="failed"}[5m]) > 0.1
    for: 5m
    severity: critical
    message: "对话失败率超过 10%"

  - name: WebSocketConnectionDrop
    expr: rate(websocket_connections_closed[5m]) > 10
    for: 5m
    severity: warning
    message: "WebSocket 连接频繁断开"
```

---

## 八、部署架构

### 8.1 生产环境部署

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           生产环境部署架构                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           ┌─────────────────┐                              │
│                           │    CDN (OSS)    │                              │
│                           │   静态资源托管   │                              │
│                           └────────┬────────┘                              │
│                                    │                                        │
│                           ┌────────▼────────┐                              │
│                           │   负载均衡器     │                              │
│                           │   (Nginx/ALB)   │                              │
│                           └────────┬────────┘                              │
│                                    │                                        │
│          ┌─────────────────────────┼─────────────────────────┐             │
│          │                         │                         │             │
│   ┌──────▼──────┐          ┌──────▼──────┐          ┌──────▼──────┐       │
│   │   API 服务   │          │  WS 服务 1   │          │  WS 服务 2   │       │
│   │   (Pod x3)  │          │  (Pod x5)   │          │  (Pod x5)   │       │
│   └──────┬──────┘          └──────┬──────┘          └──────┬──────┘       │
│          │                        │                        │               │
│          └────────────────────────┼────────────────────────┘               │
│                                   │                                        │
│                    ┌──────────────▼──────────────┐                        │
│                    │        服务网格             │                        │
│                    │   (Istio/Linkerd)          │                        │
│                    └──────────────┬──────────────┘                        │
│                                   │                                        │
│          ┌─────────────────────────────────────┐                         │
│          │                                     │                         │
│   ┌──────▼──────┐                        ┌──────▼──────┐                 │
│   │   Turso     │                        │   Redis     │                 │
│   │  (统一存储)  │                        │  (缓存/会话) │                 │
│   │             │                        │             │                 │
│   │ • 用户数据   │                        └─────────────┘                 │
│   │ • 对话记录   │                                                        │
│   │ • 反馈报告   │                                                        │
│   └─────────────┘                                                        │
│                                                                            │
│   ┌─────────────────────────────────────────────────────────────────┐     │
│   │                      外部服务（阿里云 DashScope）                 │     │
│   │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │     │
│   │  │  通义听悟   │   │ GLM-4-FLASH │   │  Edge TTS   │          │     │
│   │  │  ASR       │   │   LLM      │   │   TTS      │          │     │
│   │  └─────────────┘   └─────────────┘   └─────────────┘          │     │
│   └─────────────────────────────────────────────────────────────────┘     │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 容量规划

| 指标 | MVP 阶段 | 增长阶段 | 成熟阶段 |
|------|----------|----------|----------|
| DAU | 1,000 | 10,000 | 100,000 |
| 并发对话 | 100 | 1,000 | 10,000 |
| API 服务器 | 2核4G x 3 | 4核8G x 5 | 8核16G x 10 |
| WS 服务器 | 4核8G x 5 | 8核16G x 10 | 16核32G x 20 |
| Redis | 4G | 16G | 64G 集群 |
| Turso | 免费版 | Scaler ($29/月) | Enterprise |

**Turso 免费额度：**
- 3 个数据库
- 9 GB 存储
- 10 亿行读取/月
- 2500 万行写入/月

**MVP 阶段完全够用：**
- 1000 DAU，每人每天 5 次对话
- 每次对话约 2KB 数据
- 每天增量约 10MB，一个月约 300MB
- 免费版 9GB 可支持约 30 个月

---

## 九、开发排期

### 9.1 MVP 开发计划（6 周）

**目标：MVP 阶段仅开发 H5 和 Web 端，代码复用率 > 90%**

| 周次 | 任务 | 交付物 |
|------|------|--------|
| W1 | 项目搭建、技术验证 | 项目框架、AI 服务 Demo、Figma 组件对接 |
| W2 | 核心模块开发 | 录音 Hook、播放 Hook、WebSocket 连接 |
| W3 | 按住说话模式 | 完整对话流程（按住说话） |
| W4 | 场景选择、反馈生成 | 场景管理、反馈报告 |
| W5 | 自由对话模式 | VAD 检测、打断能力 |
| W6 | 测试与优化 | 性能优化、Bug 修复、H5/Web 部署上线 |

**后续迭代（非 MVP）：**
- 微信小程序开发（Taro 框架，复用 React 代码）

### 9.2 团队配置建议

| 角色 | 人数 | 职责 |
|------|------|------|
| 前端工程师 | 2 | H5/Web React 开发、音频处理、Figma 组件对接 |
| 后端工程师 | 2 | API 服务、WebSocket 服务 |
| AI 工程师 | 1 | AI 服务集成、Prompt 优化 |
| UI 设计师 | 1 | Figma 设计稿、组件规范（与前端协作） |
| 测试工程师 | 1 | 功能测试、性能测试 |
| 产品经理 | 1 | 需求管理、验收 |

---

## 附录

### A. 技术风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| AI 服务不稳定 | 对话中断 | 多服务商备选、降级方案 |
| WebSocket 断连 | 体验差 | 自动重连、心跳检测、状态恢复 |
| 高并发压力 | 服务崩溃 | 限流、熔断、弹性扩容 |
| 音频编解码兼容性 | 部分设备异常 | 兼容性检测、降级方案 |

### B. 性能基准

| 指标 | 目标值 | 测试方法 |
|------|--------|----------|
| 首字响应时间 | < 1.5s | 端到端测试 |
| WebSocket 延迟 | < 50ms | ping/pong 测试 |
| ASR 准确率 | > 95% | 标注数据测试 |
| TTS 自然度 | MOS > 4.0 | 人工评测 |

---

**文档维护**：
- 作者：Claude
- 版本历史：v1.0 (2026-03-17) - 初始版本
