import { createClient } from '@libsql/client'

// 检查本地数据库的数据
const localDb = createClient({ url: 'file:D:/IT/EasyWords/EasyWordsV3/server/prisma/data/easywords.db' })

async function checkLocalData() {
  console.log('=== V3 本地数据库 (prisma/data/easywords.db) ===\n')

  const tables = ['words', 'articles', 'dialogues', 'speak_conversations', 'speak_scenarios', 'settings']

  for (const table of tables) {
    try {
      const result = await localDb.execute(`SELECT COUNT(*) as count FROM ${table}`)
      console.log(`${table}: ${result.rows[0]?.count || 0} 条`)
    } catch (e) {
      console.log(`${table}: 表不存在`)
    }
  }

  // 检查一些数据样本
  console.log('\n=== 数据样本 ===\n')

  const words = await localDb.execute('SELECT word, chineseDefinition FROM words LIMIT 5')
  console.log('Words:')
  words.rows.forEach((w: any) => console.log(`  - ${w.word}: ${w.chineseDefinition?.substring(0, 30)}...`))
}

checkLocalData().catch(console.error)
