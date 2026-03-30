// API: 用户列表
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

// 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const where: any = {}

    // 搜索条件
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
        { nickname: { contains: search } },
      ]
    }

    // 状态筛选
    if (status === 'active') {
      where.isActive = true
    } else if (status === 'disabled') {
      where.isActive = false
    } else if (status === 'expired') {
      where.expiresAt = { lt: new Date() }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          nickname: true,
          createdAt: true,
          lastLoginAt: true,
          expiresAt: true,
          expiryMode: true,
          isActive: true,
          canUseOwnApi: true,
          loginFailCount: true,
          loginLockedUntil: true,
          permission: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return successResponse({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    return errorResponse('UNKNOWN', '获取用户列表失败', 500)
  }
}

// 创建用户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, password, nickname } = body

    if (!username || !email) {
      return errorResponse('VALIDATION_ERROR', '用户名和邮箱不能为空')
    }

    // 检查是否已存在
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    })

    if (existing) {
      return errorResponse('USER_EXISTS', '用户名或邮箱已存在')
    }

    // 哈希密码
    const { hashPassword } = await import('@/lib/auth')
    const passwordHash = await hashPassword(password || '123456')

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        nickname: nickname || null,
      },
    })

    return successResponse({ id: user.id })
  } catch (error) {
    console.error('创建用户失败:', error)
    return errorResponse('UNKNOWN', '创建用户失败', 500)
  }
}
