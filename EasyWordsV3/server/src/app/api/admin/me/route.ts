// API: 获取当前管理员信息
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { verifyToken, extractToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractToken(authHeader)

    if (!token) {
      return errorResponse('UNAUTHORIZED', '未登录', 401)
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.isAdmin) {
      return errorResponse('UNAUTHORIZED', '无效的管理员令牌', 401)
    }

    const admin = await prisma.admin.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    })

    if (!admin) {
      return errorResponse('ADMIN_NOT_FOUND', '管理员不存在', 404)
    }

    return successResponse({ admin })
  } catch (error) {
    console.error('获取管理员信息失败:', error)
    return errorResponse('UNKNOWN', '获取管理员信息失败', 500)
  }
}
