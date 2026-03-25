// API: 单词列表 / 添加单词
import { NextRequest } from 'next/server'
// 强制动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse, ErrorCodes, recordActivity } from '@/lib/api-utils'
import { LookupWordSchema, WordListQuerySchema, SaveWordSchema } from '@/lib/schemas'
import { getUserIdFromHeaders } from '@/lib/auth-middleware'

// 获取单词列表
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromHeaders(request)
    console.log('[getWords] userId from headers:', userId)

    if (!userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '请先登录', 401)
    }

    const { searchParams } = new URL(request.url)
    const query = WordListQuerySchema.parse({
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      order: searchParams.get('order') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    })

    // 构建查询条件，包含用户 ID
    const where: any = { userId }
    if (query.search) {
      where.word = {
        contains: query.search.toLowerCase(),
      }
    }

    // 构建排序条件
    type SortOrder = 'asc' | 'desc'
    const orderDirection: SortOrder = (query.order || 'desc') as SortOrder
    let orderBy: { createdAt?: SortOrder; lastReviewedAt?: SortOrder }
    if (query.sortBy === 'lastReviewedAt') {
      orderBy = { lastReviewedAt: orderDirection }
    } else {
      orderBy = { createdAt: orderDirection }
    }

    const words = await prisma.word.findMany({
      where,
      orderBy,
      take: query.limit || 100,
      skip: query.offset || 0,
    })

    const total = await prisma.word.count({ where })

    return successResponse({
      words: words.map((w) => ({
        id: w.id,
        word: w.word,
        phoneticUs: w.phoneticUs,
        phoneticUk: w.phoneticUk,
        chineseDefinition: w.chineseDefinition,
        englishDefinition: w.englishDefinition,
        partOfSpeech: w.partOfSpeech,
        audioUs: w.audioUs,
        audioUk: w.audioUk,
        antonyms: JSON.parse(w.antonyms || '[]'),
        sentences: JSON.parse(w.sentences),
        synonyms: JSON.parse(w.synonyms),
        createdAt: w.createdAt.toISOString(),
        lastReviewedAt: w.lastReviewedAt?.toISOString() || null,
        reviewCount: w.reviewCount,
      })),
      total,
    })
  } catch (error) {
    console.error('获取单词列表失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '获取单词列表失败')
  }
}

// 添加单词到生词本（支持直接传递完整数据）
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromHeaders(request)
    console.log('[addWord] userId from headers:', userId)

    if (!userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '请先登录', 401)
    }

    const body = await request.json()
    console.log('[addWord] request body word:', body.word)

    // 检查是否传递了完整数据
    const fullDataValidated = SaveWordSchema.safeParse(body)
    if (fullDataValidated.success) {
      // 直接保存，无需重新查词
      const data = fullDataValidated.data
      const normalizedWord = data.word.toLowerCase()

      // 检查是否已存在（同一用户下）
      const existing = await prisma.word.findFirst({
        where: { word: normalizedWord, userId },
      })
      console.log('[addWord] existing word check:', existing ? existing.word : 'not found')

      if (existing) {
        return errorResponse(ErrorCodes.WORD_EXISTS, '单词已存在于生词本中')
      }

      // 直接保存
      const savedWord = await prisma.word.create({
        data: {
          word: normalizedWord,
          userId,
          phoneticUs: data.phoneticUs,
          phoneticUk: data.phoneticUk,
          chineseDefinition: data.chineseDefinition,
          englishDefinition: data.englishDefinition,
          partOfSpeech: data.partOfSpeech || null,
          audioUs: data.audioUs || null,
          audioUk: data.audioUk || null,
          antonyms: JSON.stringify(data.antonyms || []),
          sentences: JSON.stringify(data.sentences),
          synonyms: JSON.stringify(data.synonyms),
        },
      })

      // 记录活动
      await recordActivity(userId, 'add_word', savedWord.id, 'word', normalizedWord)

      return successResponse({
        id: savedWord.id,
        word: savedWord.word,
        phoneticUs: savedWord.phoneticUs,
        phoneticUk: savedWord.phoneticUk,
        chineseDefinition: savedWord.chineseDefinition,
        englishDefinition: savedWord.englishDefinition,
        partOfSpeech: savedWord.partOfSpeech,
        audioUs: savedWord.audioUs,
        audioUk: savedWord.audioUk,
        antonyms: JSON.parse(savedWord.antonyms || '[]'),
        sentences: JSON.parse(savedWord.sentences),
        synonyms: JSON.parse(savedWord.synonyms),
        createdAt: savedWord.createdAt.toISOString(),
        lastReviewedAt: null,
        reviewCount: 0,
      })
    }

    // 兼容旧逻辑：只传单词时（不推荐，但保持兼容）
    const wordOnlyValidated = LookupWordSchema.safeParse(body)
    if (!wordOnlyValidated.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        wordOnlyValidated.error.errors[0]?.message || '输入验证失败'
      )
    }

    const { word } = wordOnlyValidated.data
    const normalizedWord = word.toLowerCase()

    // 检查是否已存在
    const existing = await prisma.word.findFirst({
      where: { word: normalizedWord, userId },
    })

    if (existing) {
      return errorResponse(ErrorCodes.WORD_EXISTS, '单词已存在于生词本中')
    }

    return errorResponse(ErrorCodes.UNKNOWN, '请提供完整的单词数据')
  } catch (error: any) {
    console.error('添加单词失败:', error)

    if (error.code === 'P2002') {
      return errorResponse(ErrorCodes.WORD_EXISTS, '单词已存在于生词本中')
    }

    return errorResponse(ErrorCodes.UNKNOWN, '添加单词失败')
  }
}
