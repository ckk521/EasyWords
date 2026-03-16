// API: 快速查词（仅返回基本释义，用于移动端长按查词）
import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes, getApiConfig } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { word } = body

    if (!word || typeof word !== 'string') {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '请输入单词')
    }

    const cleanWord = word.trim().toLowerCase()

    // 1. 先尝试从词典 API 获取（免费、快速）
    try {
      const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`)
      if (dictResponse.ok) {
        const data = await dictResponse.json()
        const entry = data[0]

        if (entry) {
          // 提取音标
          let phoneticUs = ''
          if (entry.phonetics) {
            for (const p of entry.phonetics) {
              if (p.text) {
                if (p.audio?.includes('us')) {
                  phoneticUs = p.text
                  break
                } else if (!phoneticUs) {
                  phoneticUs = p.text
                }
              }
            }
          }

          // 提取释义
          let englishDefinition = ''
          if (entry.meanings && entry.meanings.length > 0) {
            const meaning = entry.meanings[0]
            if (meaning.definitions && meaning.definitions.length > 0) {
              englishDefinition = meaning.definitions[0].definition
            }
          }

          if (englishDefinition) {
            // 用 LLM 快速翻译
            const apiConfig = await getApiConfig()
            let chineseDefinition = englishDefinition // 默认用英文释义

            if (apiConfig) {
              try {
                const baseURL = apiConfig.baseURL || 'https://open.bigmodel.cn/api/paas/v4/'
                const model = apiConfig.model || 'glm-4-flash'

                const response = await fetch(`${baseURL}/chat/completions`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiConfig.apiKey}`,
                  },
                  body: JSON.stringify({
                    model,
                    messages: [{
                      role: 'user',
                      content: `请用简洁的中文翻译这个英语单词的意思，只输出翻译结果，不要其他内容：\n${cleanWord}\n英文释义：${englishDefinition}`
                    }],
                    max_tokens: 100,
                    temperature: 0.3,
                  }),
                })

                if (response.ok) {
                  const data = await response.json()
                  chineseDefinition = data.choices?.[0]?.message?.content?.trim() || englishDefinition
                }
              } catch {
                // LLM 失败就用英文释义
              }
            }

            return successResponse({
              chineseDefinition,
              phoneticUs: phoneticUs || `/${cleanWord}/`,
            })
          }
        }
      }
    } catch {
      // 词典 API 失败，继续尝试 LLM
    }

    // 2. 词典 API 没有，用 LLM 快速查词
    const apiConfig = await getApiConfig()
    if (!apiConfig) {
      return errorResponse(ErrorCodes.API_KEY_NOT_CONFIGURED, '请先配置 API')
    }

    const baseURL = apiConfig.baseURL || 'https://open.bigmodel.cn/api/paas/v4/'
    const model = apiConfig.model || 'glm-4-flash'

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: `请快速给出单词 "${cleanWord}" 的中文意思和音标，格式如下：
{"chinese":"中文释义","phonetic":"/音标/"}
只输出JSON，不要其他内容。`
        }],
        max_tokens: 100,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      return errorResponse(ErrorCodes.LLM_ERROR, '查词失败')
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim() || ''

    // 解析 JSON
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return successResponse({
          chineseDefinition: parsed.chinese || '未找到释义',
          phoneticUs: parsed.phonetic || '',
        })
      }
    } catch {
      // 解析失败，直接返回文本
    }

    return successResponse({
      chineseDefinition: content || '未找到释义',
      phoneticUs: '',
    })
  } catch (error: any) {
    console.error('快速查词失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '查词失败')
  }
}
