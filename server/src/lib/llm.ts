// LLM 服务 - 词典API + 大模型补充
import { z } from 'zod'

// Schema 定义
const SentenceSchema = z.object({
  en: z.string().describe('英文例句'),
  zh: z.string().describe('中文翻译'),
})

const SynonymSchema = z.object({
  word: z.string().describe('近义词'),
  difference: z.string().describe('与原词的主要使用区别'),
  example: z.string().describe('例句'),
})

// 完整结果 Schema
const FullLookupResultSchema = z.object({
  phoneticUs: z.string().describe('美式音标'),
  phoneticUk: z.string().describe('英式音标'),
  chineseDefinition: z.string().describe('中文释义'),
  englishDefinition: z.string().describe('英文释义'),
  partOfSpeech: z.string().optional().describe('词性'),
  sentences: z.array(SentenceSchema).min(1).describe('例句'),
  synonyms: z.array(SynonymSchema).min(1).describe('近义词'),
  audioUs: z.string().optional().describe('美式发音URL'),
  audioUk: z.string().optional().describe('英式发音URL'),
})

// 部分结果 Schema（词典API返回后，大模型只需要补充这些）
const PartialLookupResultSchema = z.object({
  chineseDefinition: z.string().describe('中文释义'),
  sentences: z.array(SentenceSchema).min(1).describe('例句'),
  synonyms: z.array(SynonymSchema).min(1).describe('近义词'),
})

// 极简补充 Schema（词典API已提供例句和同义词时）
const MinimalResultSchema = z.object({
  chineseDefinition: z.string().describe('中文释义'),
})

export type LookupResult = z.infer<typeof FullLookupResultSchema>

// 词典 API 返回的丰富数据
export interface DictionaryResult {
  phoneticUs: string
  phoneticUk: string
  audioUs?: string
  audioUk?: string
  englishDefinition: string
  partOfSpeech: string
  allDefinitions: Array<{ partOfSpeech: string; definition: string; example?: string }>
  sentences: Array<{ en: string; zh: string }>  // API 自带的例句（无翻译，zh 为空）
  synonyms: string[]
  antonyms: string[]
}

// LLM 配置
export interface LLMConfig {
  apiKey: string
  baseURL: string
  model: string
}

// 默认配置
const DEFAULT_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/'
const DEFAULT_MODEL = 'glm-4-flash'

/**
 * 从 Free Dictionary API 查词 - 提取全部可用数据
 */
async function lookupFromDictionary(word: string): Promise<DictionaryResult | null> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const entry = data[0]

    if (!entry) return null

    // 提取音标和发音音频
    let phoneticUs = ''
    let phoneticUk = ''
    let audioUs = ''
    let audioUk = ''

    if (entry.phonetics) {
      for (const p of entry.phonetics) {
        if (p.text) {
          if (p.audio?.includes('us')) {
            if (!phoneticUs) phoneticUs = p.text
            if (!audioUs) audioUs = p.audio
          } else if (p.audio?.includes('uk')) {
            if (!phoneticUk) phoneticUk = p.text
            if (!audioUk) audioUk = p.audio
          } else if (!phoneticUs) {
            phoneticUs = p.text
          }
        }
      }
    }

    // 提取释义、例句、同义词
    const allDefinitions: Array<{ partOfSpeech: string; definition: string; example?: string }> = []
    const sentences: Array<{ en: string; zh: string }> = []
    const synonymsSet = new Set<string>()
    const antonymsSet = new Set<string>()
    let mainPartOfSpeech = ''
    let englishDefinition = ''

    if (entry.meanings && entry.meanings.length > 0) {
      for (const meaning of entry.meanings) {
        const pos = meaning.partOfSpeech || ''
        if (!mainPartOfSpeech) mainPartOfSpeech = pos

        // 收集同义词和反义词
        if (meaning.synonyms) {
          meaning.synonyms.forEach((s: string) => synonymsSet.add(s))
        }
        if (meaning.antonyms) {
          meaning.antonyms.forEach((a: string) => antonymsSet.add(a))
        }

        // 收集定义和例句
        if (meaning.definitions) {
          for (const def of meaning.definitions) {
            if (def.definition) {
              allDefinitions.push({
                partOfSpeech: pos,
                definition: def.definition,
                example: def.example,
              })

              // 第一个定义作为主释义
              if (!englishDefinition) {
                englishDefinition = def.definition
              }

              // 收集例句
              if (def.example) {
                sentences.push({ en: def.example, zh: '' })
              }
            }

            // 定义级别的同义词
            if (def.synonyms) {
              def.synonyms.forEach((s: string) => synonymsSet.add(s))
            }
          }
        }
      }
    }

    // 只有当有有效数据时才返回
    if (!phoneticUs && !englishDefinition) {
      return null
    }

    return {
      phoneticUs: phoneticUs || `/${word}/`,
      phoneticUk: phoneticUk || phoneticUs || `/${word}/`,
      audioUs: audioUs || undefined,
      audioUk: audioUk || undefined,
      englishDefinition: englishDefinition || '',
      partOfSpeech: mainPartOfSpeech,
      allDefinitions: allDefinitions.slice(0, 5), // 最多5个定义
      sentences: sentences.slice(0, 3), // 最多3个例句
      synonyms: Array.from(synonymsSet).slice(0, 5), // 最多5个同义词
      antonyms: Array.from(antonymsSet).slice(0, 3), // 最多3个反义词
    }
  } catch (error) {
    console.error('词典API查询失败:', error)
    return null
  }
}

