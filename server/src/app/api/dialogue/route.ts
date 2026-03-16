// API: 生成对话内容
import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes, getApiConfig } from '@/lib/api-utils'
import { generateDialogue } from '@/lib/llm'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// 请求验证
const GenerateDialogueSchema = z.object({
  words: z.array(z.string()).min(1).max(3),
  wordIds: z.array(z.string()).min(1).max(3),
  topic: z.string().max(10).optional(), // 用户自定义主题，最多10字
})

export async function POST(request: NextRequest) {
  try {
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

    // 获取 API 配置
    const apiConfig = await getApiConfig()
    if (!apiConfig) {
      return errorResponse(
        ErrorCodes.API_KEY_NOT_CONFIGURED,
        '请先在设置页面配置 API'
      )
    }

    // 生成对话内容
    const dialogueResult = await generateDialogue(words, apiConfig, topic)

    // 保存到数据库
    const savedDialogue = await prisma.dialogue.create({
      data: {
        scene: dialogueResult.scene,
        topic: topic || null,
        content: JSON.stringify(dialogueResult.dialogue),
        wordIds: JSON.stringify(wordIds),
        words: JSON.stringify(words),
      },
    })

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
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    const skip = (page - 1) * pageSize

    const [dialogues, total] = await Promise.all([
      prisma.dialogue.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dialogue.count(),
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
