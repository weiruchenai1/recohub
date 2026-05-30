import { json } from '../../lib/response'

interface Env {
  DB: D1Database
}

// GET /api/categories — list all categories ordered by sort_order
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const result = await context.env.DB.prepare(
    'SELECT key, label, sort_order FROM categories ORDER BY sort_order ASC'
  ).all<{ key: string; label: string; sort_order: number }>()

  return json(result.results)
}

// POST /api/categories — create a new category (authenticated)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{ key: string; label: string }>()

  if (!body.key || !body.label) {
    return json({ error: 'Missing required fields: key, label' }, 400)
  }

  const existing = await context.env.DB.prepare(
    'SELECT key FROM categories WHERE key = ?'
  ).bind(body.key).first()

  if (existing) {
    return json({ error: '分组标识已存在' }, 409)
  }

  // Place new category at the end
  const maxOrder = await context.env.DB.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) as m FROM categories'
  ).first<{ m: number }>()

  const sortOrder = (maxOrder?.m ?? -1) + 1

  await context.env.DB.prepare(
    'INSERT INTO categories (key, label, sort_order) VALUES (?, ?, ?)'
  ).bind(body.key, body.label, sortOrder).run()

  return json({ key: body.key, label: body.label, sort_order: sortOrder }, 201)
}

// PUT /api/categories — batch update (reorder + rename)
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{
    categories: { key: string; label: string; sort_order: number }[]
  }>()

  if (!body.categories || !Array.isArray(body.categories)) {
    return json({ error: 'Invalid payload' }, 400)
  }

  const stmts = body.categories.map((cat) =>
    context.env.DB.prepare(
      'UPDATE categories SET label = ?, sort_order = ? WHERE key = ?'
    ).bind(cat.label, cat.sort_order, cat.key)
  )

  if (stmts.length) await context.env.DB.batch(stmts)

  return json({ success: true })
}
