interface Env {}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{ url: string }>()

  if (!body.url) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let baseUrl: URL
  try {
    baseUrl = new URL(body.url)
    if (!['http:', 'https:'].includes(baseUrl.protocol)) throw new Error()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

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

  // Fallback: /favicon.ico
  addIcon(`${baseUrl.origin}/favicon.ico`)

  // Fallback: Google S2 favicon at 64px
  const googleUrl = `https://www.google.com/s2/favicons?sz=64&domain=${baseUrl.hostname}`
  if (!seen.has(googleUrl)) {
    iconUrls.push(googleUrl)
  }

  return new Response(JSON.stringify({ icons: iconUrls }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
