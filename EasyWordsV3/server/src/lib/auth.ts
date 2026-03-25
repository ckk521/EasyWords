// 认证工具 - JWT Token + 密码哈希
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'easywords-default-secret-change-in-production'

// Token 有效期
const TOKEN_EXPIRES_IN = '7d' // 7 天

// 用户信息（Token payload）
export interface TokenPayload {
  userId: string
  username: string
  [key: string]: string | number | boolean | null | undefined
}

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * 生成 JWT Token
 */
export async function generateToken(payload: TokenPayload): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRES_IN)
    .sign(secret)
}

/**
 * 验证 JWT Token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload as TokenPayload
  } catch {
    return null
  }
}

/**
 * 从请求头提取 Token
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}
