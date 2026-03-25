/**
 * 数据库初始化脚本
 * 用于在 Turso 数据库中创建用户系统相关的表
 *
 * 使用方法: npx tsx src/scripts/init-db.ts
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

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function initDatabase() {
  console.log('开始初始化数据库...')

  try {
    // 用户表
    await libsql.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        nickname TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        lastLoginAt TEXT,
        expiresAt TEXT,
        expiryMode TEXT,
        isActive INTEGER DEFAULT 1,
        loginFailCount INTEGER DEFAULT 0,
        loginLockedUntil TEXT
      )
    `)
    console.log('✓ users 表创建成功')

    // 管理员表
    await libsql.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        createdAt TEXT DEFAULT (datetime('now')),
        lastLoginAt TEXT
      )
    `)
    console.log('✓ admins 表创建成功')

    // 用户模块权限表
    await libsql.execute(`
      CREATE TABLE IF NOT EXISTS user_module_permissions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        userId TEXT UNIQUE NOT NULL,
        vocabulary INTEGER DEFAULT 1,
        reading INTEGER DEFAULT 1,
        dialogue INTEGER DEFAULT 1,
        speak INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    console.log('✓ user_module_permissions 表创建成功')

    // 登录日志表
    await libsql.execute(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        userId TEXT,
        username TEXT NOT NULL,
        status TEXT NOT NULL,
        failReason TEXT,
        ipAddress TEXT,
        userAgent TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )
    `)
    console.log('✓ login_logs 表创建成功')

    // 用户活动记录表
    await libsql.execute(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        userId TEXT NOT NULL,
        action TEXT NOT NULL,
        resourceId TEXT,
        resourceType TEXT,
        details TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    console.log('✓ user_activities 表创建成功')

    // 给现有表添加 userId 字段（如果不存在）
    const tables = ['words', 'articles', 'dialogues', 'speak_conversations']
    for (const table of tables) {
      try {
        // 检查 userId 列是否存在
        const columns = await libsql.execute(`PRAGMA table_info(${table})`)
        const hasUserId = columns.rows.some((col: any) => col.name === 'userId')

        if (!hasUserId) {
          await libsql.execute(`ALTER TABLE ${table} ADD COLUMN userId TEXT`)
          console.log(`✓ ${table} 表添加 userId 列成功`)
        } else {
          console.log(`✓ ${table} 表已有 userId 列`)
        }
      } catch (e) {
        console.log(`⚠ ${table} 表处理跳过（可能不存在）`)
      }
    }

    // 创建索引
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_words_userId ON words(userId)',
      'CREATE INDEX IF NOT EXISTS idx_words_word ON words(word)',
      'CREATE INDEX IF NOT EXISTS idx_articles_userId ON articles(userId)',
      'CREATE INDEX IF NOT EXISTS idx_dialogues_userId ON dialogues(userId)',
      'CREATE INDEX IF NOT EXISTS idx_speak_conversations_userId ON speak_conversations(userId)',
      'CREATE INDEX IF NOT EXISTS idx_login_logs_userId ON login_logs(userId)',
      'CREATE INDEX IF NOT EXISTS idx_login_logs_createdAt ON login_logs(createdAt)',
      'CREATE INDEX IF NOT EXISTS idx_user_activities_userId ON user_activities(userId)',
      'CREATE INDEX IF NOT EXISTS idx_user_activities_createdAt ON user_activities(createdAt)',
      'CREATE INDEX IF NOT EXISTS idx_user_activities_action ON user_activities(action)',
    ]

    for (const sql of indexes) {
      await libsql.execute(sql)
    }
    console.log('✓ 索引创建成功')

    console.log('\n数据库初始化完成！')
  } catch (error) {
    console.error('初始化失败:', error)
    process.exit(1)
  }
}

initDatabase()
