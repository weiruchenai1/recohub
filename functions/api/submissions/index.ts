import { json } from '../../lib/response'
import { requireAuth } from '../../lib/auth'
import { isValidHttpUrl } from '../../lib/urlValidation'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

// GET /api/submissions — list pending submissions (admin-only, middleware allows all GETs so need manual check)
// POST /api/submissions — public submit

export const onRequestGet: PagesFunction<Env> = async (context) => {
  // Manual auth check — submissions list is admin-only
  const denied = await requireAuth(context.request, context.env.JWT_SECRET)
  if (denied) return denied

  const rows = await context.env.DB.prepare(
    'SELECT * FROM submissions ORDER BY created_at DESC'
  ).all()

  return json(rows.results)
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{
    name?: string
    url?: string
    note?: string
    category?: string
    icon_url?: string
    _hp?: string
  }>()

  // Honeypot check — if filled, silently succeed
  if (body._hp) {
    return json({ success: true })
  }

  const name = (body.name || '').trim()
  const url = (body.url || '').trim()
  const note = (body.note || '').trim()
  const category = (body.category || '').trim()
  const icon_url = (body.icon_url || '').trim() || null

  if (!name || !url) {
    return json({ error: '名称和 URL 不能为空' }, 400)
  }

  // URL protocol check
  if (!isValidHttpUrl(url)) {
    return json({ error: 'URL 仅支持 http/https 协议' }, 400)
  }

  // Check if URL already exists in items
  const existingItem = await context.env.DB.prepare(
    'SELECT i.category, c.label FROM items i LEFT JOIN categories c ON i.category = c.key WHERE i.url = ? LIMIT 1'
  ).bind(url).first<{ category: string; label: string | null }>()

  if (existingItem) {
    const groupName = existingItem.label || existingItem.category
    return json({ error: `该链接已存在于「${groupName}」分组中` }, 409)
  }

  // Check if URL already in pending submissions
  const existingSub = await context.env.DB.prepare(
    'SELECT id FROM submissions WHERE url = ? LIMIT 1'
  ).bind(url).first()

  if (existingSub) {
    return json({ error: '该链接已被提交，正在等待审核' }, 409)
  }

  // IP rate limiting — 5 per hour
  const ip = context.request.headers.get('CF-Connecting-IP') || context.request.headers.get('X-Forwarded-For') || 'unknown'

  const countResult = await context.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM submissions WHERE submitter_ip = ? AND created_at > datetime('now', '-1 hour')"
  ).bind(ip).first<{ cnt: number }>()

  if (countResult && countResult.cnt >= 5) {
    return json({ error: '提交过于频繁，请稍后再试（每小时最多 5 次）' }, 429)
  }

  await context.env.DB.prepare(
    'INSERT INTO submissions (name, url, note, category, icon_url, submitter_ip) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(name, url, note, category, icon_url, ip).run()

  return json({ success: true })
}
