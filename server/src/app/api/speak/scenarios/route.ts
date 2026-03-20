// API: 口语练习场景管理
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'

import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-utils'
import { prisma } from '@/lib/db'

// 场景种子数据
const SCENARIO_SEED_DATA = [
  {
    id: 'restaurant',
    name: '餐厅点餐',
    description: '在餐厅与服务员对话，完成点餐',
    icon: '🍽️',
    difficultyLevels: ['beginner', 'intermediate', 'advanced'],
    systemPrompts: {
      beginner: 'You are a friendly waiter at a casual restaurant. Your goal is to help the customer practice English speaking. Use simple sentences and speak slowly. Always ask open-ended follow-up questions to encourage the customer to speak more. For example, ask about their preferences, what they like to eat, or if they have any food allergies. Be patient and encouraging.',
      intermediate: 'You are a professional waiter at a nice restaurant. Your goal is to help the customer practice English through natural conversation. Engage them with questions about their dining preferences, past restaurant experiences, or favorite cuisines. Ask follow-up questions to keep them talking. Make the conversation feel natural and enjoyable.',
      advanced: 'You are an experienced sommelier and waiter at an upscale restaurant. Help the customer practice sophisticated English. Discuss food pairings, cooking techniques, and wine selections. Ask thought-provoking questions about their culinary experiences and preferences. Encourage detailed responses.',
    },
    openingLines: {
      beginner: "Hello! Welcome to our restaurant. I'm here to help you today. First, tell me, what kind of food do you usually like to eat?",
      intermediate: "Good evening! Welcome. Before I show you the menu, I'd love to know - what brings you here tonight? Are you celebrating something special?",
      advanced: "Good evening, and welcome. I notice you seem like someone who appreciates good food. What's the most memorable meal you've ever had?",
    },
    learningGoals: ['餐饮词汇', '礼貌请求', '数量表达'],
    sortOrder: 1,
  },
  {
    id: 'directions',
    name: '问路导航',
    description: '向路人询问如何到达目的地',
    icon: '🗺️',
    difficultyLevels: ['beginner', 'intermediate', 'advanced'],
    systemPrompts: {
      beginner: 'You are a friendly local helping a tourist find their way. Your goal is to help them practice English. After giving simple directions, ask follow-up questions to encourage more conversation. Ask where they are from, what they plan to do there, or if they need help with anything else.',
      intermediate: 'You are a helpful local giving directions. Practice natural English conversation by asking about their trip - where are they from, how long are they visiting, what places have they already seen. Provide directions while keeping the conversation going.',
      advanced: 'You are a local expert who knows the area well. Engage in deeper conversation about the place they want to visit. Ask about their interest in that location, recommend local spots, and share interesting facts. Encourage them to share their travel experiences.',
    },
    openingLines: {
      beginner: "Hi there! You look like you're looking for somewhere. Can I help you? Where would you like to go?",
      intermediate: "Hello! I noticed you seem a bit lost. I'm a local here - where are you trying to go? And where are you visiting from?",
      advanced: "Good morning! I see you're exploring our city. What interesting place are you looking for today? I might know some hidden gems nearby.",
    },
    learningGoals: ['方向词汇', '位置描述', '理解指示'],
    sortOrder: 2,
  },
  {
    id: 'interview',
    name: '求职面试',
    description: '模拟英文面试场景',
    icon: '💼',
    difficultyLevels: ['intermediate', 'advanced'],
    systemPrompts: {
      intermediate: 'You are a professional HR interviewer. Help the candidate practice interview English. Ask one question at a time, then follow up on their answers to encourage more detailed responses. Ask about their experiences, skills, and why they want the job. Be encouraging and give them time to express themselves.',
      advanced: 'You are a senior hiring manager. Conduct a realistic interview to help them practice professional English. After each answer, dig deeper with follow-up questions. Ask behavioral questions like "Tell me about a time when..." and probe for specific details. Help them practice articulating complex ideas clearly.',
    },
    openingLines: {
      intermediate: "Good morning. Thank you for coming in today. Let's start with you telling me about yourself. What would you like me to know about you?",
      advanced: "Good morning. I've reviewed your resume and I'm interested in learning more. To begin, could you walk me through your professional journey? What led you to apply for this position?",
    },
    learningGoals: ['自我介绍', '职业表达', '应对问题'],
    sortOrder: 3,
  },
  {
    id: 'shopping',
    name: '商场购物',
    description: '在商店与店员交流购买商品',
    icon: '🛍️',
    difficultyLevels: ['beginner', 'intermediate', 'advanced'],
    systemPrompts: {
      beginner: 'You are a friendly shop assistant. Help customers practice English shopping vocabulary. Ask questions about what they are looking for, their preferences, and what occasion they are shopping for. Encourage them to describe what they want in detail.',
      intermediate: 'You are a helpful sales associate at a clothing store. Engage customers in natural conversation about their style preferences, favorite brands, or shopping habits. Ask follow-up questions to keep the conversation flowing while helping them find what they need.',
      advanced: 'You are a personal shopper at a high-end boutique. Have sophisticated conversations about fashion, style, and personal image. Ask about their lifestyle, fashion inspirations, and preferences. Encourage them to express their personal style in detail.',
    },
    openingLines: {
      beginner: "Hi! Welcome to our store. I'm happy to help you. What are you looking for today? Is it for yourself or someone else?",
      intermediate: "Hello! Welcome. I'd love to help you find something perfect. What brings you shopping today? Are you looking for a specific occasion?",
      advanced: "Good afternoon! I'm here to give you a personalized shopping experience. Before we start, tell me about your personal style - how would you describe your fashion sense?",
    },
    learningGoals: ['价格询问', '尺寸颜色', '讨价还价'],
    sortOrder: 4,
  },
  {
    id: 'casual',
    name: '日常闲聊',
    description: '与朋友进行日常对话',
    icon: '☕',
    difficultyLevels: ['beginner', 'intermediate', 'advanced'],
    systemPrompts: {
      beginner: 'You are a friendly person having a casual chat. Your main goal is to help them practice everyday English. After they respond, always ask a follow-up question about their life, hobbies, family, or weekend plans. Keep the conversation light and fun while encouraging them to speak more.',
      intermediate: 'You are a friend having a relaxed conversation. Actively engage them in topics like hobbies, movies, books, travel, or weekend plans. Share your own experiences briefly, then ask about theirs. Use natural expressions and encourage detailed responses.',
      advanced: 'You are an interesting conversationalist. Have deep, meaningful conversations about topics like travel experiences, cultural differences, current events, or personal growth. Ask thought-provoking questions that encourage them to express opinions and share detailed stories.',
    },
    openingLines: {
      beginner: "Hey! Good to see you! How are you doing today? Did you do anything fun recently?",
      intermediate: "Hi there! How's your week going? I've been wondering - what do you usually like to do on weekends?",
      advanced: "Hey! Great to catch up with you. I've been thinking about something interesting - if you could travel anywhere in the world right now, where would you go and why?",
    },
    learningGoals: ['话题展开', '情感表达', '地道表达'],
    sortOrder: 5,
  },
]

