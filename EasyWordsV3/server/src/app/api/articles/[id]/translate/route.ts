// API: 翻译文章段落
import { NextRequest } from 'next/server'
// 强制动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse, ErrorCodes, getApiConfig } from '@/lib/api-utils'
import { translateParagraph } from '@/lib/llm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { paragraphIndex, paragraph } = body

    if (paragraphIndex === undefined || !paragraph) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '缺少段落索引或内容')
    }

    // 获取文章
    const article = await prisma.article.findUnique({
      where: { id },
    })

    if (!article) {
      return errorResponse(ErrorCodes.NOT_FOUND, '文章不存在', 404)
    }

    // 获取 API 配置
    const apiConfig = await getApiConfig()
    if (!apiConfig) {
      return errorResponse(ErrorCodes.API_KEY_NOT_CONFIGURED, '请先配置 API')
    }

    // 调用 LLM 翻译
    const translation = await translateParagraph(paragraph, apiConfig.config)

    // 更新文章的翻译记录
    const translations = JSON.parse(article.translations || '{}')
    translations[paragraphIndex] = translation

    await prisma.article.update({
      where: { id },
      data: { translations: JSON.stringify(translations) },
    })

    return successResponse({
      paragraphIndex,
      translation,
      translations,
    })
  } catch (error) {
    console.error('翻译失败:', error)
    return errorResponse(ErrorCodes.LLM_ERROR, '翻译失败')
  }
}
