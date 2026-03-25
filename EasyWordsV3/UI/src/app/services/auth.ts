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