/**
 * 调用 OpenAI 兼容的 Chat Completions API
 */
async function callChatAPI(
  config: LLMConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
): Promise<string> {
  const baseURL = config.baseURL || DEFAULT_BASE_URL
  const model = config.model || DEFAULT_MODEL

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 8192,  // 增加最大 token 数
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 调用失败: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

/**
 * 修复 LLM 返回的数据格式问题
 */
function fixLLMData(data: any): any {
  if (!data || typeof data !== 'object') return data

  console.log('[fixLLMData] 输入数据:', JSON.stringify(data).substring(0, 300))

  // 修复 sentences
  if (Array.isArray(data.sentences)) {
    data.sentences = data.sentences.map((s: any) => {
      if (!s || typeof s !== 'object') return s
      // 修复空键名问题 {"": "xxx"} -> {"en": "xxx"}
      if (s[''] && !s.en) {
        s.en = s['']
        delete s['']
      }
      return s
    }).filter((s: any) => s && s.en) // 过滤无效例句
  }

  // 修复 synonyms
  if (Array.isArray(data.synonyms)) {
    data.synonyms = data.synonyms.filter((s: any) => s && s.word)
  }

  console.log('[fixLLMData] 输出数据 sentences:', data.sentences?.length, 'synonyms:', data.synonyms?.length)

  return data
}

/**
 * 修复 LLM 返回的常见 JSON 格式错误
 */
function fixCommonJSONErrors(jsonStr: string): string {
  // 修复 "key"value" 格式（缺少冒号）
  // 例如: "exampleThe glass broke" -> "example": "The glass broke"
  let fixed = jsonStr
    // 修复 "key" 后面直接跟值的情况（缺少冒号和引号）
    .replace(/"([a-zA-Z]+)"([A-Za-z\u4e00-\u9fa5])/g, '"$1": "$2')
    // 修复 "key":"value 后面缺少结束引号的情况
    .replace(/"([a-zA-Z]+)":\s*([^",\]}]+)(?=[,}\]])/g, '"$1": "$2"')

  return fixed
}

/**
 * 安全解析 JSON - 增强版
 */
function safeParseJSON(text: string): any {
  // 清理文本
  let cleanText = text.trim()

  // 提取 markdown 代码块中的 JSON
  const jsonMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  let jsonStr = jsonMatch ? jsonMatch[1].trim() : cleanText

  // 尝试找到 JSON 对象
  if (!jsonStr.startsWith('{')) {
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      jsonStr = objectMatch[0]
    }
  }

  // 先修复常见错误
  jsonStr = fixCommonJSONErrors(jsonStr)

  // 尝试直接解析
  try {
    const data = JSON.parse(jsonStr)
    return fixLLMData(data)
  } catch (e) {
    console.log('[JSON解析] 第一次解析失败，尝试修复:', (e as Error).message)
  }

  // 尝试更激进的修复
  try {
    // 移除所有控制字符
    let fixed = jsonStr.replace(/[\x00-\x1F\x7F]/g, '')
    const data = JSON.parse(fixed)
    return fixLLMData(data)
  } catch {}

  // 最后的兜底：使用正则提取
  console.log('[JSON解析] 尝试正则提取')
  const result: any = {}

  // 提取 chineseDefinition
  const defMatch = jsonStr.match(/"chineseDefinition"\s*:\s*"([^"]*)"/)
  if (defMatch) result.chineseDefinition = defMatch[1]

  // 提取 sentences - 改进的提取方式
  const enMatches = [...jsonStr.matchAll(/"en"\s*:\s*"([^"]*)"/g)]
  const zhMatches = [...jsonStr.matchAll(/"zh"\s*:\s*"([^"]*)"/g)]
  if (enMatches.length > 0) {
    result.sentences = enMatches.map((m, i) => ({
      en: m[1],
      zh: zhMatches[i]?.[1] || ''
    }))
  }

  // 提取 synonyms - 改进的提取方式
  const wordMatches = [...jsonStr.matchAll(/"word"\s*:\s*"([^"]*)"/g)]
  const diffMatches = [...jsonStr.matchAll(/"difference"\s*:\s*"([^"]*)"/g)]
  const exMatches = [...jsonStr.matchAll(/"example"\s*:\s*"([^"]*)"/g)]
  if (wordMatches.length > 0) {
    result.synonyms = wordMatches.map((m, i) => ({
      word: m[1],
      difference: diffMatches[i]?.[1] || '',
      example: exMatches[i]?.[1] || ''
    }))
  }

  // 提取其他字段
  const phoneticUsMatch = jsonStr.match(/"phoneticUs"\s*:\s*"([^"]+)"/)
  if (phoneticUsMatch) result.phoneticUs = phoneticUsMatch[1]

  const phoneticUkMatch = jsonStr.match(/"phoneticUk"\s*:\s*"([^"]+)"/)
  if (phoneticUkMatch) result.phoneticUk = phoneticUkMatch[1]

  const englishDefinitionMatch = jsonStr.match(/"englishDefinition"\s*:\s*"([^"]+)"/)
  if (englishDefinitionMatch) result.englishDefinition = englishDefinitionMatch[1]

  if (Object.keys(result).length > 0) {
    console.log('[JSON解析] 正则提取成功, sentences:', result.sentences?.length, 'synonyms:', result.synonyms?.length)
    return fixLLMData(result)
  }

  console.error('[JSON解析失败] 原始文本:', jsonStr.substring(0, 500))
  throw new Error('无法解析 JSON 响应')
}