// 初始化场景数据
async function ensureScenariosExist() {
  const count = await prisma.speakScenario.count()
  if (count === 0) {
    // 批量创建场景
    for (const scenario of SCENARIO_SEED_DATA) {
      await prisma.speakScenario.create({
        data: {
          id: scenario.id,
          name: scenario.name,
          description: scenario.description,
          icon: scenario.icon,
          difficultyLevels: JSON.stringify(scenario.difficultyLevels),
          systemPrompts: JSON.stringify(scenario.systemPrompts),
          openingLines: JSON.stringify(scenario.openingLines),
          learningGoals: JSON.stringify(scenario.learningGoals),
          sortOrder: scenario.sortOrder,
        },
      })
    }
  } else {
    // 更新已有场景的提示词和开场白
    for (const scenario of SCENARIO_SEED_DATA) {
      await prisma.speakScenario.update({
        where: { id: scenario.id },
        data: {
          systemPrompts: JSON.stringify(scenario.systemPrompts),
          openingLines: JSON.stringify(scenario.openingLines),
        },
      })
    }
  }
}

// 获取场景列表
export async function GET(request: NextRequest) {
  try {
    // 确保场景数据存在
    await ensureScenariosExist()

    const scenarios = await prisma.speakScenario.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    return successResponse({
      scenarios: scenarios.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon,
        difficultyLevels: JSON.parse(s.difficultyLevels),
        learningGoals: JSON.parse(s.learningGoals || '[]'),
      })),
    })
  } catch (error: any) {
    console.error('获取场景列表失败:', error)
    return errorResponse(ErrorCodes.UNKNOWN, '获取场景列表失败')
  }
}
