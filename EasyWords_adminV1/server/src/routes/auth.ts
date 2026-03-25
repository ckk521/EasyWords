import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../lib/db'
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateRefreshToken,
  checkLoginLock,
  calculateLockUntil,
  LOGIN_FAIL_LIMIT,
} from '../lib/auth'
import { ApiResponse, UserWithPermission } from '../types'
import { authMiddleware } from '../middleware/auth'

const auth = new Hono()

// 注册验证 schema
const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(20, '用户名最多20个字符'),
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6个字符'),
  nickname: z.string().optional(),
})

// 登录验证 schema
const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

// 用户注册
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const validated = registerSchema.parse(body)

    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findUnique({
      where: { username: validated.username },
    })
    if (existingUsername) {
      return c.json<ApiResponse>({
        success: false,
        error: '用户名已存在',
      }, 400)
    }

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email: validated.email },
    })
    if (existingEmail) {
      return c.json<ApiResponse>({
        success: false,
        error: '邮箱已被注册',
      }, 400)
    }

    // 创建用户
    const passwordHash = await hashPassword(validated.password)
    const user = await prisma.user.create({
      data: {
        username: validated.username,
        email: validated.email,
        passwordHash,
        nickname: validated.nickname || null,
      },
    })

    // 创建默认权限
    await prisma.userModulePermission.create({
      data: {
        userId: user.id,
        vocabulary: true,
        reading: true,
        dialogue: true,
        speak: true,
      },
    })

    // 生成 token
    const token = generateToken({ userId: user.id, type: 'user' })
    const refreshToken = generateRefreshToken({ userId: user.id, type: 'user' })

    return c.json<ApiResponse>({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
        },
        token,
        refreshToken,
      },
      message: '注册成功',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json<ApiResponse>({
        success: false,
        error: error.errors[0].message,
      }, 400)
    }
    console.error('Register error:', error)
    return c.json<ApiResponse>({
      success: false,
      error: '注册失败，请稍后重试',
    }, 500)
  }
})

// 用户登录
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const validated = loginSchema.parse(body)

    // 获取客户端信息
    const ipAddress = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown'
    const userAgent = c.req.header('User-Agent') || 'unknown'

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username: validated.username },
      include: { permission: true },
    })

    // 用户不存在
    if (!user) {
      await prisma.loginLog.create({
        data: {
          userId: null,
          username: validated.username,
          status: 'failed',
          failReason: '用户不存在',
          ipAddress,
          userAgent,
        },
      })
      return c.json<ApiResponse>({
        success: false,
        error: '用户名或密码错误',
      }, 401)
    }

    // 检查是否被锁定
    const lockStatus = checkLoginLock(user.loginLockedUntil)
    if (lockStatus.locked) {
      await prisma.loginLog.create({
        data: {
          userId: user.id,
          username: validated.username,
          status: 'failed',
          failReason: '账号已锁定',
          ipAddress,
          userAgent,
        },
      })
      return c.json<ApiResponse>({
        success: false,
        error: `登录失败次数过多，请 ${lockStatus.remainingSeconds} 秒后重试`,
      }, 403)
    }

    // 检查账号状态
    if (!user.isActive) {
      await prisma.loginLog.create({
        data: {
          userId: user.id,
          username: validated.username,
          status: 'failed',
          failReason: '账号已禁用',
          ipAddress,
          userAgent,
        },
      })
      return c.json<ApiResponse>({
        success: false,
        error: '账号已被禁用，请联系管理员',
      }, 403)
    }

    // 检查使用期限
    if (user.expiresAt && new Date() > user.expiresAt) {
      await prisma.loginLog.create({
        data: {
          userId: user.id,
          username: validated.username,
          status: 'failed',
          failReason: '使用权限已到期',
          ipAddress,
          userAgent,
        },
      })
      return c.json<ApiResponse>({
        success: false,
        error: '使用权限已到期，请联系作者',
      }, 403)
    }

    // 验证密码
    const isValidPassword = await verifyPassword(validated.password, user.passwordHash)
    if (!isValidPassword) {
      // 更新失败次数
      const newFailCount = user.loginFailCount + 1
      const updateData: Record<string, unknown> = { loginFailCount: newFailCount }

      if (newFailCount >= LOGIN_FAIL_LIMIT) {
        updateData.loginLockedUntil = calculateLockUntil()
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      })

      await prisma.loginLog.create({
        data: {
          userId: user.id,
          username: validated.username,
          status: 'failed',
          failReason: '密码错误',
          ipAddress,
          userAgent,
        },
      })

      return c.json<ApiResponse>({
        success: false,
        error: '用户名或密码错误',
      }, 401)
    }

    // 登录成功：重置失败计数，更新最后登录时间
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
        username: validated.username,
        status: 'success',
        failReason: null,
        ipAddress,
        userAgent,
      },
    })

    // 生成 token
    const token = generateToken({ userId: user.id, type: 'user' })
    const refreshToken = generateRefreshToken({ userId: user.id, type: 'user' })

    const userSafe: UserWithPermission = {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      expiresAt: user.expiresAt,
      isActive: user.isActive,
      loginFailCount: 0,
      loginLockedUntil: null,
      permission: user.permission ? {
        vocabulary: user.permission.vocabulary,
        reading: user.permission.reading,
        dialogue: user.permission.dialogue,
        speak: user.permission.speak,
      } : null,
    }

    return c.json<ApiResponse>({
      success: true,
      data: {
        user: userSafe,
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
    console.error('Login error:', error)
    return c.json<ApiResponse>({
      success: false,
      error: '登录失败，请稍后重试',
    }, 500)
  }
})

// 获取当前用户信息
auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { permission: true },
  })

  if (!user) {
    return c.json<ApiResponse>({
      success: false,
      error: '用户不存在',
    }, 404)
  }

  const userSafe: UserWithPermission = {
    id: user.id,
    username: user.username,
    email: user.email,
    nickname: user.nickname,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    expiresAt: user.expiresAt,
    isActive: user.isActive,
    loginFailCount: user.loginFailCount,
    loginLockedUntil: user.loginLockedUntil,
    permission: user.permission ? {
      vocabulary: user.permission.vocabulary,
      reading: user.permission.reading,
      dialogue: user.permission.dialogue,
      speak: user.permission.speak,
    } : null,
  }

  return c.json<ApiResponse>({
    success: true,
    data: userSafe,
  })
})

// 登出
auth.post('/logout', authMiddleware, async (c) => {
  // JWT 是无状态的，客户端删除 token 即可
  return c.json<ApiResponse>({
    success: true,
    message: '登出成功',
  })
})

export { auth }