/**
 * 查词 - 词典API + 大模型补充
 */
export async function lookupWord(word: string, config: LLMConfig): Promise<LookupResult> {
  const startTime = Date.now()

  // 1. 先用词典API查询基础信息（快速、免费）
  const dictStart = Date.now()
  const dictResult = await lookupFromDictionary(word)
  console.log(`[词典API] 耗时: ${Date.now() - dictStart}ms`)

  // 2. 用大模型生成内容
  const llmStart = Date.now()

  if (dictResult && dictResult.englishDefinition) {
    // 有词典数据，让大模型补充中文释义、翻译例句、解释同义词
    const hasSentences = dictResult.sentences.length > 0
    const hasSynonyms = dictResult.synonyms.length > 0

    // 构建提示词，利用词典数据
    const sentencesPrompt = hasSentences
      ? `例句（请翻译成中文）：\n${dictResult.sentences.map((s, i) => `${i + 1}. ${s.en}`).join('\n')}`
      : '请生成3个常用例句（英文+中文翻译）'

    const synonymsPrompt = hasSynonyms
      ? `同义词：${dictResult.synonyms.join(', ')}\n请为每个英文同义词说明与原词的使用区别并提供例句`
      : '请提供3个英文近义词并说明区别'

    const prompt = `为单词"${word}"生成以下内容：
英文释义：${dictResult.englishDefinition}
词性：${dictResult.partOfSpeech}

${sentencesPrompt}

${synonymsPrompt}

【重要】返回简洁JSON格式：
{"chineseDefinition":"中文释义","sentences":[{"en":"英文例句","zh":"中文翻译"}],"synonyms":[{"word":"英文近义词","difference":"中文说明区别","example":"英文例句"}]}
注意：synonyms.word 必须是英文单词，不能是中文翻译！sentences 至少3个，synonyms 至少3个。
只返回JSON，不要额外说明。`

    const text = await callChatAPI(config, [{ role: 'user', content: prompt }])
    console.log(`[LLM调用] 耗时: ${Date.now() - llmStart}ms`)
    const llmResult = safeParseJSON(text)
    const parsed = PartialLookupResultSchema.parse(llmResult)

    console.log(`[总耗时] ${Date.now() - startTime}ms`)
    // 合并结果
    return {
      phoneticUs: dictResult.phoneticUs,
      phoneticUk: dictResult.phoneticUk,
      englishDefinition: dictResult.englishDefinition,
      partOfSpeech: dictResult.partOfSpeech,
      chineseDefinition: parsed.chineseDefinition,
      sentences: parsed.sentences,
      synonyms: parsed.synonyms,
      audioUs: dictResult.audioUs,
      audioUk: dictResult.audioUk,
    }
  } else {
    // 无词典数据，大模型生成全部
    const prompt = `为单词"${word}"生成词典信息：音标、中英文释义、3个例句、3个英文近义词。
【重要】返回简洁JSON格式：
{"phoneticUs":"/音标/","phoneticUk":"/音标/","chineseDefinition":"中文释义","englishDefinition":"英文释义","sentences":[{"en":"英文例句","zh":"中文翻译"}],"synonyms":[{"word":"英文近义词","difference":"中文说明区别","example":"英文例句"}]}
注意：synonyms.word 必须是英文单词，不能是中文翻译！sentences 和 synonyms 都至少3个。
只返回JSON，不要额外说明。`

    const text = await callChatAPI(config, [{ role: 'user', content: prompt }])
    const llmResult = safeParseJSON(text)
    return FullLookupResultSchema.parse(llmResult)
  }
}

