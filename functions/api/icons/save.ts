import { getIconKey } from '../../lib/autoIcon'
import { assertSafeUrl } from '../../lib/urlValidation'

interface Env {
  ICONS: R2Bucket
}

const MAX_SIZE = 512 * 1024

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{ url: string; siteUrl?: string }>()

  if (!body.url) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    assertSafeUrl(body.url)
  } catch {
    return new Response(JSON.stringify({ error: 'URL not allowed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const resp = await fetch(body.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecoHub/1.0)' },
      redirect: 'follow',
    })

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: '获取图标失败' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const contentLength = resp.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_SIZE) {
      return new Response(JSON.stringify({ error: '图标文件过大（超过 512KB）' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const contentType = (resp.headers.get('content-type') || 'image/png').split(';')[0].trim()
    const buffer = await resp.arrayBuffer()

    if (buffer.byteLength === 0) {
      return new Response(JSON.stringify({ error: '获取到的图标为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (buffer.byteLength > MAX_SIZE) {
      return new Response(JSON.stringify({ error: '图标文件过大（超过 512KB）' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Determine extension from content type
    let ext = 'png'
    if (contentType.includes('svg')) ext = 'svg'
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg'
    else if (contentType.includes('gif')) ext = 'gif'
    else if (contentType.includes('webp')) ext = 'webp'
    else if (contentType.includes('icon') || contentType.includes('x-icon')) ext = 'ico'

    const base = getIconKey(body.siteUrl || body.url)
    const key = `${base}.${ext}`

    // Overwrite if same domain icon already exists
    await context.env.ICONS.put(key, buffer, {
      httpMetadata: { contentType },
    })

    return new Response(JSON.stringify({
      key,
      url: `/api/icons/${encodeURIComponent(key)}`,
      size: buffer.byteLength,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: '获取图标失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
