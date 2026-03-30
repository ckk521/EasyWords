// 认证服务 - API 调用
import { request } from './api'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: string
    username: string
    email: string
    nickname: string | null
  }
}

export interface User {
  id: string
  username: string
  email: string
  nickname: string | null
}

export interface VerifyResponse {
  user: User
}

export interface UserApiStatus {
  canUseOwnApi: boolean
  hasOwnConfig: boolean
  ownBaseURL: string | null
  ownModel: string | null
}

/**
 * 用户登录
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * 验证用户状态（检查账号是否被禁用或过期）
 */
export async function verifyUser(): Promise<VerifyResponse> {
  return request<VerifyResponse>('/auth/verify')
}

/**
 * 获取用户 API 配置权限状态
 */
export async function getUserApiStatus(): Promise<UserApiStatus> {
  return request<UserApiStatus>('/settings/user-api')
}

/**
 * 获取存储的 Token
 */
export function getStoredToken(): string | null {
  return localStorage.getItem('auth_token')
}

/**
 * 存储 Token
 */
export function setStoredToken(token: string): void {
  localStorage.setItem('auth_token', token)
}

/**
 * 清除 Token
 */
export function clearStoredToken(): void {
  localStorage.removeItem('auth_token')
}

/**
 * 获取存储的用户信息
 */
export function getStoredUser(): User | null {
  const userStr = localStorage.getItem('auth_user')
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * 存储用户信息
 */
export function setStoredUser(user: User): void {
  localStorage.setItem('auth_user', JSON.stringify(user))
}

/**
 * 清除用户信息
 */
export function clearStoredUser(): void {
  localStorage.removeItem('auth_user')
}

/**
 * 获取存储的用户 API 权限状态
 */
export function getStoredUserApiStatus(): UserApiStatus | null {
  const statusStr = localStorage.getItem('auth_user_api_status')
  if (!statusStr) return null
  try {
    return JSON.parse(statusStr)
  } catch {
    return null
  }
}

/**
 * 存储用户 API 权限状态
 */
export function setStoredUserApiStatus(status: UserApiStatus): void {
  localStorage.setItem('auth_user_api_status', JSON.stringify(status))
}

/**
 * 清除用户 API 权限状态
 */
export function clearStoredUserApiStatus(): void {
  localStorage.removeItem('auth_user_api_status')
}
