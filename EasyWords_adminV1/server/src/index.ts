import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prisma } from './lib/db'
import { hashPassword } from './lib/auth'
import { corsMiddleware } from './middleware/auth'
import { auth } from './routes/auth'
import { admin } from './routes/admin'
import { users } from './routes/users'

const app = new Hono()

// 中间件
app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// 健康检查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

// API 路由
app.route('/api/auth', auth)
app.route('/api/admin', admin)
app.route('/api/users', users)

// 404 处理
app.notFound((c) => {
  return c.json({
    success: false,
    error: '接口不存在',
  }, 404)
})

// 错误处理
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json({
    success: false,
    error: '服务器内部错误',
  }, 500)
})

// 初始化管理员账号
async function initAdmin() {
  const adminUsername = process.env.ADMIN_USERNAME || 'ckk521'
  const adminPassword = process.env.ADMIN_PASSWORD || '123456'

  const existingAdmin = await prisma.admin.findUnique({
    where: { username: adminUsername },
  })

  if (!existingAdmin) {
    const passwordHash = await hashPassword(adminPassword)
    await prisma.admin.create({
      data: {
        username: adminUsername,
        passwordHash,
        role: 'super_admin',
      },
    })
    console.log(`Admin account created: ${adminUsername}`)
  }
}

// 启动服务器
const PORT = parseInt(process.env.PORT || '3001')

async function start() {
  try {
    // 测试数据库连接
    await prisma.$connect()
    console.log('Database connected')

    // 初始化管理员账号
    await initAdmin()

    // 启动 HTTP 服务器
    console.log(`Server running on http://localhost:${PORT}`)

    // 使用 Bun 或 Node 的 HTTP 服务器
    // @ts-ignore
    if (typeof Bun !== 'undefined') {
      Bun.serve({
        port: PORT,
        fetch: app.fetch,
      })
    } else {
      const { serve } = await import('@hono/node-server')
      serve({
        fetch: app.fetch,
        port: PORT,
      })
    }
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()

export { app }
