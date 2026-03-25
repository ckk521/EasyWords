// API: 用户登录
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

    // 查找用户
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.toLowerCase() },
          { email: username.toLowerCase() },
        ],
      },
    })

    if (!user) {
      return errorResponse('USER_NOT_FOUND', '用户不存在', 401)
    }

    // 检查账号状态
    if (!user.isActive) {
      return errorResponse('ACCOUNT_DISABLED', '账号已被禁用', 403)
    }

    // 检查使用期限
    if (user.expiresAt && new Date() > user.expiresAt) {
      return errorResponse('ACCOUNT_EXPIRED', '账户已过期', 403)
    }

    // 检查登录锁定
    if (user.loginLockedUntil && new Date() < user.loginLockedUntil) {
      const remainingMinutes = Math.ceil(
        (user.loginLockedUntil.getTime() - Date.now()) / 60000
      )
      return errorResponse('ACCOUNT_LOCKED', `账号已被锁定，请 ${remainingMinutes} 分钟后重试`, 403)
    }

    // 验证密码
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      // 增加失败次数
      const failCount = user.loginFailCount + 1
      let lockedUntil = user.loginLockedUntil

      // 5 次失败后锁定 30 分钟
      if (failCount >= 5) {
        lockedUntil = new Date(Date.now() + 30 * 60 * 1000)
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginFailCount: failCount,
          loginLockedUntil: lockedUntil,
        },
      })

      // 记录登录日志
      await prisma.loginLog.create({
        data: {
          userId: user.id,
          username: user.username,
          status: 'failed',
          failReason: '密码错误',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      })

      return errorResponse('INVALID_PASSWORD', '密码错误', 401)
    }

    // 登录成功，重置失败次数
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginFailCount: 0,
        loginLockedUntil: null,
        lastLoginAt: new Date(),
      },
    })

    // 记录登录日志
    await prisma.loginLog.create({
      data: {
        userId: user.id,
        username: user.username,
        status: 'success',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    })

    // 生成 Token
    const token = await generateToken({
      userId: user.id,
      username: user.username,
    })

    return successResponse({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
      },
    })
  } catch (error) {
    console.error('登录失败:', error)
    return errorResponse('UNKNOWN', '登录失败，请稍后重试', 500)
  }
}
