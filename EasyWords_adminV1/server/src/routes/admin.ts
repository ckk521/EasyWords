import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { verifyPassword, generateToken, generateRefreshToken } from '../lib/auth'
import { ApiResponse } from '../types'
import { authMiddleware, adminOnlyMiddleware } from '../middleware/auth'

const admin = new Hono()

// 管理员登录验证 schema
const adminLoginSchema = z.object({
  username: z.string().min(1, '请输入管理员账号'),
  password: z.string().min(1, '请输入密码'),
})

// 管理员登录
admin.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const validated = adminLoginSchema.parse(body)

    // 获取客户端信息
    const ipAddress = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown'
    const userAgent = c.req.header('User-Agent') || 'unknown'

    // 查找管理员
    const adminUser = await prisma.admin.findUnique({
      where: { username: validated.username },
    })

    if (!adminUser) {
      return c.json<ApiResponse>({
        success: false,
        error: '账号或密码错误',
      }, 401)
    }

    // 验证密码
    const isValidPassword = await verifyPassword(validated.password, adminUser.passwordHash)
    if (!isValidPassword) {
      return c.json<ApiResponse>({
        success: false,
        error: '账号或密码错误',
      }, 401)
    }

    // 更新最后登录时间
    await prisma.admin.update({
      where: { id: adminUser.id },
      data: { lastLoginAt: new Date() },
    })

    // 生成 token
    const token = generateToken({
      userId: adminUser.id,
      type: 'admin',
      role: adminUser.role,
    })
    const refreshToken = generateRefreshToken({
      userId: adminUser.id,
      type: 'admin',
      role: adminUser.role,
    })

    return c.json<ApiResponse>({
      success: true,
      data: {
        admin: {
          id: adminUser.id,
          username: adminUser.username,
          role: adminUser.role,
        },
        token,
        refreshToken,
      },
      message: '登录成功',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json<ApiResponse>({
        success: false,
        error: error.errors[0].message,
      }, 400)
    }
    console.error('Admin login error:', error)
    return c.json<ApiResponse>({
      success: false,
      error: '登录失败，请稍后重试',
    }, 500)
  }
})

// 获取当前管理员信息
admin.get('/me', authMiddleware, adminOnlyMiddleware, async (c) => {
  const userId = c.get('userId')

  const adminUser = await prisma.admin.findUnique({
    where: { id: userId },
  })

  if (!adminUser) {
    return c.json<ApiResponse>({
      success: false,
      error: '管理员不存在',
    }, 404)
  }

  return c.json<ApiResponse>({
    success: true,
    data: {
      id: adminUser.id,
      username: adminUser.username,
      role: adminUser.role,
      createdAt: adminUser.createdAt,
      lastLoginAt: adminUser.lastLoginAt,
    },
  })
})

// 管理员登出
admin.post('/logout', authMiddleware, adminOnlyMiddleware, async (c) => {
  return c.json<ApiResponse>({
    success: true,
    message: '登出成功',
  })
})

export { admin }
