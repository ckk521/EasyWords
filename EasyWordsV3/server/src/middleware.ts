// Next.js 中间件 - 认证保护
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractToken } from './lib/auth'

// 不需要认证的路径
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/settings/verify',
  '/api/admin/login',
]

export async function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url)

  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200 })
  }

  // 检查是否为公开路径
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 只对 /api 路径进行认证
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
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

  // 将用户信息添加到请求头中传递给 API 路由
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.userId)
  requestHeaders.set('x-username', payload.username)
  console.log('[middleware] setting x-user-id:', payload.userId)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: '/api/:path*',
}
