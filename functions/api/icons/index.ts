/// <reference types="@cloudflare/workers-types" />

import { getIconKey } from '../../lib/autoIcon'

interface Env {
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

  return new Response(JSON.stringify(icons), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const formData = await context.request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return new Response(JSON.stringify({ error: '未选择文件' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return new Response(JSON.stringify({ error: '不支持的文件类型，仅支持 PNG/JPEG/GIF/SVG/ICO/WebP' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (file.size > MAX_SIZE) {
    return new Response(JSON.stringify({ error: '文件大小不能超过 512KB' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const siteUrl = formData.get('siteUrl') as string | null
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const key = siteUrl ? `${getIconKey(siteUrl)}.${ext}` : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  // Overwrite if same domain icon already exists
  await context.env.ICONS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  })

  return new Response(JSON.stringify({
    key,
    url: `/api/icons/${encodeURIComponent(key)}`,
    size: file.size,
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}
