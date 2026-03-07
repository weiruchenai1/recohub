import { jwtVerify } from 'jose'
import { MIGRATE_SQL, SEED_SQL } from '../lib/dbSchema'

interface Env {
  DB: D1Database
  ICONS: R2Bucket
  AUTH_PASSWORD: string
  JWT_SECRET: string
}

type CFContext = EventContext<Env, string, unknown>

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

// -- Lightweight DB guard + auto-init from generated schema --

const EXPECTED_VERSION = 6
let dbReady = false

async function checkDB(db: D1Database) {
  if (dbReady) return

  const hasItems = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='items'"
  ).first()

  if (!hasItems) {
    // Fresh database — auto-init from db/migrate.sql + db/seed.sql (build-time embedded)
    await db.exec(MIGRATE_SQL)
    await db.exec(SEED_SQL)
  } else {
    // Existing database — verify schema version
    const row = await db.prepare(
      'SELECT version FROM _schema_version LIMIT 1'
    ).first<{ version: number }>()
    const currentVersion = row?.version ?? 0

    if (currentVersion !== EXPECTED_VERSION) {
      throw new Error(`Schema version mismatch: expected ${EXPECTED_VERSION}, got ${currentVersion}. Run db:migrate.`)
    }
  }

  dbReady = true
}

export const onRequest: PagesFunction<Env> = async (context: CFContext) => {
  // Lightweight DB check — no runtime migrations
  try {
    await checkDB(context.env.DB)
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Database schema outdated. Please run migrations.', detail: (e as Error).message }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { request } = context
  const method = request.method.toUpperCase()

  // GET requests are public
  if (method === 'GET') {
    return context.next()
  }

  // POST to /api/login, /api/submissions, /api/icons/fetch, /api/icons/save are public
  const url = new URL(request.url)
  const publicPosts = ['/api/login', '/api/submissions', '/api/icons/fetch', '/api/icons/save']
  if (method === 'POST' && publicPosts.includes(url.pathname)) {
    return context.next()
  }

  // All other write operations require JWT
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized()
  }

  const token = authHeader.slice(7)
  try {
    const secret = new TextEncoder().encode(context.env.JWT_SECRET)
    await jwtVerify(token, secret)
  } catch {
    return unauthorized()
  }

  return context.next()
}
