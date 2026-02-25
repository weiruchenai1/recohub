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
  }>()

  const existing = await context.env.DB.prepare('SELECT * FROM items WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Item not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await context.env.DB.prepare(
    `UPDATE items SET
      name = ?,
      url = ?,
      note = ?,
      sort_order = ?,
      category = ?,
      updated_at = datetime('now')
    WHERE id = ?`
  ).bind(
    body.name ?? existing.name,
    body.url ?? existing.url,
    body.note ?? existing.note,
    body.sort_order ?? existing.sort_order,
    body.category ?? existing.category,
    id,
  ).run()

  const updated = await context.env.DB.prepare('SELECT * FROM items WHERE id = ?')
    .bind(id)
    .first()

  return new Response(JSON.stringify(updated), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = (context.params as { id: string }).id

  const existing = await context.env.DB.prepare('SELECT * FROM items WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Item not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await context.env.DB.prepare('DELETE FROM items WHERE id = ?').bind(id).run()

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
