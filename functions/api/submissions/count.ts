import { json } from '../../lib/response'
import { requireAuth } from '../../lib/auth'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  // Manual auth check
  const denied = await requireAuth(context.request, context.env.JWT_SECRET)
  if (denied) return denied

  const row = await context.env.DB.prepare(
    'SELECT COUNT(*) as count FROM submissions'
  ).first<{ count: number }>()

  return json({ count: row?.count ?? 0 })
}
