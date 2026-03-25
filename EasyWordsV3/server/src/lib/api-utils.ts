// API 响应工具
import { NextResponse } from 'next/server'
import { LLMConfig } from './llm'

// 统一响应格式
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 成功响应
export function successResponse<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
  })
}

// 错误响应
export function errorResponse(
  error: string,
  message?: string,
  status: number = 400
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      message,
    },
    { status }
  )
}

// 错误码定义
export const ErrorCodes = {
  API_KEY_NOT_CONFIGURED: 'API_KEY_NOT_CONFIGURED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  LLM_ERROR: 'LLM_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  WORD_EXISTS: 'WORD_EXISTS',
  UNKNOWN: 'UNKNOWN',
  // 认证相关
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ACCOUNT_EXPIRED: 'ACCOUNT_EXPIRED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  // API 配置相关
  USER_API_NOT_CONFIGURED: 'USER_API_NOT_CONFIGURED',
  TOKEN_LIMIT_EXCEEDED: 'TOKEN_LIMIT_EXCEEDED',
} as const

// 活动类型定义
export type ActivityAction = 'add_word' | 'add_article' | 'add_dialogue' | 'add_conversation'

// 记录用户活动
export async function recordActivity(
  userId: string,
  action: ActivityAction,
  resourceId?: string,
  resourceType?: string,
  details?: string
): Promise<void> {
  try {
    const { prisma } = await import('./db')
    await prisma.userActivity.create({
      data: {
        userId,
        action,
        resourceId,
        resourceType,
        details,
      },
    })
  } catch (error) {
    console.error('记录活动失败:', error)
    // 不抛出错误，避免影响主流程
  }
}

// 获取 API 配置
// 如果传了 userId，优先使用用户自己的 API 配置
// 返回值包含 config 和 isUserOwn 标识
export async function getApiConfig(userId?: string): Promise<{ config: LLMConfig; isUserOwn: boolean } | null> {
  const { prisma } = await import('./db')
  const { decrypt } = await import('./encryption')

  const DEFAULT_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/'
  const DEFAULT_MODEL = 'glm-4-flash'

  // 1. 如果传了 userId，检查用户是否有自己的 API 配置
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        canUseOwnApi: true,
        ownApiKey: true,
        ownBaseURL: true,
        ownModel: true,
      },
    })

    if (user?.canUseOwnApi && user.ownApiKey) {
      return {
        config: {
          apiKey: decrypt(user.ownApiKey),
          baseURL: user.ownBaseURL || DEFAULT_BASE_URL,
          model: user.ownModel || DEFAULT_MODEL,
        },
        isUserOwn: true,
      }
    }
  }

  // 2. 回退到系统默认配置
  const settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  })

  if (!settings?.apiKey) return null

  return {
    config: {
      apiKey: decrypt(settings.apiKey),
      baseURL: settings.baseURL || DEFAULT_BASE_URL,
      model: settings.model || DEFAULT_MODEL,
    },
    isUserOwn: false,
  }
}

// 获取用户 API 配置状态（用于前端显示）
export async function getUserApiStatus(userId: string): Promise<{
  canUseOwnApi: boolean
  hasOwnConfig: boolean
  ownBaseURL: string | null
  ownModel: string | null
}> {
  const { prisma } = await import('./db')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      canUseOwnApi: true,
      ownApiKey: true,
      ownBaseURL: true,
      ownModel: true,
    },
  })

  if (!user) {
    return {
      canUseOwnApi: false,
      hasOwnConfig: false,
      ownBaseURL: null,
      ownModel: null,
    }
  }

  return {
    canUseOwnApi: user.canUseOwnApi,
    hasOwnConfig: !!user.ownApiKey,
    ownBaseURL: user.ownBaseURL,
    ownModel: user.ownModel,
  }
}
