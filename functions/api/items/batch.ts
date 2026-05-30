import { json } from '../../lib/response'

interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{
    action: 'delete' | 'move'
    ids: number[]
    targetCategory?: string
  }>()

  if (!body.ids || body.ids.length === 0) {
    return json({ error: 'No items specified' }, 400)
  }

  const placeholders = body.ids.map(() => '?').join(',')

  if (body.action === 'delete') {
    await context.env.DB.prepare(`DELETE FROM items WHERE id IN (${placeholders})`)
      .bind(...body.ids)
      .run()

    return json({ success: true, deleted: body.ids.length })
  }

  if (body.action === 'move' && body.targetCategory) {
    await context.env.DB.prepare(
      `UPDATE items SET category = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`
    )
      .bind(body.targetCategory, ...body.ids)
      .run()

    return json({ success: true, moved: body.ids.length })
  }

  return json({ error: 'Invalid action' }, 400)
}
