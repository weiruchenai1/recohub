/// <reference types="@cloudflare/workers-types" />

import { json } from '../../lib/response'

interface Env {
  DB: D1Database
  ICONS: R2Bucket
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const key = decodeURIComponent((context.params as { key: string }).key)
  const object = await context.env.ICONS.get(key)

  if (!object) {
    return json({ error: 'Icon not found' }, 404)
  }

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('ETag', object.httpEtag)

  return new Response(object.body, { headers })
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const key = decodeURIComponent((context.params as { key: string }).key)
  const object = await context.env.ICONS.get(key)

  if (!object) {
    return json({ error: 'Icon not found' }, 404)
  }

  await context.env.ICONS.delete(key)

  // Clear icon_url references in items
  const iconUrl = `/api/icons/${encodeURIComponent(key)}`
  await context.env.DB.prepare(
    "UPDATE items SET icon_url = NULL, updated_at = datetime('now') WHERE icon_url = ?"
  ).bind(iconUrl).run()

  return json({ success: true })
}
