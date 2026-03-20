// Zod Schema 定义
import { z } from 'zod'

// 单词验证
export const LookupWordSchema = z.object({
  word: z.string().min(1).max(50).regex(/^[a-zA-Z\-]+$/, '只支持英文字母和连字符'),
})

// 保存完整单词数据（前端已有数据直接保存）
export const SaveWordSchema = z.object({
  word: z.string().min(1).max(50),
  phoneticUs: z.string(),
  phoneticUk: z.string(),
  chineseDefinition: z.string(),
  englishDefinition: z.string(),
  partOfSpeech: z.string().optional(),
  audioUs: z.string().optional(),
  audioUk: z.string().optional(),
  antonyms: z.array(z.string()).optional(),
  sentences: z.array(z.object({
    en: z.string(),
    zh: z.string(),
  })),
  synonyms: z.array(z.object({
    word: z.string(),
    difference: z.string(),
    example: z.string(),
  })),
})

// 文章生成验证
export const GenerateArticleSchema = z.object({
  wordIds: z.array(z.string().uuid()).min(1).max(20),
  type: z.enum(['news', 'story']),
  length: z.enum(['short', 'medium', 'long']),
  topic: z.string().max(100).optional(),
})

// API Key 验证
export const SaveApiKeySchema = z.object({
  apiKey: z.string().min(1, 'API Key 不能为空'),
})

// 单词列表查询
export const WordListQuerySchema = z.object({
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'lastReviewedAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
})

// 推荐单词
export const RecommendWordsSchema = z.object({
  count: z.coerce.number().min(1).max(50).default(10),
})

// 标记已复习
export const MarkReviewedSchema = z.object({
  wordIds: z.array(z.string().uuid()).min(1),
})
