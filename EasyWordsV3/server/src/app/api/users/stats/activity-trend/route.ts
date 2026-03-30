// API: 近7日活动趋势
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const days = 7
    const result = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayStart = new Date(dateStr)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const [add_word, add_article, add_dialogue, add_conversation] = await Promise.all([
        prisma.userActivity.count({
          where: { action: 'add_word', createdAt: { gte: dayStart, lt: dayEnd } },
        }),
        prisma.userActivity.count({
          where: { action: 'add_article', createdAt: { gte: dayStart, lt: dayEnd } },
        }),
        prisma.userActivity.count({
          where: { action: 'add_dialogue', createdAt: { gte: dayStart, lt: dayEnd } },
        }),
        prisma.userActivity.count({
          where: { action: 'add_conversation', createdAt: { gte: dayStart, lt: dayEnd } },
        }),
      ])

      result.push({ date: dateStr, add_word, add_article, add_dialogue, add_conversation })
    }

    return successResponse(result)
  } catch (error) {
    console.error('获取活动趋势失败:', error)
    return errorResponse('UNKNOWN', '获取活动趋势失败', 500)
  }
}
