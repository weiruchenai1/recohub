import { isValidHttpUrl } from '../../lib/urlValidation'
import { json } from '../../lib/response'

interface Env {
  DB: D1Database
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const id = (context.params as { id: string }).id
  const body = await context.request.json<{
    name?: string
    url?: string
    note?: string
    sort_order?: number
    category?: string
    icon_url?: string | null
  }>()

  const existing = await context.env.DB.prepare('SELECT * FROM items WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) {
    return json({ error: 'Item not found' }, 404)
  }

  if (body.url !== undefined && !isValidHttpUrl(body.url)) {
    return json({ error: 'Invalid URL format' }, 400)
  }

  await context.env.DB.prepare(
    `UPDATE items SET
      name = ?,
      url = ?,
      note = ?,
      sort_order = ?,
      category = ?,
      icon_url = ?,
      updated_at = datetime('now')
    WHERE id = ?`
  ).bind(
    body.name ?? existing.name,
    body.url ?? existing.url,
    body.note ?? existing.note,
    body.sort_order ?? existing.sort_order,
    body.category ?? existing.category,
    body.icon_url !== undefined ? body.icon_url : existing.icon_url,
    id,
  ).run()

  const updated = await context.env.DB.prepare('SELECT * FROM items WHERE id = ?')
    .bind(id)
    .first()

  return json(updated)
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = (context.params as { id: string }).id

  const existing = await context.env.DB.prepare('SELECT * FROM items WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) {
    return json({ error: 'Item not found' }, 404)
  }

  await context.env.DB.prepare('DELETE FROM items WHERE id = ?').bind(id).run()

  return json({ success: true })
}