/**
 * 生成文章
 */
export async function generateArticle(
  words: string[],
  type: 'news' | 'story',
  length: 'short' | 'medium' | 'long',
  config: LLMConfig,
  topic?: string
): Promise<string> {
  const baseURL = config.baseURL || DEFAULT_BASE_URL
  const model = config.model || DEFAULT_MODEL

  const lengthMap = {
    short: '约200词',
    medium: '约500词',
    long: '约800词',
  }

  const typeMap = {
    news: '新闻',
    story: '故事',
  }

  const topicText = topic ? `\n文章主题：${topic}` : ''

  const prompt = `你是一位英语教育内容创作者。请根据以下单词列表，创作一篇【${typeMap[type]}】。${topicText}

要求：
1. 文章长度${lengthMap[length]}
2. 自然地融入所有给定单词，不要生硬堆砌
3. 内容连贯、有逻辑，适合中级英语学习者阅读
4. 难度适中，句式不要过于复杂
5. **重要**：每个给定的单词在文章中出现时，用双星号包裹，如 **word** 格式

单词列表：${words.join(', ')}

请先输出一个简短的英文标题（一行），然后空一行，再输出文章内容。格式如下：
Title: [英文标题]

[文章内容]`

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 8192,  // 增加最大 token 数
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 调用失败: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const fullText = data.choices[0]?.message?.content || ''

  // 解析标题和内容
  const titleMatch = fullText.match(/Title:\s*(.+?)(?:\n|$)/i)
  const title = titleMatch ? titleMatch[1].trim() : ''
  const content = fullText.replace(/Title:\s*.+?\n\n?/i, '').trim()

  return { title, content }
}

