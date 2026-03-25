// API: 标记已复习
import { NextRequest } from 'next/server'
// 强制动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-utils'
import { MarkReviewedSchema } from '@/lib/schemas'
import { getUserIdFromHeaders } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromHeaders(request)
    if (!userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '请先登录', 401)
    }

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

    // 批量更新（只更新当前用户的单词）
    for (const id of wordIds) {
      const word = await prisma.word.findFirst({ where: { id, userId } })
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
