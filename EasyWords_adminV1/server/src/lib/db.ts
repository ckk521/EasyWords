import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const databaseUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || 'file:./dev.db'

// 判断是否使用本地 SQLite 还是 Turso
const isTurso = databaseUrl.startsWith('libsql://')

let prisma: PrismaClient

if (isTurso) {
  // Turso 云数据库
  const libsql = createClient({
    url: databaseUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  const adapter = new PrismaLibSQL(libsql)
  prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  })
  console.log('[DB] Using Turso database')
} else {
  // 本地 SQLite (使用 libsql adapter)
  const libsql = createClient({
    url: databaseUrl,
  })
  const adapter = new PrismaLibSQL(libsql)
  prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  })
  console.log('[DB] Using local SQLite:', databaseUrl)
}

export { prisma }
