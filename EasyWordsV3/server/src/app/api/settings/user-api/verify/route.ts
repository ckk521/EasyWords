// API: 验证用户 API 配置
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-utils'
import { getUserIdFromHeaders } from '@/lib/auth-middleware'
import { z } from 'zod'
import { verifyApiKey } from '@/lib/llm'
import { prisma } from '@/lib/db'

const VerifyUserApiConfigSchema = z.object({
  apiKey: z.string().min(1, 'API Key 不能为空'),
  baseURL: z.string().url('Base URL 格式不正确').optional(),
  model: z.string().min(1, '模型名称不能为空').optional(),
})

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromHeaders(request)
    if (!userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '请先登录', 401)
    }

    // 检查用户是否有权限配置自己的 API
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { canUseOwnApi: true },
    })

    if (!user?.canUseOwnApi) {
      return errorResponse(ErrorCodes.FORBIDDEN, '您没有权限配置自己的 API', 403)
    }

    const body = await request.json()

    // 验证输入
    const validated = VerifyUserApiConfigSchema.safeParse(body)
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
      baseURL: baseURL || 'https://open.bigmodel.cn/api/paas/v4/',
      model: model || 'glm-4-flash',
    })

    if (!isValid) {
      return errorResponse(ErrorCodes.INVALID_API_KEY, 'API 配置无效，请检查您的 API Key、Base URL 和模型名称')
    }

    return successResponse({ valid: true })
  } catch (error) {
    console.error('验证用户 API 配置失败:', error)
    return errorResponse(ErrorCodes.INVALID_API_KEY, 'API 配置验证失败')
  }
}
