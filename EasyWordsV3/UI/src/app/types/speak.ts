// V3.0 AI 口语陪练模块类型定义

// 难度等级
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

// 对话模式
export type ConversationMode = 'press-to-talk' | 'free-talk';

// 场景
export interface SpeakScenario {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  difficultyLevels: Difficulty[];
  learningGoals: string[];
  sortOrder: number;
}

// 场景详情（含 systemPrompt）
export interface SpeakScenarioDetail extends SpeakScenario {
  systemPrompts: Record<Difficulty, string>;
  openingLines: Record<Difficulty, string>;
}

// 对话消息
export interface SpeakMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: string;
}

// 对话记录
export interface SpeakConversation {
  id: string;
  scenarioId: string;
  scenarioName: string;
  difficulty: Difficulty;
  mode: ConversationMode;
  wordIds: string[];
  words: string[];
  messages: SpeakMessage[];
  feedback: Feedback | null;
  duration: number | null;
  startedAt: string;
  endedAt: string | null;
}

// 创建对话请求
export interface CreateSpeakConversationRequest {
  scenarioId: string;
  difficulty: Difficulty;
  mode: ConversationMode;
  wordIds?: string[];
}

// 发送消息请求
export interface SendSpeakMessageRequest {
  conversationId: string;
  text: string;
}

// 语法错误
export interface GrammarError {
  userSentence: string;
  correctedSentence: string;
  errorType: string;
  explanation: string;
}

// 更好的表达建议
export interface BetterExpression {
  userSentence: string;
  suggestedExpression: string;
  reason: string;
}

// 说得好的句子（正向鼓励）
export interface GoodExpression {
  userSentence: string;
  praise: string;
}

// 学习反馈
export interface Feedback {
  grammarErrors: GrammarError[];
  betterExpressions: BetterExpression[];
  goodExpressions: GoodExpression[];
  summary: {
    totalMessages: number;
    userMessages: number;
    duration: number;
    errorCount: number;
  };
}

// 音频合成选项
export interface SynthesizeOptions {
  text: string;
  voice?: 'female-us' | 'male-us' | 'female-uk' | 'female-au';
  speed?: number;
}

// 录音状态
export type RecordingState = 'idle' | 'recording' | 'processing';

// 对话状态
export type ConversationState = 'idle' | 'listening' | 'speaking' | 'thinking' | 'ended';
