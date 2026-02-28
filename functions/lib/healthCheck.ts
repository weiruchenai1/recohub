/**
 * Shared health check logic — check URLs and update item status in DB.
 * Used by both middleware auto-trigger and the health-check API endpoint.
 */
export async function runHealthCheck(db: D1Database, limit = 10) {
  const rows = await db.prepare(
    `SELECT id, url, fail_count FROM items
     ORDER BY last_checked IS NOT NULL, last_checked ASC
     LIMIT ?`
  ).bind(limit).all<{ id: number; url: string; fail_count: number }>()

  const items = rows.results
  if (items.length === 0) return { checked: 0, alive: 0, dead: 0 }

  // Check all URLs in parallel
  const checks = await Promise.allSettled(
    items.map(async (item) => {
      const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; RecoHub/1.0; +healthcheck)' }
      const isAlive = (status: number) => status !== 404 && status < 500
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        const resp = await fetch(item.url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
          headers,
        })
        clearTimeout(timeout)
        if (isAlive(resp.status)) return { ...item, alive: true }
        // HEAD failed, fallback to GET
        const controller2 = new AbortController()
        const timeout2 = setTimeout(() => controller2.abort(), 15000)
        const resp2 = await fetch(item.url, {
          method: 'GET',
          signal: controller2.signal,
          redirect: 'follow',
          headers,
        })
        clearTimeout(timeout2)
        return { ...item, alive: isAlive(resp2.status) }
      } catch {
        return { ...item, alive: false }
      }
    })
  )

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  let aliveCount = 0
  let deadCount = 0

  for (const result of checks) {
    if (result.status !== 'fulfilled') continue
    const { id, fail_count, alive } = result.value

    if (alive) {
      aliveCount++
      await db.prepare(
        "UPDATE items SET status = 'ok', fail_count = 0, last_checked = ? WHERE id = ?"
      ).bind(now, id).run()
    } else {
      deadCount++
      const newFailCount = (fail_count || 0) + 1
      const newStatus = newFailCount >= 3 ? 'dead' : 'ok'
      await db.prepare(
        'UPDATE items SET status = ?, fail_count = ?, last_checked = ? WHERE id = ?'
      ).bind(newStatus, newFailCount, now, id).run()
    }
  }

  return { checked: items.length, alive: aliveCount, dead: deadCount }
}
