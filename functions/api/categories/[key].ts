interface Env {
  DB: D1Database
}

// DELETE /api/categories/:key — delete a category (authenticated)
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const key = decodeURIComponent(context.params.key as string)

  if (!key) {
    return new Response(JSON.stringify({ error: 'Missing category key' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Check category exists
  const existing = await context.env.DB.prepare(
    'SELECT key FROM categories WHERE key = ?'
  ).bind(key).first()

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Category not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Check if category has items
  const itemCount = await context.env.DB.prepare(
    'SELECT COUNT(*) as total FROM items WHERE category = ?'
  ).bind(key).first<{ total: number }>()

  if (itemCount && itemCount.total > 0) {
    return new Response(JSON.stringify({
      error: `分组下还有 ${itemCount.total} 条内容，请先删除后再移除分组`,
    }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await context.env.DB.prepare('DELETE FROM categories WHERE key = ?')
    .bind(key)
    .run()

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
