import { json } from '../../lib/response'

interface Env {
  DB: D1Database
}

// DELETE /api/categories/:key — delete a category (authenticated)
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const key = decodeURIComponent(context.params.key as string)

  if (!key) {
    return json({ error: 'Missing category key' }, 400)
  }

  // Check category exists
  const existing = await context.env.DB.prepare(
    'SELECT key FROM categories WHERE key = ?'
  ).bind(key).first()

  if (!existing) {
    return json({ error: 'Category not found' }, 404)
  }

  // Check if category has items
  const itemCount = await context.env.DB.prepare(
    'SELECT COUNT(*) as total FROM items WHERE category = ?'
  ).bind(key).first<{ total: number }>()

  if (itemCount && itemCount.total > 0) {
    return json({ error: `分组下还有 ${itemCount.total} 条内容，请先删除后再移除分组` }, 409)
  }

  await context.env.DB.prepare('DELETE FROM categories WHERE key = ?')
    .bind(key)
    .run()

  return json({ success: true })
}
