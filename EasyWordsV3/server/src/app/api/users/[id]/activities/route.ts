// API: 用户活动记录
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const activities = await prisma.userActivity.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return successResponse(activities)
  } catch (error) {
    console.error('获取活动记录失败:', error)
    return errorResponse('UNKNOWN', '获取活动记录失败', 500)
  }
}
