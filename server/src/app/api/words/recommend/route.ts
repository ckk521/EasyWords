// API: 推荐单词
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-utils'
import { RecommendWordsSchema } from '@/lib/schemas'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证输入
    const validated = RecommendWordsSchema.safeParse(body)
    if (!validated.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validated.error.errors[0]?.message || '输入验证失败'
      )
    }

    const { count } = validated.data

    // 获取所有单词
    const words = await prisma.word.findMany()

    // 排序：从未复习的 > 最久未复习的 > 最早添加的
    const sorted = words.sort((a, b) => {
      // 都没复习过，按创建时间
      if (!a.lastReviewedAt && !b.lastReviewedAt) {
        return a.createdAt.getTime() - b.createdAt.getTime()
      }
      // a 没复习过，优先
      if (!a.lastReviewedAt) return -1
      // b 没复习过，优先
      if (!b.lastReviewedAt) return 1
      // 都复习过，按复习时间排序
      return a.lastReviewedAt.getTime() - b.lastReviewedAt.getTime()
    })

    // 取前 N 个
    const recommended = sorted.slice(0, count)

    return successResponse(
      recommended.map((w) => ({
        id: w.id,
        word: w.word,
        phoneticUs: w.phoneticUs,
        phoneticUk: w.phoneticUk,
        chineseDefinition: w.chineseDefinition,
        englishDefinition: w.englishDefinition,
        sentences: JSON.parse(w.sentences),
        synonyms: JSON.parse(w.synonyms),
        createdAt: w.createdAt.toISOString(),
        lastReviewedAt: w.lastReviewedAt?.toISOString() || null,
        reviewCount: w.reviewCount,
      }))
    )
  } catch (error) {
    console.error('推荐单词失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '推荐单词失败')
  }
}
