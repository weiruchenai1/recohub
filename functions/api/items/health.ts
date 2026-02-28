import { jwtVerify } from 'jose'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function verifyAuth(request: Request, secret: string) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  try {
    await jwtVerify(authHeader.slice(7), new TextEncoder().encode(secret))
    return true
  } catch {
    return false
  }
}

// GET /api/items/health — list dead/failing items + check settings (auth required)
export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!await verifyAuth(context.request, context.env.JWT_SECRET)) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const [rows, setting, lastCheckedRow] = await Promise.all([
    context.env.DB.prepare(
      `SELECT id, category, name, url, note, status, last_checked, fail_count
       FROM items
       WHERE status = 'dead' OR fail_count > 0
       ORDER BY fail_count DESC, last_checked ASC`
    ).all(),
    context.env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'health_check_interval'"
    ).first<{ value: string }>(),
    context.env.DB.prepare(
      'SELECT MAX(last_checked) as last_checked FROM items WHERE last_checked IS NOT NULL'
    ).first<{ last_checked: string | null }>(),
  ])

  return json({
    items: rows.results,
    interval: parseInt(setting?.value || '21600'),
    lastChecked: lastCheckedRow?.last_checked || null,
  })
}

// DELETE /api/items/health?id=123 — reset a single item's health status (auth required)
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  if (!await verifyAuth(context.request, context.env.JWT_SECRET)) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const url = new URL(context.request.url)
  const id = parseInt(url.searchParams.get('id') || '')
  if (!id) return json({ error: '缺少 id' }, 400)

  await context.env.DB.prepare(
    "UPDATE items SET status = 'ok', fail_count = 0 WHERE id = ?"
  ).bind(id).run()

  return json({ success: true })
}

// PUT /api/items/health — update health check interval (auth required via middleware)
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{ interval: number }>()

  const allowed = [3600, 21600, 43200, 86400] // 1h, 6h, 12h, 24h
  if (!allowed.includes(body.interval)) {
    return json({ error: '无效的检查间隔' }, 400)
  }

  await context.env.DB.prepare(
    "UPDATE settings SET value = ? WHERE key = 'health_check_interval'"
  ).bind(String(body.interval)).run()

  return json({ success: true, interval: body.interval })
}
