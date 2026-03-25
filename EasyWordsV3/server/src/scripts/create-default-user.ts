// 创建默认用户并迁移现有数据
// 用法: npx tsx src/scripts/create-default-user.ts

import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import bcrypt from 'bcryptjs'

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || 'file:./data/easywords.db'
  const isTurso = databaseUrl.startsWith('libsql://')

  if (isTurso) {
    const libsql = createClient({
      url: databaseUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter })
  }

  const libsql = createClient({ url: databaseUrl })
  const adapter = new PrismaLibSQL(libsql)
  return new PrismaClient({ adapter })
}

const prisma = createPrismaClient()

async function main() {
  console.log('开始创建默认用户和迁移数据...\n')

  // 默认用户信息
  const defaultUsername = 'ckk521'
  const defaultEmail = 'ckk521@easywords.local'
  const defaultPassword = 'Ckk@5276241' // 默认密码
  const passwordHash = await bcrypt.hash(defaultPassword, 10)

  // 检查用户是否已存在
  let user = await prisma.user.findUnique({
    where: { username: defaultUsername },
  })

  if (user) {
    console.log(`✅ 用户 ${defaultUsername} 已存在 (ID: ${user.id})`)
  } else {
    // 创建默认用户
    user = await prisma.user.create({
      data: {
        username: defaultUsername,
        email: defaultEmail,
        passwordHash,
        nickname: '管理员',
        isActive: true,
        // 永久有效
        expiresAt: new Date('2099-12-31'),
        expiryMode: 'permanent',
      },
    })
    console.log(`✅ 创建用户 ${defaultUsername} 成功 (ID: ${user.id})`)
    console.log(`   邮箱: ${defaultEmail}`)
    console.log(`   密码: ${defaultPassword}\n`)
  }

  const userId = user.id

  // 迁移单词
  const wordsResult = await prisma.word.updateMany({
    where: { userId: null },
    data: { userId },
  })
  console.log(`📝 迁移单词: ${wordsResult.count} 条`)

  // 迁移文章
  const articlesResult = await prisma.article.updateMany({
    where: { userId: null },
    data: { userId },
  })
  console.log(`📖 迁移文章: ${articlesResult.count} 条`)

  // 迁移对话
  const dialoguesResult = await prisma.dialogue.updateMany({
    where: { userId: null },
    data: { userId },
  })
  console.log(`💬 迁移对话: ${dialoguesResult.count} 条`)

  // 迁移口语练习记录
  const conversationsResult = await prisma.speakConversation.updateMany({
    where: { userId: null },
    data: { userId },
  })
  console.log(`🎤 迁移口语记录: ${conversationsResult.count} 条`)

  // 创建用户权限记录（如果不存在）
  const existingPermission = await prisma.userModulePermission.findUnique({
    where: { userId },
  })

  if (!existingPermission) {
    await prisma.userModulePermission.create({
      data: {
        userId,
        vocabulary: true,
        reading: true,
        dialogue: true,
        speak: true,
      },
    })
    console.log(`✅ 创建用户权限记录`)
  }

  console.log('\n迁移完成！')
  console.log('================')
  console.log(`用户名: ${defaultUsername}`)
  console.log(`密码: ${defaultPassword}`)
  console.log('请妥善保管登录信息')
}

main()
  .catch((error) => {
    console.error('迁移失败:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
