import { jwtVerify } from 'jose'
import { json } from '../../../lib/response'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

// GET /api/items/:id/rating — 平均分、评分数，以及当前用户的评分
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = (context.params as { id: string }).id

  // 平均分与评分人数
  const stats = await context.env.DB.prepare(
    'SELECT AVG(score) as avg_score, COUNT(*) as count FROM ratings WHERE item_id = ?'
  ).bind(id).first<{ avg_score: number | null; count: number }>()

  // 若携带有效的访客 token，附带返回其自身评分
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
      // 无效 token，忽略——只是不返回用户评分
    }
  }

  return json({
    avg: stats?.avg_score ? Math.round(stats.avg_score * 10) / 10 : 0,
    count: stats?.count ?? 0,
    userScore,
  })
}

// POST /api/items/:id/rating — 提交或更新评分（需访客 JWT）
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const id = (context.params as { id: string }).id

  // 校验访客 JWT
  const authHeader = context.request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: '请先登录' }, 401)
  }

  let linuxdoId: number
  let linuxdoUsername: string
  try {
    const secret = new TextEncoder().encode(context.env.JWT_SECRET)
    const { payload } = await jwtVerify(authHeader.slice(7), secret)
    if (payload.role !== 'visitor' || !payload.linuxdo_id) {
      return json({ error: '需要访客身份' }, 403)
    }
    linuxdoId = payload.linuxdo_id as number
    linuxdoUsername = (payload.linuxdo_username as string) || ''
  } catch {
    return json({ error: '登录已过期，请重新登录' }, 401)
  }

  const body = await context.request.json<{ score: number }>()
  const score = body.score

  if (!score || score < 1 || score > 5 || !Number.isInteger(score)) {
    return json({ error: '评分必须是 1-5 的整数' }, 400)
  }

  // 条目需存在
  const item = await context.env.DB.prepare('SELECT id FROM items WHERE id = ?')
    .bind(id).first()
  if (!item) {
    return json({ error: '条目不存在' }, 404)
  }

  // upsert 评分
  await context.env.DB.prepare(
    `INSERT INTO ratings (item_id, linuxdo_id, linuxdo_username, score)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(item_id, linuxdo_id) DO UPDATE SET
       score = excluded.score,
       linuxdo_username = excluded.linuxdo_username,
       updated_at = datetime('now')`
  ).bind(id, linuxdoId, linuxdoUsername, score).run()

  // 返回更新后的统计
  const stats = await context.env.DB.prepare(
    'SELECT AVG(score) as avg_score, COUNT(*) as count FROM ratings WHERE item_id = ?'
  ).bind(id).first<{ avg_score: number | null; count: number }>()

  return json({
    avg: stats?.avg_score ? Math.round(stats.avg_score * 10) / 10 : 0,
    count: stats?.count ?? 0,
    userScore: score,
  })
}
