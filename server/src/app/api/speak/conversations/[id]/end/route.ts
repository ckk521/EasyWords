// API: 结束对话并生成反馈
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { successResponse, errorResponse, ErrorCodes, getApiConfig } from '@/lib/api-utils'
import { prisma } from '@/lib/db'
import { generateSpeakFeedback } from '@/lib/speak-llm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 获取对话
    const conversation = await prisma.speakConversation.findUnique({
      where: { id },
    })

    if (!conversation) {
      return errorResponse(ErrorCodes.NOT_FOUND, '对话不存在')
    }

    if (conversation.endedAt) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '对话已结束')
    }

    // 获取 API 配置
    const apiConfig = await getApiConfig()
    if (!apiConfig) {
      return errorResponse(ErrorCodes.API_KEY_NOT_CONFIGURED, '请先在设置页面配置 API')
    }

    // 解析消息
    const messages = JSON.parse(conversation.messages || '[]')

    // 生成反馈
    const feedback = await generateSpeakFeedback(messages, apiConfig)

    // 计算对话时长
    const startTime = new Date(conversation.startedAt).getTime()
    const endTime = Date.now()
    const duration = Math.floor((endTime - startTime) / 1000)

    // 更新反馈统计
    feedback.summary.duration = duration

    // 更新对话
    await prisma.speakConversation.update({
      where: { id },
      data: {
        endedAt: new Date(),
        duration,
        feedback: JSON.stringify(feedback),
      },
    })

    // 如果有关联生词，更新复习时间
    const wordIds = JSON.parse(conversation.wordIds || '[]')
    if (wordIds.length > 0) {
      await prisma.word.updateMany({
        where: { id: { in: wordIds } },
        data: {
          lastReviewedAt: new Date(),
        },
      })
    }

    return successResponse({
      feedback,
      duration,
    })
  } catch (error: any) {
    console.error('结束对话失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, error.message || '结束对话失败')
  }
}
