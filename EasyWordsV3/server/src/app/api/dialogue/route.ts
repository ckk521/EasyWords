// API: 生成对话内容
import { NextRequest } from 'next/server'
// 强制动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic'

import { successResponse, errorResponse, ErrorCodes, getApiConfig, recordActivity } from '@/lib/api-utils'
import { generateDialogue } from '@/lib/llm'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { getUserIdFromHeaders } from '@/lib/auth-middleware'

// 请求验证
const GenerateDialogueSchema = z.object({
  words: z.array(z.string()).min(1).max(3),
  wordIds: z.array(z.string()).min(1).max(3),
  topic: z.string().max(10).optional(), // 用户自定义主题，最多10字
})

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromHeaders(request)
    if (!userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '请先登录', 401)
    }

    const body = await request.json()

    // 验证输入
    const validated = GenerateDialogueSchema.safeParse(body)
    if (!validated.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validated.error.errors[0]?.message || '输入验证失败'
      )
    }

    const { words, wordIds, topic } = validated.data

    // 获取 API 配置（优先使用用户自己的配置）
    const apiConfigResult = await getApiConfig(userId)
    if (!apiConfigResult) {
      return errorResponse(
        ErrorCodes.API_KEY_NOT_CONFIGURED,
        '请先在设置页面配置 API'
      )
    }

    const { config: apiConfig, isUserOwn } = apiConfigResult

    // 生成对话内容
    let dialogueResult
    try {
      dialogueResult = await generateDialogue(words, apiConfig, topic)
    } catch (error: any) {
      // 处理 API 错误
      const errorMessage = error.message || ''
      if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        const message = isUserOwn
          ? '你的大模型token已超出限额，请查看模型供应商获取更多信息'
          : 'AI 服务暂时不可用，请稍后重试'
        return errorResponse(ErrorCodes.TOKEN_LIMIT_EXCEEDED, message)
      } else if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('invalid')) {
        const message = isUserOwn
          ? '你的 API Key 无效，请检查配置'
          : 'AI 服务认证失败，请稍后重试'
        return errorResponse(ErrorCodes.INVALID_API_KEY, message)
      }
      throw error
    }

    // 保存到数据库
    const savedDialogue = await prisma.dialogue.create({
      data: {
        userId,
        scene: dialogueResult.scene,
        topic: topic || null,
        content: JSON.stringify(dialogueResult.dialogue),
        wordIds: JSON.stringify(wordIds),
        words: JSON.stringify(words),
      },
    })

    // 记录活动
    await recordActivity(userId, 'add_dialogue', savedDialogue.id, 'dialogue', words.join(', '))

    // 估算总时长
    const totalWords = dialogueResult.dialogue.reduce((sum, line) => {
      return sum + line.text.split(/\s+/).filter(w => w.length > 0).length
    }, 0)
    const estimatedDuration = Math.ceil((totalWords / 150) * 60)

    // 返回结果
    return successResponse({
      id: savedDialogue.id,
      wordIds,
      words,
      scene: dialogueResult.scene,
      topic: topic || null,
      dialogue: dialogueResult.dialogue,
      duration: estimatedDuration,
      createdAt: savedDialogue.createdAt.toISOString(),
    })
  } catch (error: any) {
    console.error('对话生成失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, error.message || '对话生成失败')
  }
}

// 获取对话列表
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromHeaders(request)
    if (!userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '请先登录', 401)
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    const skip = (page - 1) * pageSize

    const [dialogues, total] = await Promise.all([
      prisma.dialogue.findMany({
        where: { userId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dialogue.count({ where: { userId } }),
    ])

    return successResponse({
      dialogues: dialogues.map(d => ({
        id: d.id,
        scene: d.scene,
        topic: d.topic,
        words: JSON.parse(d.words),
        wordIds: JSON.parse(d.wordIds),
        dialogue: JSON.parse(d.content),
        createdAt: d.createdAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error: any) {
    console.error('获取对话列表失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '获取对话列表失败')
  }
}
