interface Env {
  DB: D1Database
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// DELETE /api/submissions/:id — reject (delete) a submission
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = Number(context.params.id)
  if (isNaN(id)) {
    return json({ error: 'Invalid ID' }, 400)
  }

  await context.env.DB.prepare('DELETE FROM submissions WHERE id = ?').bind(id).run()

  return json({ success: true })
}
