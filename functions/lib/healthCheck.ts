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
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      }
      // Only 404/410 means the page is truly gone.
      // Other HTTP errors (403, 5xx) usually mean WAF/bot-detection blocking,
      // not that the site is down — the server IS responding.
      const isDead = (status: number) => status === 404 || status === 410
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 20000)
        const resp = await fetch(item.url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
          headers,
        })
        clearTimeout(timeout)
        if (!isDead(resp.status)) return { ...item, alive: true }
        // HEAD returned 404/410, fallback to GET to confirm
        const controller2 = new AbortController()
        const timeout2 = setTimeout(() => controller2.abort(), 20000)
        const resp2 = await fetch(item.url, {
          method: 'GET',
          signal: controller2.signal,
          redirect: 'follow',
          headers,
        })
        clearTimeout(timeout2)
        return { ...item, alive: !isDead(resp2.status) }
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
