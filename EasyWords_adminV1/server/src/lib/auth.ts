import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

export interface JwtPayload {
  userId: string
  type: 'user' | 'admin'
  role?: string
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10)
}

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN })
}

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

// 登录失败限制配置
export const LOGIN_FAIL_LIMIT = 5
export const LOGIN_LOCK_DURATION_MS = 60 * 1000 // 1 分钟

export const checkLoginLock = (loginLockedUntil: Date | null): { locked: boolean; remainingSeconds?: number } => {
  if (!loginLockedUntil) return { locked: false }

  const now = new Date()
  if (now < loginLockedUntil) {
    const remainingMs = loginLockedUntil.getTime() - now.getTime()
    return { locked: true, remainingSeconds: Math.ceil(remainingMs / 1000) }
  }

  return { locked: false }
}

export const calculateLockUntil = (): Date => {
  return new Date(Date.now() + LOGIN_LOCK_DURATION_MS)
}
