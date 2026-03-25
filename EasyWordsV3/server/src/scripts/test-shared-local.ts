import { createClient } from '@libsql/client'

const dbUrl = 'file:D:/IT/EasyWords/shared/dev.db'
console.log('数据库路径:', dbUrl)

const libsql = createClient({ url: dbUrl })

async function test() {
  console.log('\n=== 本地共享数据库测试 ===\n')

  const tables = await libsql.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  )
  console.log('表列表:')
  tables.rows.forEach((row: any) => console.log('  -', row.name))

  try {
    const admins = await libsql.execute('SELECT username, role FROM admins')
    console.log('\n管理员:', admins.rows.length, '个')
    admins.rows.forEach((a: any) => console.log('  -', a.username, '(' + a.role + ')'))
  } catch (e) {
    console.log('\nadmins 表不存在，需要初始化')
  }

  const counts = ['words', 'articles', 'dialogues', 'speak_conversations']
  console.log('\n数据统计:')
  for (const table of counts) {
    try {
      const result = await libsql.execute(`SELECT COUNT(*) as count FROM ${table}`)
      console.log(`  ${table}: ${result.rows[0]?.count || 0} 条`)
    } catch (e) {
      console.log(`  ${table}: 表不存在`)
    }
  }

  console.log('\n✓ 本地共享数据库连接成功!')
}

test().catch(console.error)
