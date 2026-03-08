import { autoFetchIcon } from '../../lib/autoIcon'

interface Env {
  DB: D1Database
  ICONS: R2Bucket
}

const CONCURRENCY = 5

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Find all items without icons
  const result = await context.env.DB.prepare(
    'SELECT id, url, name FROM items WHERE icon_url IS NULL'
  ).all<{ id: number; url: string; name: string }>()

  const items = result.results
  const total = items.length

  if (total === 0) {
    return new Response('{"type":"done","total":0,"fetched":0,"failed":0}\n', {
      headers: { 'Content-Type': 'application/x-ndjson' },
    })
  }

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const write = (obj: Record<string, unknown>) =>
    writer.write(encoder.encode(JSON.stringify(obj) + '\n'))

  // Process in background, stream progress
  ;(async () => {
    let fetched = 0
    let failed = 0
    let completed = 0

    // Process items in batches of CONCURRENCY
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const batch = items.slice(i, i + CONCURRENCY)

      const results = await Promise.all(batch.map(async (item) => {
        let status = 'failed'
        try {
          const iconUrl = await autoFetchIcon(item.url, context.env.ICONS)
          if (iconUrl) {
            await context.env.DB.prepare(
              'UPDATE items SET icon_url = ?, updated_at = datetime(\'now\') WHERE id = ?'
            ).bind(iconUrl, item.id).run()
            status = 'ok'
          }
        } catch {
          // failed
        }
        return { name: item.name, status }
      }))

      for (const r of results) {
        if (r.status === 'ok') fetched++
        else failed++
        completed++
        await write({ type: 'progress', current: completed, total, name: r.name, status: r.status })
      }
    }

    await write({ type: 'done', total, fetched, failed })
    await writer.close()
  })()

  return new Response(readable, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}
