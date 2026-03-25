// API: 获取文章详情 / 删除文章
import { NextRequest } from 'next/server'
// 强制动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-utils'
import { getUserIdFromHeaders } from '@/lib/auth-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromHeaders(request)
    if (!userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '请先登录', 401)
    }

    const { id } = await params

    const article = await prisma.article.findFirst({
      where: { id, userId },
    })

    if (!article) {
      return errorResponse(ErrorCodes.NOT_FOUND, '文章不存在', 404)
    }

    // 获取关联的单词
    const wordIds: string[] = JSON.parse(article.wordIds)
    const words = await prisma.word.findMany({
      where: { id: { in: wordIds }, userId },
    })

    return successResponse({
      id: article.id,
      title: article.title,
      content: article.content,
      wordIds,
      type: article.type,
      length: article.length,
      translations: JSON.parse(article.translations || '{}'),
      createdAt: article.createdAt.toISOString(),
      words: words.map((w) => ({
        id: w.id,
        word: w.word,
        phoneticUs: w.phoneticUs,
        phoneticUk: w.phoneticUk,
        chineseDefinition: w.chineseDefinition,
        englishDefinition: w.englishDefinition,
        sentences: JSON.parse(w.sentences),
        synonyms: JSON.parse(w.synonyms),
        createdAt: w.createdAt.toISOString(),
        lastReviewedAt: w.lastReviewedAt?.toISOString() || null,
        reviewCount: w.reviewCount,
      })),
    })
  } catch (error) {
    console.error('获取文章详情失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '获取文章详情失败')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromHeaders(request)
    if (!userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '请先登录', 401)
    }

    const { id } = await params

    // 验证文章属于当前用户
    const article = await prisma.article.findFirst({
      where: { id, userId },
    })

    if (!article) {
      return errorResponse(ErrorCodes.NOT_FOUND, '文章不存在', 404)
    }

    await prisma.article.delete({
      where: { id },
    })

    return successResponse({ deleted: true })
  } catch (error) {
    console.error('删除文章失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '删除文章失败')
  }
}
