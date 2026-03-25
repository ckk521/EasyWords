// 认证中间件 - 保护 API 路由
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractToken, TokenPayload } from './auth'

// 扩展 NextRequest 类型
declare module 'next/server' {
  interface NextRequest {
    user?: TokenPayload
  }
}

// 不需要认证的路径
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/settings/verify', // API Key 验证
]

/**
 * 认证中间件
 * 验证 Token 并将用户信息附加到请求对象
 */
export async function authMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = new URL(request.url)

  // 检查是否为公开路径
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return null // 继续处理请求
  }

  // 只对 /api 路径进行认证
  if (!pathname.startsWith('/api/')) {
    return null
  }

  // 提取 Token
  const authHeader = request.headers.get('authorization')
  const token = extractToken(authHeader)

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED', message: '请先登录' },
      { status: 401 }
    )
  }

  // 验证 Token
  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED', message: 'Token 无效或已过期' },
      { status: 401 }
    )
  }

  // 将用户信息附加到请求对象
  request.user = payload

  return null // 继续处理请求
}

/**
 * 从请求中获取当前用户
 */
export function getCurrentUser(request: NextRequest): TokenPayload | null {
  return request.user || null
}

/**
 * 从请求头获取当前用户 ID（用于 middleware 传递的场景）
 */
export function getUserIdFromHeaders(request: NextRequest): string | null {
  return request.headers.get('x-user-id')
}

/**
 * 从请求头获取当前用户名
 */
export function getUsernameFromHeaders(request: NextRequest): string | null {
  return request.headers.get('x-username')
}
