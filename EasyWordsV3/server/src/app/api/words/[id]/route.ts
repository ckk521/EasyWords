// API: 单词详情 / 删除单词
import { NextRequest } from 'next/server'
// 强制动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-utils'
import { getUserIdFromHeaders } from '@/lib/auth-middleware'

// 获取单词详情
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

    const word = await prisma.word.findFirst({
      where: { id, userId },
    })

    if (!word) {
      return errorResponse(ErrorCodes.NOT_FOUND, '单词不存在', 404)
    }

    return successResponse({
      id: word.id,
      word: word.word,
      phoneticUs: word.phoneticUs,
      phoneticUk: word.phoneticUk,
      chineseDefinition: word.chineseDefinition,
      englishDefinition: word.englishDefinition,
      partOfSpeech: word.partOfSpeech,
      audioUs: word.audioUs,
      audioUk: word.audioUk,
      antonyms: JSON.parse(word.antonyms || '[]'),
      sentences: JSON.parse(word.sentences),
      synonyms: JSON.parse(word.synonyms),
      createdAt: word.createdAt.toISOString(),
      lastReviewedAt: word.lastReviewedAt?.toISOString() || null,
      reviewCount: word.reviewCount,
    })
  } catch (error) {
    console.error('获取单词详情失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '获取单词详情失败')
  }
}

// 删除单词
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

    const word = await prisma.word.findFirst({
      where: { id, userId },
    })

    if (!word) {
      return errorResponse(ErrorCodes.NOT_FOUND, '单词不存在', 404)
    }

    await prisma.word.delete({
      where: { id },
    })

    return successResponse({ deleted: true })
  } catch (error) {
    console.error('删除单词失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '删除单词失败')
  }
}
