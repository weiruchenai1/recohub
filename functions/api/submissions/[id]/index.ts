import { json } from '../../../lib/response'

interface Env {
  DB: D1Database
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
