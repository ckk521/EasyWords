// API: 用户统计概览
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [totalUsers, todayNewUsers, activeUsers, expiredUsers, disabledUsers, totalActivities] = await Promise.all([
      // 总用户数
      prisma.user.count(),
      // 今日新增
      prisma.user.count({
        where: { createdAt: { gte: todayStart } },
      }),
      // 活跃用户（7天内登录）
      prisma.user.count({
        where: {
          lastLoginAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      // 已过期用户
      prisma.user.count({
        where: {
          expiresAt: { lt: now },
        },
      }),
      // 禁用用户
      prisma.user.count({
        where: { isActive: false },
      }),
      // 总活动数
      prisma.userActivity.count(),
    ])

    return successResponse({
      totalUsers,
      todayNewUsers,
      activeUsers,
      expiredUsers,
      disabledUsers,
      totalActivities,
    })
  } catch (error) {
    console.error('获取统计失败:', error)
    return errorResponse('UNKNOWN', '获取统计失败', 500)
  }
}
