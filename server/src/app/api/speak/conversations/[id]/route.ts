// API: 获取/删除单个对话
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-utils'
import { prisma } from '@/lib/db'

// 获取对话详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const conversation = await prisma.speakConversation.findUnique({
      where: { id },
    })

    if (!conversation) {
      return errorResponse(ErrorCodes.NOT_FOUND, '对话不存在')
    }

    // 获取场景名称
    const scenario = await prisma.speakScenario.findUnique({
      where: { id: conversation.scenarioId },
      select: { name: true },
    })

    return successResponse({
      id: conversation.id,
      scenarioId: conversation.scenarioId,
      scenarioName: scenario?.name || 'Unknown',
      difficulty: conversation.difficulty,
      mode: conversation.mode,
      wordIds: JSON.parse(conversation.wordIds || '[]'),
      messages: JSON.parse(conversation.messages || '[]'),
      feedback: conversation.feedback ? JSON.parse(conversation.feedback) : null,
      duration: conversation.duration,
      startedAt: conversation.startedAt.toISOString(),
      endedAt: conversation.endedAt?.toISOString() || null,
    })
  } catch (error: any) {
    console.error('获取对话失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '获取对话失败')
  }
}

// 删除对话
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const conversation = await prisma.speakConversation.findUnique({
      where: { id },
    })

    if (!conversation) {
      return errorResponse(ErrorCodes.NOT_FOUND, '对话不存在')
    }

    await prisma.speakConversation.delete({
      where: { id },
    })

    return successResponse({ message: '删除成功' })
  } catch (error: any) {
    console.error('删除对话失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '删除对话失败')
  }
}