/**
 * 流式生成文章
 */
export async function* generateArticleStream(
  words: string[],
  type: 'news' | 'story',
  length: 'short' | 'medium' | 'long',
  config: LLMConfig,
  topic?: string
): AsyncGenerator<string> {
  const baseURL = config.baseURL || DEFAULT_BASE_URL
  const model = config.model || DEFAULT_MODEL

  const lengthMap = {
    short: '约200词',
    medium: '约500词',
    long: '约800词',
  }

  const typeMap = {
    news: '新闻',
    story: '故事',
  }

  const topicText = topic ? `\n文章主题：${topic}` : ''

  const prompt = `你是一位英语教育内容创作者。请根据以下单词列表，创作一篇【${typeMap[type]}】。${topicText}

要求：
1. 文章长度${lengthMap[length]}
2. 自然地融入所有给定单词，不要生硬堆砌
3. 内容连贯、有逻辑，适合中级英语学习者阅读
4. 难度适中，句式不要过于复杂
5. **重要**：每个给定的单词在文章中出现时，用双星号包裹，如 **word** 格式

单词列表：${words.join(', ')}

请先输出一个简短的英文标题（一行），然后空一行，再输出文章内容。格式如下：
Title: [英文标题]

[文章内容]`

  // 先发送文章信息
  yield `data: ${JSON.stringify({
    type: 'info',
    data: { words, type, length, topic }
  })}\n\n`

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 8192,  // 增加最大 token 数
      stream: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`API 调用失败: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('无法获取响应流')
  }

  const decoder = new TextDecoder()
  let fullContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const json = JSON.parse(data)
          const content = json.choices?.[0]?.delta?.content
          if (content) {
            fullContent += content
            yield `data: ${JSON.stringify({ type: 'chunk', content })}\n\n`
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  }

  // 发送完成事件，解析标题和内容
  const titleMatch = fullContent.match(/Title:\s*(.+?)(?:\n|$)/i)
  const title = titleMatch ? titleMatch[1].trim() : ''
  const content = fullContent.replace(/Title:\s*.+?\n\n?/i, '').trim()

  yield `data: ${JSON.stringify({ type: 'complete', title, content })}\n\n`
}

/**
 * 流式查词 - 使用异步迭代器
 */
export async function* lookupWordStream(
  word: string,
  config: LLMConfig
): AsyncGenerator<string> {
  // 1. 先获取词典数据
  const dictResult = await lookupFromDictionary(word)

  // 发送丰富的词典数据
  yield `data: ${JSON.stringify({
    type: 'dictionary',
    data: dictResult ? {
      phoneticUs: dictResult.phoneticUs,
      phoneticUk: dictResult.phoneticUk,
      audioUs: dictResult.audioUs,
      audioUk: dictResult.audioUk,
      englishDefinition: dictResult.englishDefinition,
      partOfSpeech: dictResult.partOfSpeech,
      // 发送 API 自带的例句（用户可以先看到）
      sentences: dictResult.sentences,
      // 发送 API 自带的同义词
      synonyms: dictResult.synonyms,
      antonyms: dictResult.antonyms,
    } : null
  })}\n\n`

  // 2. 准备 LLM prompt - 根据词典数据情况调整
  let prompt: string

  if (dictResult?.englishDefinition) {
    const hasSentences = dictResult.sentences.length > 0
    const hasSynonyms = dictResult.synonyms.length > 0

    const sentencesPrompt = hasSentences
      ? `例句（请翻译成中文）：\n${dictResult.sentences.map((s, i) => `${i + 1}. ${s.en}`).join('\n')}`
      : '请生成3个常用例句（英文+中文翻译）'

    const synonymsPrompt = hasSynonyms
      ? `同义词：${dictResult.synonyms.join(', ')}\n请为每个英文同义词说明与原词的使用区别并提供例句`
      : '请提供3个英文近义词并说明区别'

    prompt = `为单词"${word}"生成以下内容：
英文释义：${dictResult.englishDefinition}
词性：${dictResult.partOfSpeech}

${sentencesPrompt}

${synonymsPrompt}

【重要】返回简洁JSON格式：
{"chineseDefinition":"中文释义","sentences":[{"en":"英文例句","zh":"中文翻译"}],"synonyms":[{"word":"英文近义词","difference":"中文说明区别","example":"英文例句"}]}
注意：synonyms.word 必须是英文单词，不能是中文翻译！sentences 至少3个，synonyms 随机3-5个。
只返回JSON，不要额外说明。`
  } else {
    prompt = `为单词"${word}"生成词典信息：音标、中英文释义、3个例句、3-5个英文近义词。
【重要】返回简洁JSON格式：
{"phoneticUs":"/音标/","phoneticUk":"/音标/","chineseDefinition":"中文释义","englishDefinition":"英文释义","sentences":[{"en":"英文例句","zh":"中文翻译"}],"synonyms":[{"word":"英文近义词","difference":"中文说明区别","example":"英文例句"}]}
注意：synonyms.word 必须是英文单词，不能是中文翻译！sentences 3个，synonyms 随机3-5个。
只返回JSON，不要额外说明。`
  }

  const baseURL = config.baseURL || DEFAULT_BASE_URL
  const model = config.model || DEFAULT_MODEL

  // 3. 创建流式请求
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 8192,  // 增加最大 token 数
      stream: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`API 调用失败: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('无法获取响应流')
  }

  const decoder = new TextDecoder()
  let contentBuffer = ''  // 累积 LLM 返回的纯文本内容

  // 4. 读取流
  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      // 流结束，解析完整 JSON 并发送最终结果
      try {
        console.log('[流式输出] contentBuffer 长度:', contentBuffer.length)
        console.log('[流式输出] contentBuffer 最后500字符:', contentBuffer.slice(-500))
        const parsed = safeParseJSON(contentBuffer)
        console.log('[流式输出] 解析成功, synonyms:', parsed.synonyms?.length)
        const finalData = dictResult
          ? {
              type: 'complete',
              data: {
                phoneticUs: dictResult.phoneticUs,
                phoneticUk: dictResult.phoneticUk,
                audioUs: dictResult.audioUs,
                audioUk: dictResult.audioUk,
                englishDefinition: dictResult.englishDefinition,
                partOfSpeech: dictResult.partOfSpeech,
                ...parsed
              }
            }
          : { type: 'complete', data: parsed }
        yield `data: ${JSON.stringify(finalData)}\n\n`
      } catch (e: any) {
        console.error('[流式输出] 解析失败:', e.message)
        yield `data: ${JSON.stringify({ type: 'error', message: '解析失败: ' + e.message })}\n\n`
      }
      return
    }

    // 累积文本
    const chunk = decoder.decode(value, { stream: true })

    // 转发 SSE 格式的数据并累积内容
    const lines = chunk.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const json = JSON.parse(data)
          const content = json.choices?.[0]?.delta?.content
          if (content) {
            contentBuffer += content  // 累积内容
            yield `data: ${JSON.stringify({ type: 'chunk', content })}\n\n`
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  }
}

/**
 * 验证 API Key
 */
export async function verifyApiKey(config: LLMConfig): Promise<boolean> {
  try {
    const baseURL = config.baseURL || DEFAULT_BASE_URL
    const model = config.model || DEFAULT_MODEL

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: '请回复"ok"' }],
        max_tokens: 10,
      }),
    })

    return response.ok
  } catch (error) {
    console.error('API 验证失败:', error)
    return false
  }
}

/**
 * 翻译段落
 */
export async function translateParagraph(
  paragraph: string,
  config: LLMConfig
): Promise<string> {
  const prompt = `请将以下英文段落翻译成流畅的中文。只输出翻译结果，不要添加任何解释或说明。

英文段落：
${paragraph}`

  const text = await callChatAPI(config, [{ role: 'user', content: prompt }])
  return text.trim()
}
