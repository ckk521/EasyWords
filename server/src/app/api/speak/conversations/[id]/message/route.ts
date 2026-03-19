// API: 发送对话消息
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { successResponse, errorResponse, ErrorCodes, getApiConfig } from '@/lib/api-utils'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { generateSpeakReply } from '@/lib/speak-llm'

const SendMessageSchema = z.object({
  text: z.string().min(1).max(1000),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // 验证输入
    const validated = SendMessageSchema.safeParse(body)
    if (!validated.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validated.error.errors[0]?.message || '输入验证失败'
      )
    }

    const { text } = validated.data

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

    // 获取场景信息
    const scenario = await prisma.speakScenario.findUnique({
      where: { id: conversation.scenarioId },
    })

    if (!scenario) {
      return errorResponse(ErrorCodes.NOT_FOUND, '场景不存在')
    }

    // 获取 API 配置
    const apiConfig = await getApiConfig()
    if (!apiConfig) {
      return errorResponse(ErrorCodes.API_KEY_NOT_CONFIGURED, '请先在设置页面配置 API')
    }

    // 解析现有消息
    const messages = JSON.parse(conversation.messages || '[]')

    // 添加用户消息
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    messages.push(userMessage)

    // 获取场景的 system prompt
    const systemPrompts = JSON.parse(scenario.systemPrompts || '{}')
    const systemPrompt = systemPrompts[conversation.difficulty] || 'You are a helpful assistant.'

    // 获取关联生词
    const wordIds = JSON.parse(conversation.wordIds || '[]')
    let words: string[] = []
    if (wordIds.length > 0) {
      const wordRecords = await prisma.word.findMany({
        where: { id: { in: wordIds } },
        select: { word: true },
      })
      words = wordRecords.map((w) => w.word)
    }

    // 如果有关联生词，在 system prompt 中提示
    let finalSystemPrompt = systemPrompt
    if (words.length > 0) {
      finalSystemPrompt = `${systemPrompt}\n\n请尝试在对话中自然地使用以下单词：${words.join(', ')}`
    }

    // 生成 AI 回复
    const replyContent = await generateSpeakReply(
      finalSystemPrompt,
      messages.slice(0, -1), // 不包括刚添加的用户消息
      text,
      apiConfig,
      words,
      conversation.difficulty as 'beginner' | 'intermediate' | 'advanced'
    )

    // 添加 AI 消息
    const aiMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: replyContent,
      timestamp: new Date().toISOString(),
    }
    messages.push(aiMessage)

    // 更新对话
    await prisma.speakConversation.update({
      where: { id },
      data: {
        messages: JSON.stringify(messages),
      },
    })

    return successResponse({
      reply: aiMessage,
    })
  } catch (error: any) {
    console.error('发送消息失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, error.message || '发送消息失败')
  }
}
