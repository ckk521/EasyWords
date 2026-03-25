// API: 用户自定义 API 配置
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse, ErrorCodes, getUserApiStatus } from '@/lib/api-utils'
import { getUserIdFromHeaders } from '@/lib/auth-middleware'
import { z } from 'zod'
import { verifyApiKey } from '@/lib/llm'

// Schema 定义
const SaveUserApiConfigSchema = z.object({
  apiKey: z.string().min(1, 'API Key 不能为空'),
  baseURL: z.string().url('Base URL 格式不正确').optional(),
  model: z.string().min(1, '模型名称不能为空').optional(),
})

// 获取用户 API 配置状态
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromHeaders(request)
    if (!userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '请先登录', 401)
    }

    const status = await getUserApiStatus(userId)
    return successResponse(status)
  } catch (error) {
    console.error('获取用户 API 配置状态失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '获取配置状态失败')
  }
}

// 保存用户 API 配置
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
    const validated = SaveUserApiConfigSchema.safeParse(body)
    if (!validated.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validated.error.errors[0]?.message || '输入验证失败'
      )
    }

    const { apiKey, baseURL, model } = validated.data

    // 验证 API 配置是否可用
    const isValid = await verifyApiKey({
      apiKey,
      baseURL: baseURL || 'https://open.bigmodel.cn/api/paas/v4/',
      model: model || 'glm-4-flash',
    })

    if (!isValid) {
      return errorResponse(ErrorCodes.INVALID_API_KEY, 'API 配置无效，请检查您的 API Key 和模型名称')
    }

    // 加密 API Key
    const { encrypt } = await import('@/lib/encryption')
    const encryptedKey = encrypt(apiKey)

    // 保存到用户表
    await prisma.user.update({
      where: { id: userId },
      data: {
        ownApiKey: encryptedKey,
        ownBaseURL: baseURL || null,
        ownModel: model || null,
      },
    })

    return successResponse({ saved: true })
  } catch (error) {
    console.error('保存用户 API 配置失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '保存配置失败')
  }
}

// 删除用户 API 配置
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromHeaders(request)
    if (!userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '请先登录', 401)
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        ownApiKey: null,
        ownBaseURL: null,
        ownModel: null,
      },
    })

    return successResponse({ deleted: true })
  } catch (error) {
    console.error('删除用户 API 配置失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '删除配置失败')
  }
}
