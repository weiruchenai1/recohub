import { getIconKey } from '../../lib/autoIcon'
import { assertSafeUrl, safeFetch } from '../../lib/urlValidation'
import { json } from '../../lib/response'

interface Env {
  ICONS: R2Bucket
}

const MAX_SIZE = 512 * 1024

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{ url: string; siteUrl?: string }>()

  if (!body.url) {
    return json({ error: 'URL is required' }, 400)
  }

  try {
    assertSafeUrl(body.url)
  } catch {
    return json({ error: 'URL not allowed' }, 400)
  }

  try {
    // safeFetch 手动跟随重定向并逐跳校验，防止跳转到内网绕过 SSRF 检查
    const resp = await safeFetch(body.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecoHub/1.0)' },
    })

    if (!resp.ok) {
      return json({ error: '获取图标失败' }, 502)
    }

    const contentLength = resp.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_SIZE) {
      return json({ error: '图标文件过大（超过 512KB）' }, 400)
    }

    const contentType = (resp.headers.get('content-type') || 'image/png').split(';')[0].trim()

    // 仅接受图片，避免把任意内容当作图标存入 R2
    if (!contentType.startsWith('image/')) {
      return json({ error: '目标不是图片' }, 400)
    }

    const buffer = await resp.arrayBuffer()

    if (buffer.byteLength === 0) {
      return json({ error: '获取到的图标为空' }, 400)
    }

    if (buffer.byteLength > MAX_SIZE) {
      return json({ error: '图标文件过大（超过 512KB）' }, 400)
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

    return json(
      {
        key,
        url: `/api/icons/${encodeURIComponent(key)}`,
        size: buffer.byteLength,
      },
      201,
    )
  } catch {
    return json({ error: '获取图标失败' }, 500)
  }
}
