import { jwtVerify } from 'jose'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  // Manual auth check
  const authHeader = context.request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }
  try {
    const secret = new TextEncoder().encode(context.env.JWT_SECRET)
    await jwtVerify(authHeader.slice(7), secret)
  } catch {
    return json({ error: 'Unauthorized' }, 401)
  }

  const row = await context.env.DB.prepare(
    'SELECT COUNT(*) as count FROM submissions'
  ).first<{ count: number }>()

  return json({ count: row?.count ?? 0 })
}
