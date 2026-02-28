import { runHealthCheck } from '../../lib/healthCheck'

interface Env {
  DB: D1Database
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// POST /api/items/health-check — run health check (used by auto-trigger, kept as API)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const result = await runHealthCheck(context.env.DB, 50)
  return json(result)
}
