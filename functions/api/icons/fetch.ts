import { discoverIcons } from '../../lib/autoIcon'
import { assertSafeUrl } from '../../lib/urlValidation'
import { json } from '../../lib/response'

interface Env {}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{ url: string }>()

  if (!body.url) {
    return json({ error: 'URL is required' }, 400)
  }

  try {
    assertSafeUrl(body.url)
  } catch {
    return json({ error: 'URL not allowed' }, 400)
  }

  const iconUrls = await discoverIcons(body.url)

  return json({ icons: iconUrls })
}
