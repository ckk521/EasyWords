// API: 验证 API 配置
import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-utils'
import { z } from 'zod'
import { verifyApiKey } from '@/lib/llm'

const VerifyApiConfigSchema = z.object({
  apiKey: z.string().min(1, 'API Key 不能为空'),
  baseURL: z.string().url('Base URL 格式不正确').optional(),
  model: z.string().min(1, '模型名称不能为空').optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证输入
    const validated = VerifyApiConfigSchema.safeParse(body)
    if (!validated.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validated.error.errors[0]?.message || '输入验证失败'
      )
    }

    const { apiKey, baseURL, model } = validated.data

    // 验证 API 配置
    const isValid = await verifyApiKey({
      apiKey,
      baseURL: baseURL || 'https://cloud.infini-ai.com/maas/coding/v1',
      model: model || 'glm-5',
    })

    if (!isValid) {
      return errorResponse(ErrorCodes.INVALID_API_KEY, 'API 配置无效')
    }

    return successResponse({ valid: true })
  } catch (error) {
    console.error('验证 API 配置失败:', error)
    return errorResponse(ErrorCodes.INVALID_API_KEY, 'API 配置验证失败')
  }
}
