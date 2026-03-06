import { discoverIcons } from '../../lib/autoIcon'
import { assertSafeUrl } from '../../lib/urlValidation'

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
    assertSafeUrl(body.url)
  } catch {
    return new Response(JSON.stringify({ error: 'URL not allowed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const iconUrls = await discoverIcons(body.url)

  return new Response(JSON.stringify({ icons: iconUrls }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
