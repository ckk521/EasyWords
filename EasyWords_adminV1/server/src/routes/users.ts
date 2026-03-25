import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { hashPassword } from '../lib/auth'
import { ApiResponse, UserWithPermission, LoginLogInfo, ActivityInfo } from '../types'
import { authMiddleware, adminOnlyMiddleware } from '../middleware/auth'

const users = new Hono()

// 所有用户管理路由都需要管理员权限
users.use('/*', authMiddleware, adminOnlyMiddleware)

// 创建用户验证 schema
const createUserSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(20, '用户名最多20个字符'),
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6个字符').optional(),
  nickname: z.string().optional(),
  expiresAt: z.string().optional(), // ISO date string or null for permanent
  isActive: z.boolean().optional(),
})

// 更新用户验证 schema
const updateUserSchema = z.object({
  nickname: z.string().optional(),
  expiresAt: z.string().nullable().optional(),
  expiryMode: z.string().nullable().optional(), // "permanent" | "days" | "date" | "minutes"
  isActive: z.boolean().optional(),
  canUseOwnApi: z.boolean().optional(), // 是否允许用户配置自己的 API
})

// 更新权限验证 schema
const updatePermissionSchema = z.object({
  vocabulary: z.boolean().optional(),
  reading: z.boolean().optional(),
  dialogue: z.boolean().optional(),
  speak: z.boolean().optional(),
})

// 获取用户列表
users.get('/', async (c) => {
  try {
    const query = c.req.query()
    const page = parseInt(query.page || '1')
    const limit = parseInt(query.limit || '10')
    const search = query.search || ''
    const status = query.status || 'all' // all, active, expired, disabled

    const skip = (page - 1) * limit

    // 构建查询条件
    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
        { nickname: { contains: search } },
      ]
    }

    if (status === 'disabled') {
      where.isActive = false
    } else if (status === 'expired') {
      where.isActive = true
      where.expiresAt = { lt: new Date() }
    } else if (status === 'active') {
      where.isActive = true
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ]
    }

    // 查询总数
    const total = await prisma.user.count({ where })

    // 查询用户列表
    const usersList = await prisma.user.findMany({
      where,
      include: { permission: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    const usersData: UserWithPermission[] = usersList.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      expiresAt: user.expiresAt,
      expiryMode: user.expiryMode,
      isActive: user.isActive,
      canUseOwnApi: user.canUseOwnApi,
      loginFailCount: user.loginFailCount,
      loginLockedUntil: user.loginLockedUntil,
      permission: user.permission ? {
        vocabulary: user.permission.vocabulary,
        reading: user.permission.reading,
        dialogue: user.permission.dialogue,
        speak: user.permission.speak,
      } : null,
    }))

    return c.json<ApiResponse>({
      success: true,
      data: {
        users: usersData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get users error:', error)
    return c.json<ApiResponse>({
      success: false,
      error: '获取用户列表失败',
    }, 500)
  }
})

// 获取单个用户详情
users.get('/:id', async (c) => {
  try {
    const userId = c.req.param('id')

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

    const userData: UserWithPermission = {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      expiresAt: user.expiresAt,
      expiryMode: user.expiryMode,
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
      data: userData,
    })
  } catch (error) {
    console.error('Get user error:', error)
    return c.json<ApiResponse>({
      success: false,
      error: '获取用户信息失败',
    }, 500)
  }
})

