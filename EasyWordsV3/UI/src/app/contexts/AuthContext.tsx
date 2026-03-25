// 认证上下文 - 管理用户登录状态
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  login as loginApi,
  verifyUser,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  clearStoredToken,
  clearStoredUser,
  User,
  LoginRequest,
} from '../services/auth'

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 初始化：从 localStorage 恢复登录状态并验证用户状态
  useEffect(() => {
    async function initAuth() {
      const storedToken = getStoredToken()
      const storedUser = getStoredUser()

      if (storedToken && storedUser) {
        try {
          // 验证用户状态（检查账号是否被禁用或过期）
          const response = await verifyUser()
          setToken(storedToken)
          setUser(response.user)
          // 更新存储的用户信息
          setStoredUser(response.user)
        } catch (error) {
          // 验证失败（账号被禁用或过期），清除登录状态
          const errorMessage = error instanceof Error ? error.message : '请重新登录'
          console.error('用户验证失败:', errorMessage)
          clearStoredToken()
          clearStoredUser()
          // 如果不在登录页，显示提示并跳转到登录页
          if (window.location.pathname !== '/login') {
            toast.error(errorMessage)
            sessionStorage.setItem('login_error', errorMessage)
            setTimeout(() => {
              window.location.href = '/login'
            }, 1500) // 给用户时间看到提示
          }
        }
      }

      setIsLoading(false)
    }

    initAuth()
  }, [])

  // 登录
  const login = useCallback(async (data: LoginRequest) => {
    const response = await loginApi(data)
    setStoredToken(response.token)
    setStoredUser(response.user)
    setToken(response.token)
    setUser(response.user)
  }, [])

  // 登出
  const logout = useCallback(() => {
    clearStoredToken()
    clearStoredUser()
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
