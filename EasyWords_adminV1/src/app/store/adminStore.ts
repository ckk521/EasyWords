// Admin Store - API backed state management
import { adminApi, usersApi, User, Permission, Stats, LoginLog, Activity, DailyNewUser, ActivityTrend, tokenManager } from '../api/client'

// State
let isAdminLoggedIn = false
let adminUsername = ""
let adminToken: string | null = tokenManager.get()
let usersCache: User[] = []
let cacheVersion = 0

export interface CreateUserData {
  username: string
  email: string
  password?: string
  nickname?: string
}

export interface CreateUserData {
  username: string
  email: string
  password?: string
  nickname?: string
}

export interface CreateUserResult {
  success: boolean
  error?: string
  user?: User
}

export const adminStore = {
  // Auth
  getIsLoggedIn: () => isAdminLoggedIn,
  getAdminUsername: () => adminUsername,
  getToken: () => adminToken,

  login: async (username: string, password: string): Promise<boolean> => {
    console.log('login: calling API...')
    const result = await adminApi.login(username, password)
    console.log('login result:', result)
    if (result.success && result.data) {
      isAdminLoggedIn = true
      adminUsername = result.data.admin.username
      adminToken = result.data.token
      tokenManager.set(result.data.token)
      console.log('login: token saved, adminToken set:', adminToken ? 'yes' : 'no')
      return true
    }
    return false
  },

  logout: () => {
    isAdminLoggedIn = false
    adminUsername = ""
    adminToken = null
    tokenManager.remove()
  },

  // Initialize from stored token
  init: async (): Promise<boolean> => {
    const token = tokenManager.get()
    console.log('init: token from localStorage:', token ? 'exists' : 'missing')
    if (!token) return false

    const result = await adminApi.me(token)
    console.log('init: me result:', result)
    if (result.success && result.data) {
      isAdminLoggedIn = true
      adminUsername = (result.data as { username: string }).username
      adminToken = token
      return true
    }

    tokenManager.remove()
    return false
  },

  // Users
  getUsers: () => usersCache,

  fetchUsers: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    if (!adminToken) return []
    const result = await usersApi.list(adminToken, params)
    if (result.success && result.data) {
      usersCache = result.data.users
      cacheVersion++
    }
    return usersCache
  },

  getUserById: async (id: string): Promise<User | null> => {
    if (!adminToken) return null
    const result = await usersApi.get(adminToken, id)
    return result.success && result.data ? result.data : null
  },

  createUser: async (data: CreateUserData): Promise<CreateUserResult> => {
    if (!adminToken) return { success: false, error: '未登录' }

    const result = await usersApi.create(adminToken, data)
    if (result.success) {
      // Refresh cache
      await adminStore.fetchUsers()
      return { success: true }
    }
    return { success: false, error: result.error || '创建失败' }
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User | null> => {
    console.log('updateUser called, token:', adminToken ? 'exists' : 'missing')
    if (!adminToken) {
      console.error('updateUser: no adminToken')
      return null
    }

    const result = await usersApi.update(adminToken, id, {
      nickname: updates.nickname,
      expiresAt: updates.expiresAt,
      expiryMode: updates.expiryMode,
      isActive: updates.isActive,
      canUseOwnApi: updates.canUseOwnApi,
    })
    console.log('updateUser result:', result)

    if (result.success) {
      // Refresh cache
      await adminStore.fetchUsers()
      const user = await adminStore.getUserById(id)
      return user
    }
    return null
  },

  updatePermission: async (userId: string, permUpdates: Partial<Permission>): Promise<boolean> => {
    console.log('updatePermission called, token:', adminToken ? 'exists' : 'missing')
    if (!adminToken) {
      console.error('updatePermission: no adminToken')
      return false
    }

    const result = await usersApi.updatePermission(adminToken, userId, permUpdates)
    console.log('updatePermission result:', result)
    if (result.success) {
      await adminStore.fetchUsers()
      return true
    }
    return false
  },

  // Stats
  getStats: async (): Promise<Stats | null> => {
    if (!adminToken) return null
    const result = await usersApi.getStats(adminToken)
    return result.success && result.data ? result.data : null
  },

  // Daily new users trend
  getDailyNewUsers: async (): Promise<DailyNewUser[]> => {
    if (!adminToken) return []
    const result = await usersApi.getDailyNewUsers(adminToken)
    return result.success && result.data ? result.data : []
  },

  // Activity trend
  getActivityTrend: async (): Promise<ActivityTrend[]> => {
    if (!adminToken) return []
    const result = await usersApi.getActivityTrend(adminToken)
    return result.success && result.data ? result.data : []
  },

  // Login logs
  getLoginLogs: async (userId: string, limit?: number): Promise<LoginLog[]> => {
    if (!adminToken) return []
    const result = await usersApi.getLoginLogs(adminToken, userId, limit)
    return result.success && result.data ? result.data : []
  },

  // Activities
  getActivities: async (userId: string, limit?: number): Promise<Activity[]> => {
    if (!adminToken) return []
    const result = await usersApi.getActivities(adminToken, userId, limit)
    return result.success && result.data ? result.data : []
  },

  // Reset password
  resetPassword: async (userId: string): Promise<{ success: boolean; message?: string }> => {
    if (!adminToken) return { success: false }
    const result = await usersApi.resetPassword(adminToken, userId)
    if (result.success) {
      return { success: true, message: result.message }
    }
    return { success: false }
  },

  // Cache version for reactivity
  getCacheVersion: () => cacheVersion,
}
