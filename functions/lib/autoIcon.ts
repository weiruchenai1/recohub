const MAX_SIZE = 512 * 1024

function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url.replace(/[^a-zA-Z0-9.-]/g, '_')
  }
}

function getExtFromContentType(contentType: string): string {
  if (contentType.includes('svg')) return 'svg'
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
  if (contentType.includes('gif')) return 'gif'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('icon') || contentType.includes('x-icon')) return 'ico'
  return 'png'
}

/**
 * Discover icon URLs from a website: parse HTML <link> tags, then /favicon.ico, then Google S2.
 */
async function discoverIcons(siteUrl: string): Promise<string[]> {
  const baseUrl = new URL(siteUrl)
  const iconUrls: string[] = []
  const seen = new Set<string>()

  function addIcon(href: string) {
    try {
      const resolved = new URL(href, baseUrl).toString()
      if (!seen.has(resolved)) {
        seen.add(resolved)
        iconUrls.push(resolved)
      }
    } catch {
      // invalid URL, skip
    }
  }

  // 1. Parse HTML for <link rel="icon"> / <link rel="apple-touch-icon">
  try {
    const resp = await fetch(baseUrl.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecoHub/1.0)' },
      redirect: 'follow',
    })

    if (resp.ok) {
      const hrefs: string[] = []
      const transformed = new HTMLRewriter()
        .on('link', {
          element(el) {
            const rel = (el.getAttribute('rel') || '').toLowerCase()
            const href = el.getAttribute('href')
            if (href && (rel.includes('icon') || rel.includes('apple-touch'))) {
              hrefs.push(href)
            }
          },
        })
        .transform(resp)

      await transformed.text()
      for (const href of hrefs) {
        addIcon(href)
      }
    }
  } catch {
    // network error, continue with fallbacks
  }

  // 2. Fallback: /favicon.ico
  addIcon(`${baseUrl.origin}/favicon.ico`)

  // 3. Fallback: Google S2
  const googleUrl = `https://www.google.com/s2/favicons?sz=64&domain=${baseUrl.hostname}`
  if (!seen.has(googleUrl)) {
    iconUrls.push(googleUrl)
  }

  return iconUrls
}

/**
 * Download icon from URL, validate, and return buffer + metadata.
 * Returns null if download fails or icon is invalid.
 */
async function downloadIcon(iconUrl: string): Promise<{
  buffer: ArrayBuffer
  contentType: string
  ext: string
} | null> {
  try {
    const resp = await fetch(iconUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecoHub/1.0)' },
      redirect: 'follow',
    })

    if (!resp.ok) return null

    const contentType = (resp.headers.get('content-type') || 'image/png').split(';')[0].trim()

    // Skip if not an image
    if (!contentType.startsWith('image/')) return null

    const buffer = await resp.arrayBuffer()
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_SIZE) return null

    return { buffer, contentType, ext: getExtFromContentType(contentType) }
  } catch {
    return null
  }
}

/**
 * Auto-fetch the best icon for a website URL and save to R2.
 * Tries each discovered icon in priority order until one succeeds.
 * Returns the icon_url path (e.g. "/api/icons/github.com.png") or null.
 */
export async function autoFetchIcon(
  siteUrl: string,
  icons: R2Bucket,
): Promise<string | null> {
  try {
    const iconUrls = await discoverIcons(siteUrl)

    for (const iconUrl of iconUrls) {
      const result = await downloadIcon(iconUrl)
      if (!result) continue

      const domain = getDomain(siteUrl)
      const key = `${domain}.${result.ext}`

      await icons.put(key, result.buffer, {
        httpMetadata: { contentType: result.contentType },
      })

      return `/api/icons/${encodeURIComponent(key)}`
    }
  } catch {
    // auto-fetch is best-effort
  }

  return null
}
