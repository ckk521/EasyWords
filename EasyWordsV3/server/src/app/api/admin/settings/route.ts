// API: 管理员全局设置
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { verifyToken, extractToken } from '@/lib/auth'
import { encrypt, decrypt } from '@/lib/encryption'

// 模型供应商配置
export const MODEL_PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
  },
  zhipu: {
    name: '智普',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    defaultModel: 'glm-4-flash',
  },
  'infi-coding-plan': {
    name: 'Infi Coding Plan',
    defaultBaseUrl: '',
    defaultModel: '',
  },
} as const

export type ModelProvider = keyof typeof MODEL_PROVIDERS

interface SettingsResponse {
  apiProvider: ModelProvider | null
  apiKey: string | null  // 脱敏后的 API Key
  baseURL: string | null
  model: string | null
}

// 验证管理员权限
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  const token = extractToken(authHeader)

  if (!token) return false

  const payload = await verifyToken(token)
  if (!payload) return false

  return payload.isAdmin === true
}

// GET: 获取全局设置
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    if (!await verifyAdmin(request)) {
      return errorResponse('UNAUTHORIZED', '需要管理员权限', 401)
    }

    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    })

    // 脱敏 API Key（只显示前4位和后4位）
    let maskedApiKey: string | null = null
    if (settings?.apiKey) {
      const decryptedKey = decrypt(settings.apiKey)
      if (decryptedKey.length > 8) {
        maskedApiKey = `${decryptedKey.slice(0, 4)}****${decryptedKey.slice(-4)}`
      } else {
        maskedApiKey = '****'
      }
    }

    return successResponse<SettingsResponse>({
      apiProvider: (settings?.apiProvider as ModelProvider) || null,
      apiKey: maskedApiKey,
      baseURL: settings?.baseURL || null,
      model: settings?.model || null,
    })
  } catch (error) {
    console.error('获取设置失败:', error)
    return errorResponse('UNKNOWN', '获取设置失败', 500)
  }
}

// PUT: 更新全局设置
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员权限
    if (!await verifyAdmin(request)) {
      return errorResponse('UNAUTHORIZED', '需要管理员权限', 401)
    }

    const body = await request.json()
    const { apiProvider, apiKey, baseURL, model } = body

    // 验证供应商
    if (!apiProvider || !MODEL_PROVIDERS[apiProvider as ModelProvider]) {
      return errorResponse('VALIDATION_ERROR', '无效的模型供应商')
    }

    const provider = MODEL_PROVIDERS[apiProvider as ModelProvider]

    // 验证必填字段
    if (!apiKey) {
      return errorResponse('VALIDATION_ERROR', 'API Key 不能为空')
    }

    // 使用默认值填充
    const finalBaseUrl = baseURL || provider.defaultBaseUrl
    const finalModel = model || provider.defaultModel

    if (!finalBaseUrl) {
      return errorResponse('VALIDATION_ERROR', 'Base URL 不能为空')
    }

    if (!finalModel) {
      return errorResponse('VALIDATION_ERROR', 'Model Name 不能为空')
    }

    // 加密 API Key
    const encryptedApiKey = encrypt(apiKey)

    // 保存设置
    await prisma.settings.upsert({
      where: { id: 'default' },
      update: {
        apiProvider,
        apiKey: encryptedApiKey,
        baseURL: finalBaseUrl,
        model: finalModel,
      },
      create: {
        id: 'default',
        apiProvider,
        apiKey: encryptedApiKey,
        baseURL: finalBaseUrl,
        model: finalModel,
      },
    })

    return successResponse({ message: '设置保存成功' })
  } catch (error) {
    console.error('保存设置失败:', error)
    return errorResponse('UNKNOWN', '保存设置失败', 500)
  }
}
