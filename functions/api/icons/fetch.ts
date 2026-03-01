import { discoverIcons } from '../../lib/autoIcon'

interface Env {}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{ url: string }>()

  if (!body.url) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const parsed = new URL(body.url)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const iconUrls = await discoverIcons(body.url)

  return new Response(JSON.stringify({ icons: iconUrls }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
