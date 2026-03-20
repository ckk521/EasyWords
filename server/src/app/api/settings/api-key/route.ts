// API: 保存 API 配置
import { NextRequest } from 'next/server'
// 强制动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-utils'
import { z } from 'zod'

// Schema 定义
const SaveApiConfigSchema = z.object({
  apiKey: z.string().min(1, 'API Key 不能为空'),
  baseURL: z.string().url('Base URL 格式不正确').optional(),
  model: z.string().min(1, '模型名称不能为空').optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证输入
    const validated = SaveApiConfigSchema.safeParse(body)
    if (!validated.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validated.error.errors[0]?.message || '输入验证失败'
      )
    }

    const { apiKey, baseURL, model } = validated.data

    // 加密 API Key
    const { encrypt } = await import('@/lib/encryption')
    const encryptedKey = encrypt(apiKey)

    // 保存到数据库
    await prisma.settings.upsert({
      where: { id: 'default' },
      update: {
        apiKey: encryptedKey,
        baseURL: baseURL || null,
        model: model || null,
        apiProvider: 'custom',
      },
      create: {
        id: 'default',
        apiKey: encryptedKey,
        baseURL: baseURL || null,
        model: model || null,
        apiProvider: 'custom',
      },
    })

    return successResponse({ saved: true })
  } catch (error) {
    console.error('保存 API 配置失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '保存 API 配置失败')
  }
}

// 删除 API 配置
export async function DELETE() {
  try {
    await prisma.settings.update({
      where: { id: 'default' },
      data: {
        apiKey: null,
        baseURL: null,
        model: null,
        apiProvider: null,
      },
    })

    return successResponse({ deleted: true })
  } catch (error) {
    console.error('删除 API 配置失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '删除 API 配置失败')
  }
}
