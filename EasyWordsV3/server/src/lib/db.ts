// 数据库客户端 - 支持 SQLite 本地开发 和 Turso 云数据库
import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || 'file:./data/easywords.db'

  // 判断是否使用 Turso (libsql:// 协议)
  const isTurso = databaseUrl.startsWith('libsql://')

  if (isTurso) {
    console.log('[DB] Using Turso cloud database')
    const libsql = createClient({
      url: databaseUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter })
  }

  // 本地 SQLite (使用 libsql adapter)
  console.log('[DB] Using local SQLite:', databaseUrl)
  const libsql = createClient({ url: databaseUrl })
  const adapter = new PrismaLibSQL(libsql)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
