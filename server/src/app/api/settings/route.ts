// API: 获取设置状态
import { prisma } from '@/lib/db'
import { successResponse } from '@/lib/api-utils'

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
