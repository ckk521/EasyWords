import { HonoContext } from 'hono'

// 扩展 Hono 上下文
declare module 'hono' {
  interface ContextVariableMap {
    userId: string
    userType: 'user' | 'admin'
    userRole?: string
  }
}

// API 响应格式
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 用户信息（不含敏感字段）
export interface UserSafe {
  id: string
  username: string
  email: string
  nickname: string | null
  createdAt: Date
  lastLoginAt: Date | null
  expiresAt: Date | null
  expiryMode: string | null // "permanent" | "days" | "date" | "minutes"
  isActive: boolean
  canUseOwnApi: boolean // 是否允许用户配置自己的 API
  loginFailCount: number
  loginLockedUntil: Date | null
}

// 权限信息
export interface PermissionInfo {
  vocabulary: boolean
  reading: boolean
  dialogue: boolean
  speak: boolean
}

// 用户详情（含权限）
export interface UserWithPermission extends UserSafe {
  permission: PermissionInfo | null
}

// 登录日志
export interface LoginLogInfo {
  id: string
  userId: string | null
  username: string
  status: 'success' | 'failed'
  failReason: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

// 用户活动
export interface ActivityInfo {
  id: string
  userId: string
  action: 'add_word' | 'add_article' | 'add_dialogue' | 'add_conversation'
  resourceId: string | null
  resourceType: string | null
  details: string | null
  createdAt: Date
}
