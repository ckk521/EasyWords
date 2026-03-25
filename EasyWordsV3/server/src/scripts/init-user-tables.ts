/**
 * 在 V3 本地数据库中创建用户系统表
 */

import { createClient } from '@libsql/client'

const dbPath = 'file:D:/IT/EasyWords/EasyWordsV3/server/prisma/data/easywords.db'
console.log('数据库路径:', dbPath)

const db = createClient({ url: dbPath })

async function initUserTables() {
  console.log('\n=== 创建用户系统表 ===\n')

  // 用户表
  await db.execute(`
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
  await db.execute(`
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
  await db.execute(`
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
  await db.execute(`
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
  await db.execute(`
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

  // 给现有表添加 userId 字段
  console.log('\n=== 添加 userId 字段 ===\n')
  const tables = ['words', 'articles', 'dialogues', 'speak_conversations']
  for (const table of tables) {
    try {
      const columns = await db.execute(`PRAGMA table_info(${table})`)
      const hasUserId = columns.rows.some((col: any) => col.name === 'userId')
      if (!hasUserId) {
        await db.execute(`ALTER TABLE ${table} ADD COLUMN userId TEXT`)
        console.log(`✓ ${table} 添加 userId 列`)
      } else {
        console.log(`✓ ${table} 已有 userId 列`)
      }
    } catch (e) {
      console.log(`⚠ ${table} 处理跳过`)
    }
  }

  // 创建索引
  console.log('\n=== 创建索引 ===\n')
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_words_userId ON words(userId)',
    'CREATE INDEX IF NOT EXISTS idx_words_word ON words(word)',
    'CREATE INDEX IF NOT EXISTS idx_articles_userId ON articles(userId)',
    'CREATE INDEX IF NOT EXISTS idx_dialogues_userId ON dialogues(userId)',
    'CREATE INDEX IF NOT EXISTS idx_speak_conversations_userId ON speak_conversations(userId)',
    'CREATE INDEX IF NOT EXISTS idx_login_logs_userId ON login_logs(userId)',
    'CREATE INDEX IF NOT EXISTS idx_user_activities_userId ON user_activities(userId)',
  ]
  for (const sql of indexes) {
    await db.execute(sql)
  }
  console.log('✓ 索引创建成功')

  // 验证
  console.log('\n=== 验证表结构 ===\n')
  const allTables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  console.log('所有表:')
  allTables.rows.forEach((row: any) => console.log(`  - ${row.name}`))

  // 数据统计
  console.log('\n=== 数据统计 ===\n')
  const dataTables = ['words', 'articles', 'dialogues', 'speak_scenarios', 'speak_conversations', 'users', 'admins']
  for (const t of dataTables) {
    const result = await db.execute(`SELECT COUNT(*) as count FROM ${t}`)
    console.log(`${t}: ${result.rows[0]?.count || 0} 条`)
  }

  console.log('\n✓ V3 本地数据库初始化完成!')
}

initUserTables().catch(console.error)
