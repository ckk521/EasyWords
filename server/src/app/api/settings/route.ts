// API: 获取设置状态
import { prisma } from '@/lib/db'
import { successResponse } from '@/lib/api-utils'

// 强制动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic'

export async function GET() {
  const settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  })

  return successResponse({
    hasApiKey: !!settings?.apiKey,
    apiProvider: settings?.apiProvider || null,
    baseURL: settings?.baseURL || null,
    model: settings?.model || null,
  })
}
