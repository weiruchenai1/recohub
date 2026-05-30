import { requireAuth } from '../../lib/auth'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  // 导出整库属于敏感操作，仅限管理员（中间件对 GET 一律放行，需在此手动校验）
  const denied = await requireAuth(context.request, context.env.JWT_SECRET)
  if (denied) return denied

  const [categories, items] = await Promise.all([
    context.env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all(),
    context.env.DB.prepare('SELECT * FROM items ORDER BY category ASC, sort_order ASC, id ASC').all(),
  ])

  const data = {
    version: 1,
    exported_at: new Date().toISOString(),
    categories: categories.results,
    items: items.results,
  }

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="recohub-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
