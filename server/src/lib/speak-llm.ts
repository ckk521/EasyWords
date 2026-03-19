// 口语陪练 LLM 服务
import { LLMConfig } from './llm'

const DEFAULT_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/'
const DEFAULT_MODEL = 'glm-4-flash'

type Difficulty = 'beginner' | 'intermediate' | 'advanced'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Feedback {
  grammarErrors: Array<{
    userSentence: string
    correctedSentence: string
    errorType: string
    explanation: string
  }>
  betterExpressions: Array<{
    userSentence: string
    suggestedExpression: string
    reason: string
  }>
  goodExpressions: Array<{
    userSentence: string
    praise: string  // 正向鼓励，说明为什么说得好
  }>
  summary: {
    totalMessages: number
    userMessages: number
    duration: number
    errorCount: number
  }
}

// 难度对应的回复长度规则
const DIFFICULTY_RULES: Record<Difficulty, { sentences: string; description: string }> = {
  beginner: {
    sentences: '1-2 sentences',
    description: 'Use simple vocabulary and short sentences. Speak slowly and clearly.'
  },
  intermediate: {
    sentences: '2-3 sentences',
    description: 'Use moderate vocabulary and natural expressions.'
  },
  advanced: {
    sentences: '1-5 sentences',
    description: 'Use sophisticated vocabulary and complex sentence structures when appropriate.'
  }
}

/**
 * 生成对话回复
 */
export async function generateSpeakReply(
  systemPrompt: string,
  history: Message[],
  userMessage: string,
  config: LLMConfig,
  words: string[] = [],
  difficulty: Difficulty = 'intermediate'
): Promise<string> {
  const baseURL = config.baseURL || DEFAULT_BASE_URL
  const model = config.model || DEFAULT_MODEL

  const rules = DIFFICULTY_RULES[difficulty]

  // 构建增强的 system prompt
  let enhancedSystemPrompt = systemPrompt

  // 添加回复长度规则
  enhancedSystemPrompt += `\n\n【重要规则】`
  enhancedSystemPrompt += `\n- Your response MUST be exactly ${rules.sentences}. Do not exceed this limit.`
  enhancedSystemPrompt += `\n- ${rules.description}`
  enhancedSystemPrompt += `\n- Do NOT use any emojis, icons, or special symbols. Only use plain English text.`

  // 添加引导用户多说话的规则
  enhancedSystemPrompt += `\n\n【引导对话规则】`
  enhancedSystemPrompt += `\n- ALWAYS end your response with an open-ended follow-up question to encourage the learner to speak more.`
  enhancedSystemPrompt += `\n- Ask about their opinions, experiences, preferences, or details related to the topic.`
  enhancedSystemPrompt += `\n- If they give a short answer, gently encourage elaboration (e.g., "That's interesting! Can you tell me more about that?").`
  enhancedSystemPrompt += `\n- Keep the conversation flowing naturally by showing genuine interest in what they say.`
  enhancedSystemPrompt += `\n- Occasionally share brief relevant experiences to build rapport, then ask about theirs.`

  // 添加生词使用规则
  if (words.length > 0) {
    enhancedSystemPrompt += `\n\n【生词使用】`
    enhancedSystemPrompt += `\n- VOCABULARY WORDS TO USE: ${words.join(', ')}`
    enhancedSystemPrompt += `\n- You MUST use at least 1 of these vocabulary words within every 2-3 turns of conversation.`
    enhancedSystemPrompt += `\n- Try to use 1 vocabulary word in your current response if you haven't used one recently.`
    enhancedSystemPrompt += `\n- Use the words naturally in context, do not force them awkwardly.`
  }

  // 构建消息列表
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: enhancedSystemPrompt },
  ]

  // 添加历史消息（最近 10 轮）
  const recentHistory = history.slice(-20)
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })
  }

  messages.push({ role: 'user', content: userMessage })

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 300, // 限制输出长度
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
 * 生成学习反馈
 */
export async function generateSpeakFeedback(
  messages: Message[],
  config: LLMConfig
): Promise<Feedback> {
  const baseURL = config.baseURL || DEFAULT_BASE_URL
  const model = config.model || DEFAULT_MODEL

  // 提取用户消息
  const userMessages = messages.filter((m) => m.role === 'user')

  if (userMessages.length === 0) {
    return {
      grammarErrors: [],
      betterExpressions: [],
      goodExpressions: [],
      summary: {
        totalMessages: messages.length,
        userMessages: 0,
        duration: 0,
        errorCount: 0,
      },
    }
  }

  const prompt = `你是一位专业的英语口语教练。请分析以下用户的英语口语表达，给出学习反馈。

用户说的话：
${userMessages.map((m, i) => `${i + 1}. ${m.content}`).join('\n')}

请返回 JSON 格式的反馈，包含：
1. grammarErrors: 语法错误列表
2. betterExpressions: 更好的表达建议列表
3. goodExpressions: 说得好的句子列表（正向鼓励）

返回格式：
{
  "grammarErrors": [
    {
      "userSentence": "用户的原句（英文）",
      "correctedSentence": "正确的句子（英文）",
      "errorType": "错误类型（中文，如：时态错误、冠词缺失等）",
      "explanation": "中文解释错误原因和改正方法"
    }
  ],
  "betterExpressions": [
    {
      "userSentence": "用户的原句（英文）",
      "suggestedExpression": "更好的表达方式（英文）",
      "reason": "用中文说明为什么这个表达更地道、更自然"
    }
  ],
  "goodExpressions": [
    {
      "userSentence": "用户的原句（英文）",
      "praise": "用中文说明为什么这句话说得好，鼓励用户（如：用词准确、句式地道、表达自然等）"
    }
  ]
}

【重要规则】
- 每个用户句子都必须出现在 goodExpressions、grammarErrors 或 betterExpressions 中至少一个
- 对于没有语法错误且表达自然的句子，必须放入 goodExpressions 给予正向鼓励
- 语法错误最多列出 3 个
- 更好的表达建议最多列出 2 个
- goodExpressions 应包含所有说得好的句子
- 只返回 JSON，不要其他说明
- praise 字段用中文写，具体说明优点`

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    throw new Error(`API 调用失败: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content || ''

  console.log('[generateSpeakFeedback] LLM 返回:', content.substring(0, 500))

  // 解析 JSON
  try {
    // 提取 JSON - 清理 markdown 代码块
    let jsonStr = content
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    } else {
      const objectMatch = content.match(/\{[\s\S]*\}/)
      if (objectMatch) {
        jsonStr = objectMatch[0]
      }
    }

    const parsed = JSON.parse(jsonStr)
    console.log('[generateSpeakFeedback] 解析成功:', {
      grammarErrors: parsed.grammarErrors?.length || 0,
      betterExpressions: parsed.betterExpressions?.length || 0,
      goodExpressions: parsed.goodExpressions?.length || 0
    })
    return {
      grammarErrors: parsed.grammarErrors || [],
      betterExpressions: parsed.betterExpressions || [],
      goodExpressions: parsed.goodExpressions || [],
      summary: {
        totalMessages: messages.length,
        userMessages: userMessages.length,
        duration: 0,
        errorCount: (parsed.grammarErrors || []).length,
      },
    }
  } catch (e) {
    console.error('解析反馈 JSON 失败:', e, '原始内容:', content.substring(0, 500))
  }

  // 返回默认反馈
  return {
    grammarErrors: [],
    betterExpressions: [],
    goodExpressions: [],
    summary: {
      totalMessages: messages.length,
      userMessages: userMessages.length,
      duration: 0,
      errorCount: 0,
    },
  }
}
