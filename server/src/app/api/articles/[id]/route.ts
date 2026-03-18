// API: 获取文章详情 / 删除文章
import { NextRequest } from 'next/server'
// 强制动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const article = await prisma.article.findUnique({
      where: { id },
    })

    if (!article) {
      return errorResponse(ErrorCodes.NOT_FOUND, '文章不存在', 404)
    }

    // 获取关联的单词
    const wordIds: string[] = JSON.parse(article.wordIds)
    const words = await prisma.word.findMany({
      where: { id: { in: wordIds } },
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
    const { id } = await params

    await prisma.article.delete({
      where: { id },
    })

    return successResponse({ deleted: true })
  } catch (error) {
    console.error('删除文章失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '删除文章失败')
  }
}