// 创建用户
users.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const validated = createUserSchema.parse(body)

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
    const passwordHash = await hashPassword(validated.password || '123456')
    const user = await prisma.user.create({
      data: {
        username: validated.username,
        email: validated.email,
        passwordHash,
        nickname: validated.nickname || null,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        isActive: validated.isActive ?? true,
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

    return c.json<ApiResponse>({
      success: true,
      data: { id: user.id },
      message: '用户创建成功',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json<ApiResponse>({
        success: false,
        error: error.errors[0].message,
      }, 400)
    }
    console.error('Create user error:', error)
    return c.json<ApiResponse>({
      success: false,
      error: '创建用户失败',
    }, 500)
  }
})

// 更新用户信息
users.put('/:id', async (c) => {
  try {
    const userId = c.req.param('id')
    const body = await c.req.json()
    const validated = updateUserSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return c.json<ApiResponse>({
        success: false,
        error: '用户不存在',
      }, 404)
    }

    const updateData: Record<string, unknown> = {}
    if (validated.nickname !== undefined) updateData.nickname = validated.nickname || null
    if (validated.expiresAt !== undefined) updateData.expiresAt = validated.expiresAt ? new Date(validated.expiresAt) : null
    if (validated.expiryMode !== undefined) updateData.expiryMode = validated.expiryMode
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive
    if (validated.canUseOwnApi !== undefined) updateData.canUseOwnApi = validated.canUseOwnApi

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    return c.json<ApiResponse>({
      success: true,
      message: '用户信息更新成功',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json<ApiResponse>({
        success: false,
        error: error.errors[0].message,
      }, 400)
    }
    console.error('Update user error:', error)
    return c.json<ApiResponse>({
      success: false,
      error: '更新用户信息失败',
    }, 500)
  }
})

// 更新用户权限
users.put('/:id/permission', async (c) => {
  try {
    const userId = c.req.param('id')
    const body = await c.req.json()
    const validated = updatePermissionSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return c.json<ApiResponse>({
        success: false,
        error: '用户不存在',
      }, 404)
    }

    // 更新或创建权限
    await prisma.userModulePermission.upsert({
      where: { userId },
      update: validated,
      create: {
        userId,
        ...validated,
      },
    })

    return c.json<ApiResponse>({
      success: true,
      message: '权限更新成功',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json<ApiResponse>({
        success: false,
        error: error.errors[0].message,
      }, 400)
    }
    console.error('Update permission error:', error)
    return c.json<ApiResponse>({
      success: false,
      error: '更新权限失败',
    }, 500)
  }
})

// 获取用户登录日志
users.get('/:id/login-logs', async (c) => {
  try {
    const userId = c.req.param('id')
    const query = c.req.query()
    const limit = parseInt(query.limit || '20')

    const logs = await prisma.loginLog.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    const logsData: LoginLogInfo[] = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      username: log.username,
      status: log.status as 'success' | 'failed',
      failReason: log.failReason,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    }))

    return c.json<ApiResponse>({
      success: true,
      data: logsData,
    })
  } catch (error) {
    console.error('Get login logs error:', error)
    return c.json<ApiResponse>({
      success: false,
      error: '获取登录日志失败',
    }, 500)
  }
})

// 获取用户活动记录
users.get('/:id/activities', async (c) => {
  try {
    const userId = c.req.param('id')
    const query = c.req.query()
    const limit = parseInt(query.limit || '20')

    const activities = await prisma.userActivity.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    const activitiesData: ActivityInfo[] = activities.map((act) => ({
      id: act.id,
      userId: act.userId,
      action: act.action as 'add_word' | 'add_article' | 'add_dialogue' | 'add_conversation',
      resourceId: act.resourceId,
      resourceType: act.resourceType,
      details: act.details,
      createdAt: act.createdAt,
    }))

    return c.json<ApiResponse>({
      success: true,
      data: activitiesData,
    })
  } catch (error) {
    console.error('Get activities error:', error)
    return c.json<ApiResponse>({
      success: false,
      error: '获取活动记录失败',
    }, 500)
  }
})

// 获取统计数据
users.get('/stats/overview', async (c) => {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      totalUsers,
      todayNewUsers,
      activeUsers,
      expiredUsers,
      disabledUsers,
      totalActivities,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.user.count({
        where: {
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: now } },
          ],
        },
      }),
      prisma.user.count({
        where: {
          isActive: true,
          expiresAt: { lt: now },
        },
      }),
      prisma.user.count({
        where: { isActive: false },
      }),
      prisma.userActivity.count(),
    ])

    return c.json<ApiResponse>({
      success: true,
      data: {
        totalUsers,
        todayNewUsers,
        activeUsers,
        expiredUsers,
        disabledUsers,
        totalActivities,
      },
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return c.json<ApiResponse>({
      success: false,
      error: '获取统计数据失败',
    }, 500)
  }
})

// 获取近7日新增用户趋势
users.get('/stats/daily-new-users', async (c) => {
  try {
    const now = new Date()
    const result = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const count = await prisma.user.count({
        where: {
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      })

      result.push({
        date: `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        count,
      })
    }

    return c.json<ApiResponse>({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get daily new users error:', error)
    return c.json<ApiResponse>({
      success: false,
      error: '获取新增用户趋势失败',
    }, 500)
  }
})

// 获取近7日活动趋势
users.get('/stats/activity-trend', async (c) => {
  try {
    const now = new Date()
    const result = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      // 获取各类活动数量
      const [addWord, addArticle, addDialogue, addConversation] = await Promise.all([
        prisma.userActivity.count({
          where: {
            action: 'add_word',
            createdAt: { gte: dayStart, lt: dayEnd },
          },
        }),
        prisma.userActivity.count({
          where: {
            action: 'add_article',
            createdAt: { gte: dayStart, lt: dayEnd },
          },
        }),
        prisma.userActivity.count({
          where: {
            action: 'add_dialogue',
            createdAt: { gte: dayStart, lt: dayEnd },
          },
        }),
        prisma.userActivity.count({
          where: {
            action: 'add_conversation',
            createdAt: { gte: dayStart, lt: dayEnd },
          },
        }),
      ])

      result.push({
        date: `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        add_word: addWord,
        add_article: addArticle,
        add_dialogue: addDialogue,
        add_conversation: addConversation,
      })
    }

    return c.json<ApiResponse>({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get activity trend error:', error)
    return c.json<ApiResponse>({
      success: false,
      error: '获取活动趋势失败',
    }, 500)
  }
})

export { users }
