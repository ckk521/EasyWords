// API Client for EasyWords Admin

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
  token?: string
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { method = 'GET', body, token } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config: RequestInit = {
    method,
    headers,
  }

  if (body) {
    config.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP Error: ${response.status}`,
      }
    }

    return data
  } catch (error) {
    console.error('API request error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败',
    }
  }
}

// ==================== Auth API ====================

export interface User {
  id: string
  username: string
  email: string
  nickname: string | null
  createdAt: string
  lastLoginAt: string | null
  expiresAt: string | null
  expiryMode: string | null // "permanent" | "days" | "date" | "minutes"
  isActive: boolean
  canUseOwnApi: boolean // 是否允许用户配置自己的 API
  loginFailCount: number
  loginLockedUntil: string | null
  permission: Permission | null
}

export interface Permission {
  vocabulary: boolean
  reading: boolean
  dialogue: boolean
  speak: boolean
}

export interface LoginLog {
  id: string
  userId: string | null
  username: string
  status: 'success' | 'failed'
  failReason: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export interface Activity {
  id: string
  userId: string
  action: 'add_word' | 'add_article' | 'add_dialogue' | 'add_conversation'
  resourceId: string | null
  resourceType: string | null
  details: string | null
  createdAt: string
}

export interface Stats {
  totalUsers: number
  todayNewUsers: number
  activeUsers: number
  expiredUsers: number
  disabledUsers: number
  totalActivities: number
}

export interface DailyNewUser {
  date: string
  count: number
}

export interface ActivityTrend {
  date: string
  add_word: number
  add_article: number
  add_dialogue: number
  add_conversation: number
}

export const authApi = {
  // 用户登录
  login: (username: string, password: string) =>
    request<{ user: User; token: string; refreshToken: string }>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    }),

  // 用户注册
  register: (data: { username: string; email: string; password: string; nickname?: string }) =>
    request<{ user: Partial<User>; token: string; refreshToken: string }>('/api/auth/register', {
      method: 'POST',
      body: data,
    }),

  // 获取当前用户
  me: (token: string) =>
    request<User>('/api/auth/me', { token }),

  // 登出
  logout: (token: string) =>
    request('/api/auth/logout', { method: 'POST', token }),
}

// ==================== Admin API ====================

export const adminApi = {
  // 管理员登录
  login: (username: string, password: string) =>
    request<{ admin: { id: string; username: string; role: string }; token: string; refreshToken: string }>('/api/admin/login', {
      method: 'POST',
      body: { username, password },
    }),

  // 获取当前管理员信息
  me: (token: string) =>
    request('/api/admin/me', { token }),

  // 登出
  logout: (token: string) =>
    request('/api/admin/logout', { method: 'POST', token }),
}

// ==================== Users API ====================

export const usersApi = {
  // 获取用户列表
  list: (token: string, params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.search) query.set('search', params.search)
    if (params?.status) query.set('status', params.status)
    return request<{ users: User[]; total: number; page: number; limit: number; totalPages: number }>(
      `/api/users?${query.toString()}`,
      { token }
    )
  },

  // 获取单个用户
  get: (token: string, id: string) =>
    request<User>(`/api/users/${id}`, { token }),

  // 创建用户
  create: (token: string, data: { username: string; email: string; password?: string; nickname?: string }) =>
    request<{ id: string }>('/api/users', { method: 'POST', body: data, token }),

  // 更新用户
  update: (token: string, id: string, data: { nickname?: string; expiresAt?: string | null; expiryMode?: string | null; isActive?: boolean; canUseOwnApi?: boolean }) =>
    request(`/api/users/${id}`, { method: 'PUT', body: data, token }),

  // 更新权限
  updatePermission: (token: string, id: string, permission: Partial<Permission>) =>
    request(`/api/users/${id}/permission`, { method: 'PUT', body: permission, token }),

  // 获取登录日志
  getLoginLogs: (token: string, id: string, limit?: number) =>
    request<LoginLog[]>(`/api/users/${id}/login-logs?limit=${limit || 20}`, { token }),

  // 获取活动记录
  getActivities: (token: string, id: string, limit?: number) =>
    request<Activity[]>(`/api/users/${id}/activities?limit=${limit || 20}`, { token }),

  // 获取统计数据
  getStats: (token: string) =>
    request<Stats>('/api/users/stats/overview', { token }),

  // 获取近7日新增用户趋势
  getDailyNewUsers: (token: string) =>
    request<DailyNewUser[]>('/api/users/stats/daily-new-users', { token }),

  // 获取近7日活动趋势
  getActivityTrend: (token: string) =>
    request<ActivityTrend[]>('/api/users/stats/activity-trend', { token }),
}

// Token 管理
const TOKEN_KEY = 'admin_token'

export const tokenManager = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => localStorage.removeItem(TOKEN_KEY),
}

// Re-export adminStore for convenience
export { adminStore } from '../store/adminStore'
