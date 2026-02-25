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
    return new Response(JSON.stringify({ error: 'No items specified' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const placeholders = body.ids.map(() => '?').join(',')

  if (body.action === 'delete') {
    await context.env.DB.prepare(`DELETE FROM items WHERE id IN (${placeholders})`)
      .bind(...body.ids)
      .run()

    return new Response(JSON.stringify({ success: true, deleted: body.ids.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (body.action === 'move' && body.targetCategory) {
    await context.env.DB.prepare(
      `UPDATE items SET category = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`
    )
      .bind(body.targetCategory, ...body.ids)
      .run()

    return new Response(JSON.stringify({ success: true, moved: body.ids.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  })
}
