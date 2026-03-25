// API: 查词 (支持流式输出)
import { NextRequest } from 'next/server'
// 强制动态渲染，避免构建时预渲染
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { successResponse, errorResponse, ErrorCodes, getApiConfig } from '@/lib/api-utils'
import { LookupWordSchema } from '@/lib/schemas'
import { lookupWord, lookupWordStream } from '@/lib/llm'
import { getUserIdFromHeaders } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromHeaders(request)
    if (!userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, '请先登录', 401)
    }

    const body = await request.json()

    // 验证输入
    const validated = LookupWordSchema.safeParse(body)
    if (!validated.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validated.error.errors[0]?.message || '输入验证失败'
      )
    }

    const { word } = validated.data

    // 检查是否请求流式输出
    const acceptHeader = request.headers.get('accept') || ''
    const isStream = acceptHeader.includes('text/event-stream') || body.stream === true

    // 检查是否已在当前用户的生词本中
    const existingWord = await prisma.word.findFirst({
      where: { word: word.toLowerCase(), userId },
    })

    if (existingWord) {
      const wordData = {
        id: existingWord.id,
        word: existingWord.word,
        phoneticUs: existingWord.phoneticUs,
        phoneticUk: existingWord.phoneticUk,
        chineseDefinition: existingWord.chineseDefinition,
        englishDefinition: existingWord.englishDefinition,
        partOfSpeech: existingWord.partOfSpeech,
        audioUs: existingWord.audioUs,
        audioUk: existingWord.audioUk,
        antonyms: existingWord.antonyms ? JSON.parse(existingWord.antonyms) : [],
        sentences: JSON.parse(existingWord.sentences),
        synonyms: JSON.parse(existingWord.synonyms),
        createdAt: existingWord.createdAt.toISOString(),
        lastReviewedAt: existingWord.lastReviewedAt?.toISOString() || null,
        reviewCount: existingWord.reviewCount,
        isSaved: true,
      }

      if (isStream) {
        // 流式请求：返回 SSE 格式
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', data: wordData })}\n\n`))
            controller.close()
          },
        })
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
      }

      // 非流式请求：返回普通 JSON
      return successResponse(wordData)
    }

    // 获取 API 配置（优先使用用户自己的配置）
    const apiConfigResult = await getApiConfig(userId)
    if (!apiConfigResult) {
      return errorResponse(
        ErrorCodes.API_KEY_NOT_CONFIGURED,
        '请先在设置页面配置 API'
      )
    }

    const { config: apiConfig, isUserOwn } = apiConfigResult

    if (isStream) {
      // 流式输出 - 使用自定义 ReadableStream
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of lookupWordStream(word, apiConfig)) {
              controller.enqueue(encoder.encode(chunk))
            }
            controller.close()
          } catch (error: any) {
            // 处理 API 错误
            const errorMessage = error.message || ''
            if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
              const message = isUserOwn
                ? '你的大模型token已超出限额，请查看模型供应商获取更多信息'
                : 'AI 服务暂时不可用，请稍后重试'
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`))
            } else if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('invalid')) {
              const message = isUserOwn
                ? '你的 API Key 无效，请检查配置'
                : 'AI 服务认证失败，请稍后重试'
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`))
            } else {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: '查词失败，请稍后重试' })}\n\n`))
            }
            controller.close()
          }
        },
      })
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // 非流式输出（原有逻辑）
    let result
    try {
      result = await lookupWord(word, apiConfig)
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

    // 返回查词结果（未保存）
    return successResponse({
      id: `temp-${Date.now()}`, // 临时 ID
      word: word.toLowerCase(),
      ...result,
      createdAt: new Date().toISOString(),
      lastReviewedAt: null,
      reviewCount: 0,
      isSaved: false,
    })
  } catch (error: any) {
    console.error('查词失败:', error)

    if (error.message?.includes('API') || error.message?.includes('令牌')) {
      return errorResponse(ErrorCodes.LLM_ERROR, 'AI 服务暂时不可用，请检查 API 配置')
    }

    return errorResponse(ErrorCodes.UNKNOWN, '查词失败，请稍后重试')
  }
}
