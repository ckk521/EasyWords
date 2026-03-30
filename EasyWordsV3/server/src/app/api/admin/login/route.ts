// API: 管理员登录
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { verifyPassword, generateToken } from '@/lib/auth'

interface LoginRequest {
  username: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json()
    const { username, password } = body

    // 验证输入
    if (!username || !password) {
      return errorResponse('VALIDATION_ERROR', '用户名和密码不能为空')
    }

    // 查找管理员
    const admin = await prisma.admin.findUnique({
      where: { username },
    })

    if (!admin) {
      return errorResponse('ADMIN_NOT_FOUND', '管理员账号不存在', 401)
    }

    // 验证密码
    const isValid = await verifyPassword(password, admin.passwordHash)
    if (!isValid) {
      return errorResponse('INVALID_PASSWORD', '密码错误', 401)
    }

    // 更新最后登录时间
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    })

    // 生成 Token
    const token = await generateToken({
      userId: admin.id,
      username: admin.username,
      role: admin.role,
      isAdmin: true,
    })

    return successResponse({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error('管理员登录失败:', error)
    return errorResponse('UNKNOWN', '登录失败，请稍后重试', 500)
  }
}
