// API: 用户登录日志
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

    const logs = await prisma.loginLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return successResponse(logs)
  } catch (error) {
    console.error('获取登录日志失败:', error)
    return errorResponse('UNKNOWN', '获取登录日志失败', 500)
  }
}
