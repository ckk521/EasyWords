import { Context, Next } from 'hono'
import { verifyToken, JwtPayload } from '../lib/auth'
import { ApiResponse } from '../types'

// 验证 JWT Token
export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json<ApiResponse>({
      success: false,
      error: '未授权：缺少 Token',
    }, 401)
  }

  const token = authHeader.slice(7)
  const payload = verifyToken(token)

  if (!payload) {
    return c.json<ApiResponse>({
      success: false,
      error: '未授权：Token 无效或已过期',
    }, 401)
  }

  // 设置上下文变量
  c.set('userId', payload.userId)
  c.set('userType', payload.type)
  if (payload.role) {
    c.set('userRole', payload.role)
  }

  await next()
}

// 验证管理员权限
export const adminOnlyMiddleware = async (c: Context, next: Next) => {
  const userType = c.get('userType')

  if (userType !== 'admin') {
    return c.json<ApiResponse>({
      success: false,
      error: '禁止访问：需要管理员权限',
    }, 403)
  }

  await next()
}

// CORS 中间件
export const corsMiddleware = async (c: Context, next: Next) => {
  const origin = c.req.header('Origin')
  const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',')

  if (origin && allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin)
  }

  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  c.header('Access-Control-Allow-Credentials', 'true')

  if (c.req.method === 'OPTIONS') {
    return c.text('', 204)
  }

  await next()
}
