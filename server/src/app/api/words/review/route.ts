// API: 标记已复习
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-utils'
import { MarkReviewedSchema } from '@/lib/schemas'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证输入
    const validated = MarkReviewedSchema.safeParse(body)
    if (!validated.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validated.error.errors[0]?.message || '输入验证失败'
      )
    }

    const { wordIds } = validated.data
    const now = new Date()

    // 批量更新
    for (const id of wordIds) {
      const word = await prisma.word.findUnique({ where: { id } })
      if (word) {
        await prisma.word.update({
          where: { id },
          data: {
            lastReviewedAt: now,
            reviewCount: word.reviewCount + 1,
          },
        })
      }
    }

    return successResponse({ updated: wordIds.length })
  } catch (error) {
    console.error('标记已复习失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '标记已复习失败')
  }
}
