// API: 单词详情 / 删除单词
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-utils'

// 获取单词详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const word = await prisma.word.findUnique({
      where: { id },
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
    const { id } = await params

    const word = await prisma.word.findUnique({
      where: { id },
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
