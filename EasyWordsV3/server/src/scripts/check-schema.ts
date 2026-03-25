import { createClient } from '@libsql/client'

const localDb = createClient({ url: 'file:D:/IT/EasyWords/EasyWordsV3/server/prisma/data/easywords.db' })
const tursoDb = createClient({
  url: 'libsql://easywords-ckk521.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM2NTk0NDMsImlkIjoiMDE5Y2Y2NTMtYzUwMS03YzRkLWEzMWItNWE3NTcwNDI4MjMzIiwicmlkIjoiMDMzOGEwZGMtODQxNC00OWQyLTkwYmQtMzNhMjYyMWJiZDgxIn0.QJg-po4ZRpTxW_FSjNhvMNuiqPl8DuLbINjUg9OdflzMjOWopg8VOWahGc_NSIYPHeQ2j1GrxWxlzbJx8IRbCQ'
})

async function checkSchema() {
  console.log('=== 本地 articles 表结构 ===')
  const localSchema = await localDb.execute('PRAGMA table_info(articles)')
  localSchema.rows.forEach((col: any) => console.log(`  ${col.name}: ${col.type}`))

  console.log('\n=== Turso articles 表结构 ===')
  const tursoSchema = await tursoDb.execute('PRAGMA table_info(articles)')
  tursoSchema.rows.forEach((col: any) => console.log(`  ${col.name}: ${col.type}`))

  console.log('\n=== 本地 articles 数据样本 ===')
  const sample = await localDb.execute('SELECT * FROM articles LIMIT 1')
  console.log('列数:', Object.keys(sample.rows[0] || {}).length)
  console.log('列名:', Object.keys(sample.rows[0] || {}))
}

checkSchema().catch(console.error)
