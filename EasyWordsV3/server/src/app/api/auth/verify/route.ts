// API: 验证用户状态（检查账号是否被禁用或过期）
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getUserIdFromHeaders } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromHeaders(request)
    if (!userId) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401)
    }

    // 查询用户状态
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        isActive: true,
        expiresAt: true,
        permission: true,
      },
    })

    if (!user) {
      return errorResponse('USER_NOT_FOUND', '用户不存在', 401)
    }

    if (!user.isActive) {
      return errorResponse('ACCOUNT_DISABLED', '账号已被禁用', 403)
    }

    if (user.expiresAt && new Date() > user.expiresAt) {
      return errorResponse('ACCOUNT_EXPIRED', '账户已过期', 403)
    }

    return successResponse({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        permission: user.permission,
      },
    })
  } catch (error) {
    console.error('验证用户状态失败:', error)
    return errorResponse('UNKNOWN', '验证失败', 500)
  }
}
