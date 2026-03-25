/**
 * 测试本地共享数据库连接
 */

import { createClient } from '@libsql/client'
import { resolve } from 'path'

const dbPath = resolve(__dirname, '../../../shared/dev.db')
console.log('数据库路径:', dbPath)

const libsql = createClient({
  url: `file:${dbPath}`,
})

async function test() {
  console.log('\n=== 本地共享数据库测试 ===\n')

  // 检查表
  const tables = await libsql.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  )
  console.log('表列表:')
  tables.rows.forEach((row: any) => console.log(`  - ${row.name}`))

  // 检查 admins
  const admins = await libsql.execute('SELECT username, role FROM admins')
  console.log(`\n管理员: ${admins.rows.length} 个`)
  admins.rows.forEach((a: any) => console.log(`  - ${a.username} (${a.role})`))

  console.log('\n✓ 本地共享数据库连接成功!')
}

test().catch(console.error)
