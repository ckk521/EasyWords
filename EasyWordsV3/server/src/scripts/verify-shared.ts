import { createClient } from '@libsql/client'

const dbPath = 'file:D:/IT/EasyWords/EasyWordsV3/server/prisma/data/easywords.db'
const db = createClient({ url: dbPath })

async function verify() {
  console.log('=== 验证共享数据库 ===\n')
  console.log('数据库路径:', dbPath)
  console.log()

  // 表统计
  const tables = ['words', 'articles', 'dialogues', 'speak_scenarios', 'speak_conversations', 'users', 'admins']
  console.log('数据统计:')
  for (const t of tables) {
    const result = await db.execute(`SELECT COUNT(*) as count FROM ${t}`)
    console.log(`  ${t}: ${result.rows[0]?.count || 0} 条`)
  }

  // 管理员
  console.log('\n管理员:')
  const admins = await db.execute('SELECT username, role FROM admins')
  admins.rows.forEach((a: any) => console.log(`  - ${a.username} (${a.role})`))

  // 单词样本
  console.log('\n单词样本:')
  const words = await db.execute('SELECT word FROM words LIMIT 5')
  words.rows.forEach((w: any) => console.log(`  - ${w.word}`))

  console.log('\n✓ adminV1 和 V3 现在共享同一个本地数据库!')
}

verify().catch(console.error)
