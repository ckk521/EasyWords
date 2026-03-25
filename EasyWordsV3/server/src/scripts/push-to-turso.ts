/**
 * 将本地 SQLite 数据推送到 Turso 云数据库
 *
 * 使用方法: npx tsx src/scripts/push-to-turso.ts
 */

import { createClient } from '@libsql/client'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

// 加载 .env 文件
function loadEnv() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = resolve(__filename, '..')
  const envPath = resolve(__dirname, '../../.env')
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8')
    content.split('\n').forEach(line => {
      const [key, ...values] = line.split('=')
      if (key && values.length > 0) {
        process.env[key.trim()] = values.join('=').trim()
      }
    })
  }
}
loadEnv()

// 本地数据库
const localDb = createClient({
  url: 'file:D:/IT/EasyWords/EasyWordsV3/server/prisma/data/easywords.db'
})

// Turso 云数据库
const tursoDb = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function pushData() {
  console.log('开始推送数据到 Turso...\n')

  // 1. 推送 settings
  console.log('=== 推送 settings ===')
  const settings = await localDb.execute('SELECT * FROM settings')
  if (settings.rows.length > 0) {
    const s = settings.rows[0] as any
    await tursoDb.execute({
      sql: `INSERT OR REPLACE INTO settings (id, apiKey, baseURL, model, apiProvider, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [s.id, s.apiKey, s.baseURL, s.model, s.apiProvider, s.updatedAt]
    })
    console.log(`  ✓ settings: 1 条`)
  }

  // 2. 推送 words
  console.log('\n=== 推送 words ===')
  const words = await localDb.execute('SELECT * FROM words')
  for (const w of words.rows as any[]) {
    await tursoDb.execute({
      sql: `INSERT OR REPLACE INTO words (id, userId, word, phoneticUs, phoneticUk, chineseDefinition,
            englishDefinition, partOfSpeech, audioUs, audioUk, antonyms, sentences, synonyms,
            createdAt, lastReviewedAt, reviewCount)
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [w.id, w.word, w.phoneticUs, w.phoneticUk, w.chineseDefinition,
             w.englishDefinition, w.partOfSpeech, w.audioUs, w.audioUk,
             w.antonyms, w.sentences, w.synonyms, w.createdAt, w.lastReviewedAt, w.reviewCount]
    })
  }
  console.log(`  ✓ words: ${words.rows.length} 条`)

  // 3. 推送 articles (本地可能没有 length 字段)
  console.log('\n=== 推送 articles ===')
  const articles = await localDb.execute('SELECT * FROM articles')
  for (const a of articles.rows as any[]) {
    await tursoDb.execute({
      sql: `INSERT OR REPLACE INTO articles (id, userId, title, content, wordIds, type, length, translations, createdAt)
            VALUES (?, NULL, ?, ?, ?, ?, COALESCE(?, 'medium'), ?, ?)`,
      args: [a.id, a.title, a.content, a.wordIds, a.type, a.length || 'medium', a.translations, a.createdAt]
    })
  }
  console.log(`  ✓ articles: ${articles.rows.length} 条`)

  // 4. 推送 dialogues
  console.log('\n=== 推送 dialogues ===')
  const dialogues = await localDb.execute('SELECT * FROM dialogues')
  for (const d of dialogues.rows as any[]) {
    await tursoDb.execute({
      sql: `INSERT OR REPLACE INTO dialogues (id, userId, scene, topic, content, wordIds, words, createdAt)
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?)`,
      args: [d.id, d.scene, d.topic, d.content, d.wordIds, d.words, d.createdAt]
    })
  }
  console.log(`  ✓ dialogues: ${dialogues.rows.length} 条`)

  // 5. 推送 speak_scenarios
  console.log('\n=== 推送 speak_scenarios ===')
  const scenarios = await localDb.execute('SELECT * FROM speak_scenarios')
  for (const s of scenarios.rows as any[]) {
    await tursoDb.execute({
      sql: `INSERT OR REPLACE INTO speak_scenarios (id, name, description, icon, difficultyLevels,
            systemPrompts, openingLines, learningGoals, sortOrder, isActive, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [s.id, s.name, s.description, s.icon, s.difficultyLevels,
             s.systemPrompts, s.openingLines, s.learningGoals, s.sortOrder, s.isActive, s.createdAt]
    })
  }
  console.log(`  ✓ speak_scenarios: ${scenarios.rows.length} 条`)

  // 6. 推送 speak_conversations
  console.log('\n=== 推送 speak_conversations ===')
  const conversations = await localDb.execute('SELECT * FROM speak_conversations')
  for (const c of conversations.rows as any[]) {
    await tursoDb.execute({
      sql: `INSERT OR REPLACE INTO speak_conversations (id, userId, scenarioId, difficulty, mode,
            wordIds, messages, feedback, duration, startedAt, endedAt)
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [c.id, c.scenarioId, c.difficulty, c.mode, c.wordIds,
             c.messages, c.feedback, c.duration, c.startedAt, c.endedAt]
    })
  }
  console.log(`  ✓ speak_conversations: ${conversations.rows.length} 条`)

  console.log('\n✓ 数据推送完成!')

  // 验证
  console.log('\n=== 验证 Turso 数据 ===')
  const tables = ['words', 'articles', 'dialogues', 'speak_scenarios', 'speak_conversations']
  for (const table of tables) {
    const result = await tursoDb.execute(`SELECT COUNT(*) as count FROM ${table}`)
    console.log(`  ${table}: ${result.rows[0]?.count || 0} 条`)
  }
}

pushData().catch(console.error)
