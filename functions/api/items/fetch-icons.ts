import { autoFetchIcon } from '../../lib/autoIcon'

interface Env {
  DB: D1Database
  ICONS: R2Bucket
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Find all items without icons
  const result = await context.env.DB.prepare(
    'SELECT id, url FROM items WHERE icon_url IS NULL'
  ).all<{ id: number; url: string }>()

  const items = result.results
  if (items.length === 0) {
    return new Response(JSON.stringify({ success: true, total: 0, fetched: 0, failed: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let fetched = 0
  let failed = 0

  for (const item of items) {
    try {
      const iconUrl = await autoFetchIcon(item.url, context.env.ICONS)
      if (iconUrl) {
        await context.env.DB.prepare(
          'UPDATE items SET icon_url = ?, updated_at = datetime(\'now\') WHERE id = ?'
        ).bind(iconUrl, item.id).run()
        fetched++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return new Response(JSON.stringify({
    success: true,
    total: items.length,
    fetched,
    failed,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
