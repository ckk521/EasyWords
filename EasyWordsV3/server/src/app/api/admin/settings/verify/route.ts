// API: 管理员验证 API 配置
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { successResponse, errorResponse } from '@/lib/api-utils'
import { verifyToken, extractToken } from '@/lib/auth'
import { MODEL_PROVIDERS, ModelProvider } from '../route'

// 默认配置
const DEFAULT_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/'
const DEFAULT_MODEL = 'glm-4-flash'

// 验证管理员权限
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  const token = extractToken(authHeader)
  if (!token) return false
  const payload = await verifyToken(token)
  if (!payload) return false
  return payload.isAdmin === true
}

/**
 * 调用 API 验证配置是否有效
 */
async function testApiConnection(
  apiKey: string,
  baseURL: string,
  model: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    })

    if (response.ok) {
      return { valid: true }
    }

    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`
    return { valid: false, error: errorMessage }
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : '网络连接失败' }
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    if (!await verifyAdmin(request)) {
      return errorResponse('UNAUTHORIZED', '需要管理员权限', 401)
    }

    const body = await request.json()
    const { apiProvider, apiKey, baseURL, model } = body

    // 验证必填字段
    if (!apiKey) {
      return errorResponse('VALIDATION_ERROR', 'API Key 不能为空')
    }

    // 确定使用的配置
    let finalBaseUrl = baseURL
    let finalModel = model

    // 如果有供应商信息，使用默认值填充
    if (apiProvider && MODEL_PROVIDERS[apiProvider as ModelProvider]) {
      const provider = MODEL_PROVIDERS[apiProvider as ModelProvider]
      if (!finalBaseUrl) finalBaseUrl = provider.defaultBaseUrl
      if (!finalModel) finalModel = provider.defaultModel
    }

    // 如果还是没有，使用全局默认值
    if (!finalBaseUrl) finalBaseUrl = DEFAULT_BASE_URL
    if (!finalModel) finalModel = DEFAULT_MODEL

    // 测试连接
    const result = await testApiConnection(apiKey, finalBaseUrl, finalModel)

    if (result.valid) {
      return successResponse({
        valid: true,
        message: 'API 配置有效，连接成功',
        provider: apiProvider || 'custom',
        baseURL: finalBaseUrl,
        model: finalModel,
      })
    } else {
      return successResponse({
        valid: false,
        error: result.error,
        provider: apiProvider || 'custom',
        baseURL: finalBaseUrl,
        model: finalModel,
      })
    }
  } catch (error) {
    console.error('验证 API 配置失败:', error)
    return errorResponse('UNKNOWN', '验证失败', 500)
  }
}
