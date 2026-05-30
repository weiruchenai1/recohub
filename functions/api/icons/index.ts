/// <reference types="@cloudflare/workers-types" />

import { getIconKey } from '../../lib/autoIcon'
import { json } from '../../lib/response'

interface Env {
  DB: D1Database
  ICONS: R2Bucket
}

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/webp',
])

const MAX_SIZE = 512 * 1024 // 512KB

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const list = await context.env.ICONS.list()

  const icons = list.objects.map((obj) => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded.toISOString(),
    url: `/api/icons/${encodeURIComponent(obj.key)}`,
  }))

  return json(icons)
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const list = await context.env.ICONS.list()

  if (list.objects.length === 0) {
    return json({ success: true, deleted: 0 })
  }

  // Delete all icon objects from R2
  await Promise.all(list.objects.map((obj) => context.env.ICONS.delete(obj.key)))

  // Clear all icon_url references in items
  await context.env.DB.prepare(
    "UPDATE items SET icon_url = NULL, updated_at = datetime('now') WHERE icon_url IS NOT NULL"
  ).run()

  return json({ success: true, deleted: list.objects.length })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const formData = await context.request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return json({ error: '未选择文件' }, 400)
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return json({ error: '不支持的文件类型，仅支持 PNG/JPEG/GIF/SVG/ICO/WebP' }, 400)
  }

  if (file.size > MAX_SIZE) {
    return json({ error: '文件大小不能超过 512KB' }, 400)
  }

  const siteUrl = formData.get('siteUrl') as string | null
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const key = siteUrl ? `${getIconKey(siteUrl)}.${ext}` : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  // Overwrite if same domain icon already exists
  await context.env.ICONS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  })

  return json(
    {
      key,
      url: `/api/icons/${encodeURIComponent(key)}`,
      size: file.size,
    },
    201,
  )
}
