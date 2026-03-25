/**
 * 测试数据库连接
 * 验证 V3 能否读取 Admin 管理后台创建的数据
 */

import { createClient } from '@libsql/client'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

// 手动加载 .env 文件
function loadEnv() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = resolve(__filename, '..')
  const envPath = resolve(__dirname, '../../.env')
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8')
    content.split('\n').forEach(line => {
      const [key, ...values] = line.split('=')
      if (key && values.length > 0) {
        const value = values.join('=').trim()
        process.env[key.trim()] = value
      }
    })
  }
}
loadEnv()

async function testConnection() {
  console.log('测试 V3 连接到 Turso 数据库...\n')

  const libsql = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  // 1. 检查 admins 表
  console.log('=== Admin 表 ===')
  const admins = await libsql.execute('SELECT * FROM admins')
  console.log(`管理员数量: ${admins.rows.length}`)
  admins.rows.forEach((admin: any) => {
    console.log(`  - ${admin.username} (${admin.role})`)
  })

  // 2. 检查 users 表
  console.log('\n=== Users 表 ===')
  const users = await libsql.execute('SELECT * FROM users')
  console.log(`用户数量: ${users.rows.length}`)

  // 3. 检查现有数据表
  console.log('\n=== 现有数据 ===')
  const tables = ['words', 'articles', 'dialogues', 'speak_conversations']
  for (const table of tables) {
    try {
      const result = await libsql.execute(`SELECT COUNT(*) as count FROM ${table}`)
      const count = result.rows[0]?.count || 0
      console.log(`  ${table}: ${count} 条记录`)
    } catch (e) {
      console.log(`  ${table}: 表不存在`)
    }
  }

  console.log('\n✓ 数据库连接测试成功！V3 和 Admin 共享同一数据库。')
}

testConnection().catch(console.error)
