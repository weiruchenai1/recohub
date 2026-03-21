import { jwtVerify } from 'jose'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

// GET /api/items/:id/rating — get average rating and current user's rating
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = (context.params as { id: string }).id

  // Get average rating and count
  const stats = await context.env.DB.prepare(
    'SELECT AVG(score) as avg_score, COUNT(*) as count FROM ratings WHERE item_id = ?'
  ).bind(id).first<{ avg_score: number | null; count: number }>()

  // Try to get current user's rating if they have a visitor token
  let userScore: number | null = null
  const authHeader = context.request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const secret = new TextEncoder().encode(context.env.JWT_SECRET)
      const { payload } = await jwtVerify(authHeader.slice(7), secret)
      if (payload.role === 'visitor' && payload.linuxdo_id) {
        const row = await context.env.DB.prepare(
          'SELECT score FROM ratings WHERE item_id = ? AND linuxdo_id = ?'
        ).bind(id, payload.linuxdo_id).first<{ score: number }>()
        userScore = row?.score ?? null
      }
    } catch {
      // Invalid token, ignore — just don't return user score
    }
  }

  return new Response(JSON.stringify({
    avg: stats?.avg_score ? Math.round(stats.avg_score * 10) / 10 : 0,
    count: stats?.count ?? 0,
    userScore,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

// POST /api/items/:id/rating — submit or update a rating (requires visitor JWT)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const id = (context.params as { id: string }).id

  // Verify visitor JWT
  const authHeader = context.request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '请先登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let linuxdoId: number
  let linuxdoUsername: string
  try {
    const secret = new TextEncoder().encode(context.env.JWT_SECRET)
    const { payload } = await jwtVerify(authHeader.slice(7), secret)
    if (payload.role !== 'visitor' || !payload.linuxdo_id) {
      return new Response(JSON.stringify({ error: '需要访客身份' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    linuxdoId = payload.linuxdo_id as number
    linuxdoUsername = (payload.linuxdo_username as string) || ''
  } catch {
    return new Response(JSON.stringify({ error: '登录已过期，请重新登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await context.request.json<{ score: number }>()
  const score = body.score

  if (!score || score < 1 || score > 5 || !Number.isInteger(score)) {
    return new Response(JSON.stringify({ error: '评分必须是 1-5 的整数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Check item exists
  const item = await context.env.DB.prepare('SELECT id FROM items WHERE id = ?')
    .bind(id).first()
  if (!item) {
    return new Response(JSON.stringify({ error: '条目不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Upsert rating
  await context.env.DB.prepare(
    `INSERT INTO ratings (item_id, linuxdo_id, linuxdo_username, score)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(item_id, linuxdo_id) DO UPDATE SET
       score = excluded.score,
       linuxdo_username = excluded.linuxdo_username,
       updated_at = datetime('now')`
  ).bind(id, linuxdoId, linuxdoUsername, score).run()

  // Return updated stats
  const stats = await context.env.DB.prepare(
    'SELECT AVG(score) as avg_score, COUNT(*) as count FROM ratings WHERE item_id = ?'
  ).bind(id).first<{ avg_score: number | null; count: number }>()

  return new Response(JSON.stringify({
    avg: stats?.avg_score ? Math.round(stats.avg_score * 10) / 10 : 0,
    count: stats?.count ?? 0,
    userScore: score,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
