// API: 口语对话管理
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { successResponse, errorResponse, ErrorCodes, getApiConfig, recordActivity } from '@/lib/api-utils'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { generateSpeakReply } from '@/lib/speak-llm'
import { getUserIdFromHeaders } from '@/lib/auth-middleware'

// 请求验证
const CreateConversationSchema = z.object({
  scenarioId: z.string().min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  mode: z.enum(['press-to-talk', 'free-talk']),
  wordIds: z.array(z.string()).optional(),
})

// 创建对话
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromHeaders(request)
    if (!userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '请先登录', 401)
    }

    const body = await request.json()

    // 验证输入
    const validated = CreateConversationSchema.safeParse(body)
    if (!validated.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validated.error.errors[0]?.message || '输入验证失败'
      )
    }

    const { scenarioId, difficulty, mode, wordIds } = validated.data

    // 获取场景信息
    const scenario = await prisma.speakScenario.findUnique({
      where: { id: scenarioId },
    })

    if (!scenario) {
      return errorResponse(ErrorCodes.NOT_FOUND, '场景不存在')
    }

    // 检查难度是否支持
    const difficultyLevels = JSON.parse(scenario.difficultyLevels)
    if (!difficultyLevels.includes(difficulty)) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '该场景不支持此难度等级')
    }

    // 获取开场白
    const openingLines = JSON.parse(scenario.openingLines)
    let openingLine = openingLines[difficulty] || "Hello! Let's start our conversation."

    // 如果有关联生词，获取单词文本
    let words: string[] = []
    if (wordIds && wordIds.length > 0) {
      const wordRecords = await prisma.word.findMany({
        where: { id: { in: wordIds }, userId },
        select: { word: true },
      })
      words = wordRecords.map((w) => w.word)
    }

    // 获取 API 配置
    const apiConfigResult = await getApiConfig()

    // 如果有关联生词，让开场白融入生词
    if (words.length > 0 && apiConfigResult) {
      try {
        const systemPrompts = JSON.parse(scenario.systemPrompts)
        const systemPrompt = systemPrompts[difficulty]
        openingLine = await generateOpeningLineWithWords(
          systemPrompt,
          openingLine,
          words,
          apiConfigResult.config,
          difficulty
        )
      } catch (e) {
        // 如果生成失败，使用默认开场白
        console.error('生成开场白失败:', e)
      }
    }

    // 创建对话记录
    const conversation = await prisma.speakConversation.create({
      data: {
        userId,
        scenarioId,
        difficulty,
        mode,
        wordIds: wordIds ? JSON.stringify(wordIds) : '[]',
        messages: JSON.stringify([
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: openingLine,
            timestamp: new Date().toISOString(),
          },
        ]),
      },
    })

    // 记录活动
    await recordActivity(userId, 'add_conversation', conversation.id, 'speak_conversation', scenario.name)

    return successResponse({
      id: conversation.id,
      scenarioId,
      scenarioName: scenario.name,
      difficulty,
      mode,
      wordIds: wordIds || [],
      words,
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: openingLine,
          timestamp: new Date().toISOString(),
        },
      ],
      feedback: null,
      duration: null,
      startedAt: conversation.startedAt.toISOString(),
      endedAt: null,
    })
  } catch (error: any) {
    console.error('创建对话失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, error.message || '创建对话失败')
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
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const skip = (page - 1) * pageSize

    const [conversations, total, durationResult, feedbackCount] = await Promise.all([
      prisma.speakConversation.findMany({
        where: { userId },
        skip,
        take: pageSize,
        orderBy: { startedAt: 'desc' },
      }),
      prisma.speakConversation.count({ where: { userId } }),
      // 统计总秒数
      prisma.speakConversation.aggregate({
        where: { userId },
        _sum: { duration: true },
      }),
      // 统计已生成反馈数（feedback 不为 null）
      prisma.speakConversation.count({
        where: { userId, feedback: { not: null } },
      }),
    ])

    // 获取所有场景 ID 并查询场景名称
    const scenarioIds = [...new Set(conversations.map(c => c.scenarioId).filter(Boolean))] as string[]
    const scenarios = await prisma.speakScenario.findMany({
      where: { id: { in: scenarioIds } },
      select: { id: true, name: true },
    })
    const scenarioMap = new Map(scenarios.map(s => [s.id, s.name]))

    return successResponse({
      conversations: conversations.map((c) => ({
        id: c.id,
        scenarioId: c.scenarioId,
        scenarioName: (c.scenarioId && scenarioMap.get(c.scenarioId)) || 'Unknown',
        difficulty: c.difficulty,
        mode: c.mode,
        wordIds: JSON.parse(c.wordIds || '[]'),
        messages: JSON.parse(c.messages || '[]'),
        feedback: c.feedback ? JSON.parse(c.feedback) : null,
        duration: c.duration,
        startedAt: c.startedAt.toISOString(),
        endedAt: c.endedAt?.toISOString() || null,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      stats: {
        totalDuration: durationResult._sum.duration || 0,
        totalFeedback: feedbackCount,
      },
    })
  } catch (error: any) {
    console.error('获取对话列表失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '获取对话列表失败')
  }
}

// 生成融入生词的开场白
async function generateOpeningLineWithWords(
  systemPrompt: string,
  defaultOpening: string,
  words: string[],
  apiConfig: any,
  difficulty: string
): Promise<string> {
  // 根据难度确定开场白长度
  const lengthGuide = {
    beginner: '1 short sentence',
    intermediate: '1-2 sentences',
    advanced: '1-2 sentences'
  }

  const prompt = `${systemPrompt}

Generate an opening line that naturally includes 1-2 of these words: ${words.join(', ')}
Requirements:
- Keep it to ${lengthGuide[difficulty as keyof typeof lengthGuide] || '1-2 sentences'}
- Make it natural and friendly
- Do not emphasize the words awkwardly
- Do NOT use any emojis, icons, or special symbols. Only use plain English text.
- Output ONLY the opening line, nothing else`

  try {
    const response = await fetch(`${apiConfig.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.model || 'glm-4-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 100,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.choices[0]?.message?.content?.trim() || defaultOpening
    }
  } catch (e) {
    console.error('生成开场白失败:', e)
  }

  return defaultOpening
}
