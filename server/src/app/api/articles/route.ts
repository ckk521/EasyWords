// API: 文章列表 / 生成文章（支持流式输出）
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, ErrorCodes, getApiConfig } from '@/lib/api-utils'
import { GenerateArticleSchema } from '@/lib/schemas'
import { generateArticle, generateArticleStream } from '@/lib/llm'

/**
 * 清理文章中的高亮标记，只保留真正的生词
 * @param content 文章内容
 * @param validWords 有效的生词列表（小写）
 */
function cleanHighlights(content: string, validWords: string[]): string {
  // 将有效单词转为小写 Set，便于匹配
  const validSet = new Set(validWords.map(w => w.toLowerCase()))

  // 匹配所有 **word** 格式的标记
  return content.replace(/\*\*([^*]+)\*\*/g, (match, word) => {
    const lowerWord = word.toLowerCase().trim()
    // 如果是有效生词，保留标记；否则移除标记
    if (validSet.has(lowerWord)) {
      return match
    }
    // 检查是否是有效生词的变形（如 wielded -> wield）
    for (const validWord of validSet) {
      if (lowerWord.startsWith(validWord) || validWord.startsWith(lowerWord)) {
        // 可能是变形词，保留
        return match
      }
    }
    // 不是有效生词，移除 ** 标记
    console.log(`[清理高亮] 移除非生词标记: ${word}`)
    return word
  })
}

// 获取文章列表（支持分页）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '5', 10)

    const skip = (page - 1) * pageSize

    // 获取总数
    const total = await prisma.article.count()

    // 获取分页数据
    const articles = await prisma.article.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    })

    // 获取每篇文章的单词信息
    const articlesWithWords = await Promise.all(
      articles.map(async (article) => {
        const wordIds: string[] = JSON.parse(article.wordIds)
        const words = await prisma.word.findMany({
          where: { id: { in: wordIds } },
          select: { id: true, word: true },
        })
        return {
          id: article.id,
          title: article.title,
          type: article.type,
          length: article.length,
          createdAt: article.createdAt.toISOString(),
          wordCount: wordIds.length,
          words,
          preview: article.content.slice(0, 150) + (article.content.length > 150 ? '...' : ''),
        }
      })
    )

    return successResponse({
      articles: articlesWithWords,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      }
    })
  } catch (error) {
    console.error('获取文章列表失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '获取文章列表失败')
  }
}

// 生成文章
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证输入
    const validated = GenerateArticleSchema.safeParse(body)
    if (!validated.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        validated.error.errors[0]?.message || '输入验证失败'
      )
    }

    const { wordIds, type, length, topic } = validated.data

    // 获取单词
    const words = await prisma.word.findMany({
      where: { id: { in: wordIds } },
    })

    if (words.length === 0) {
      return errorResponse(ErrorCodes.NOT_FOUND, '未找到选中的单词')
    }

    // 获取 API 配置
    const apiConfig = await getApiConfig()
    if (!apiConfig) {
      return errorResponse(
        ErrorCodes.API_KEY_NOT_CONFIGURED,
        '请先在设置页面配置 API'
      )
    }

    // 检查是否请求流式输出
    const acceptHeader = request.headers.get('accept') || ''
    const isStream = acceptHeader.includes('text/event-stream') || body.stream === true

    if (isStream) {
      // 流式输出
      const wordTexts = words.map((w) => w.word)
      const wordData = words.map((w) => ({ id: w.id, word: w.word }))

      const encoder = new TextEncoder()
      let fullContent = ''
      let articleTitle = ''

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of generateArticleStream(wordTexts, type, length, apiConfig, topic)) {
              controller.enqueue(encoder.encode(chunk))

              // 捕获完整内容 - 使用更健壮的解析方式
              if (chunk.includes('"type":"chunk"')) {
                try {
                  const jsonMatch = chunk.match(/data:\s*(\{.*\})/);
                  if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[1]);
                    if (parsed.content) fullContent += parsed.content;
                  }
                } catch { /* 忽略解析错误 */ }
              } else if (chunk.includes('"type":"complete"')) {
                try {
                  const jsonMatch = chunk.match(/data:\s*(\{.*\})/);
                  if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[1]);
                    if (parsed.title) articleTitle = parsed.title;
                    if (parsed.content) fullContent = parsed.content;
                  }
                } catch { /* 忽略解析错误 */ }
              }
            }

            // 清理错误的高亮标记，只保留真正的生词
            const cleanedContent = cleanHighlights(fullContent, wordTexts)

            // 保存文章
            const article = await prisma.article.create({
              data: {
                title: articleTitle,
                content: cleanedContent,
                wordIds: JSON.stringify(wordIds),
                type,
                length,
              },
            })

            // 发送保存完成事件
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'saved',
              data: {
                id: article.id,
                wordIds,
                words: wordData,
                type,
                length,
                createdAt: article.createdAt.toISOString()
              }
            })}\n\n`))

            controller.close()
          } catch (error) {
            controller.error(error)
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
    const wordTexts = words.map((w) => w.word)
    const { title, content } = await generateArticle(wordTexts, type, length, apiConfig, topic)

    // 清理错误的高亮标记，只保留真正的生词
    const cleanedContent = cleanHighlights(content, wordTexts)

    // 保存文章
    const article = await prisma.article.create({
      data: {
        title,
        content: cleanedContent,
        wordIds: JSON.stringify(wordIds),
        type,
        length,
      },
    })

    return successResponse({
      id: article.id,
      title: article.title,
      content: article.content,
      wordIds: JSON.parse(article.wordIds),
      type: article.type,
      length: article.length,
      createdAt: article.createdAt.toISOString(),
    })
  } catch (error: any) {
    console.error('生成文章失败:', error)

    if (error.message?.includes('API') || error.message?.includes('令牌')) {
      return errorResponse(ErrorCodes.LLM_ERROR, 'AI 服务暂时不可用，请检查 API 配置')
    }

    return errorResponse(ErrorCodes.UNKNOWN, '生成文章失败')
  }
}
