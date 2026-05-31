import { jwtVerify } from 'jose'
import { MIGRATE_SQL, SEED_SQL } from '../lib/dbSchema'

interface Env {
  DB: D1Database
  ICONS: R2Bucket
  AUTH_PASSWORD: string
  JWT_SECRET: string
  LINUXDO_CLIENT_ID: string
  LINUXDO_CLIENT_SECRET: string
}

type CFContext = EventContext<Env, string, unknown>

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

function forbidden() {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * 将 SQL 文本规范化为 db.exec() 可安全执行的格式：
 * 1. 去掉注释行（-- 开头）
 * 2. 按分号切分成独立语句
 * 3. 每个语句内部的多余空白（含换行）压缩为单个空格
 * 4. 过滤空句
 *
 * 这样即便原始 SQL 含跨多行的 CREATE TABLE / INSERT ... VALUES 等语句，
 * exec() 也能正确解析（它会逐行执行，每行必须是一条完整 SQL）。
 */
export function normalizeSQL(sql: string): string {
  // 去掉注释行
  const lines = sql
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim()
      return t && !t.startsWith('--')
    })

  const joined = lines.join(' ')

  // 按分号切分为独立语句
  return joined
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 0)
    .join(';\n')
}

// -- DB guard + auto-init/migrate --

const EXPECTED_VERSION = 8
let dbReady = false

async function checkDB(db: D1Database) {
  if (dbReady) return

  const hasItems = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='items'"
  ).first()

  if (!hasItems) {
    // 全新数据库：跑完整 schema + 种子
    await db.exec(normalizeSQL(MIGRATE_SQL))
    await db.exec(normalizeSQL(SEED_SQL))
  } else {
    // 已有数据库：版本落后则自动迁移
    const row = await db.prepare(
      'SELECT version FROM _schema_version LIMIT 1'
    ).first<{ version: number }>()
    const currentVersion = row?.version ?? 0

    if (currentVersion < EXPECTED_VERSION) {
      await db.exec(normalizeSQL(MIGRATE_SQL))
    }
  }

  dbReady = true
}

export const onRequest: PagesFunction<Env> = async (context: CFContext) => {
  try {
    await checkDB(context.env.DB)
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Database migration failed. Please run npm run db:migrate manually.', detail: (e as Error).message }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { request } = context
  const method = request.method.toUpperCase()

  // GET requests are public
  if (method === 'GET') {
    return context.next()
  }

  // POST 白名单（公开）
  const url = new URL(request.url)
  const publicPosts = ['/api/login', '/api/submissions', '/api/icons/fetch', '/api/icons/save']
  const isRatingPost = method === 'POST' && /^\/api\/items\/\d+\/rating$/.test(url.pathname)
  if (method === 'POST' && (publicPosts.includes(url.pathname) || isRatingPost)) {
    return context.next()
  }

  // 其余写操作仅限管理员
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized()
  }

  const token = authHeader.slice(7)
  try {
    const secret = new TextEncoder().encode(context.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    if (payload.role !== 'admin') {
      return forbidden()
    }
  } catch {
    return unauthorized()
  }

  return context.next()
}
