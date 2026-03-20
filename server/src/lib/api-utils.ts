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
} as const

// 获取 API 配置
export async function getApiConfig(): Promise<LLMConfig | null> {
  const { prisma } = await import('./db')
  const settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  })

  if (!settings?.apiKey) return null

  const { decrypt } = await import('./encryption')
  return {
    apiKey: decrypt(settings.apiKey),
    baseURL: settings.baseURL || 'https://open.bigmodel.cn/api/paas/v4/',
    model: settings.model || 'glm-4-flash',
  }
}
