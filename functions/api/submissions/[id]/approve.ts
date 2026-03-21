import { json } from '../../../lib/response'
import { autoFetchIcon } from '../../../lib/autoIcon'

interface Env {
  DB: D1Database
  ICONS: R2Bucket
}

// POST /api/submissions/:id/approve — approve a submission, optionally with edits
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const id = Number(context.params.id)
  if (isNaN(id)) {
    return json({ error: 'Invalid ID' }, 400)
  }

  // Fetch the submission
  const submission = await context.env.DB.prepare(
    'SELECT * FROM submissions WHERE id = ?'
  ).bind(id).first<{
    id: number
    name: string
    url: string
    note: string
    category: string
    icon_url: string | null
  }>()

  if (!submission) {
    return json({ error: '提交不存在' }, 404)
  }

  // Allow overriding fields from request body
  const body = await context.request.json<{
    name?: string
    url?: string
    note?: string
    category?: string
    icon_url?: string | null
  }>().catch(() => ({} as { name?: string; url?: string; note?: string; category?: string; icon_url?: string | null }))

  const name = (body.name || submission.name).trim()
  const url = (body.url || submission.url).trim()
  const note = (body.note ?? submission.note).trim()
  const category = (body.category || submission.category).trim()
  const icon_url = body.icon_url !== undefined ? body.icon_url : submission.icon_url

  // Auto-fetch icon if none provided
  const finalIconUrl = icon_url ?? await autoFetchIcon(url, context.env.ICONS)

  if (!category) {
    return json({ error: '请选择分类' }, 400)
  }

  // Check if URL already exists in items (any category)
  const existingItem = await context.env.DB.prepare(
    'SELECT i.category, c.label FROM items i LEFT JOIN categories c ON i.category = c.key WHERE i.url = ? LIMIT 1'
  ).bind(url).first<{ category: string; label: string | null }>()

  if (existingItem) {
    const groupName = existingItem.label || existingItem.category
    return json({ error: `该链接已存在于「${groupName}」分组中` }, 409)
  }

  // Get max sort_order for the target category
  const maxOrder = await context.env.DB.prepare(
    'SELECT COALESCE(MAX(sort_order), 0) as m FROM items WHERE category = ?'
  ).bind(category).first<{ m: number }>()

  const sortOrder = (maxOrder?.m ?? 0) + 1

  // Insert into items and delete submission
  await context.env.DB.batch([
    context.env.DB.prepare(
      'INSERT INTO items (category, name, url, note, icon_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(category, name, url, note, finalIconUrl, sortOrder),
    context.env.DB.prepare('DELETE FROM submissions WHERE id = ?').bind(id),
  ])

  return json({ success: true })
}
