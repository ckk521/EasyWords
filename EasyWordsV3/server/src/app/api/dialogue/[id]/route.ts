// API: 删除对话
import { NextRequest } from 'next/server'
// 强制动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic'

import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-utils'
import { prisma } from '@/lib/db'
import { getUserIdFromHeaders } from '@/lib/auth-middleware'

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

    // 验证对话属于当前用户
    const dialogue = await prisma.dialogue.findFirst({
      where: { id, userId },
    })

    if (!dialogue) {
      return errorResponse(ErrorCodes.NOT_FOUND, '对话不存在', 404)
    }

    await prisma.dialogue.delete({
      where: { id },
    })

    return successResponse({ deleted: true })
  } catch (error: any) {
    console.error('删除对话失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '删除对话失败')
  }
}

// 获取单个对话
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

    const dialogue = await prisma.dialogue.findFirst({
      where: { id, userId },
    })

    if (!dialogue) {
      return errorResponse(ErrorCodes.NOT_FOUND, '对话不存在', 404)
    }

    return successResponse({
      id: dialogue.id,
      scene: dialogue.scene,
      topic: dialogue.topic,
      words: JSON.parse(dialogue.words),
      wordIds: JSON.parse(dialogue.wordIds),
      dialogue: JSON.parse(dialogue.content),
      createdAt: dialogue.createdAt.toISOString(),
    })
  } catch (error: any) {
    console.error('获取对话失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '获取对话失败')
  }
}
