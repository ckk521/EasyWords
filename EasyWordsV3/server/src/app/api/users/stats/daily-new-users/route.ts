// API: 近7日新增用户趋势
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

      const count = await prisma.user.count({
        where: {
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      })

      result.push({ date: dateStr, count })
    }

    return successResponse(result)
  } catch (error) {
    console.error('获取新增趋势失败:', error)
    return errorResponse('UNKNOWN', '获取新增趋势失败', 500)
  }
}
