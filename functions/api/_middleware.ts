import { jwtVerify } from 'jose'

interface Env {
  DB: D1Database
  AUTH_PASSWORD: string
  JWT_SECRET: string
}

type CFContext = EventContext<Env, string, unknown>

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequest: PagesFunction<Env> = async (context: CFContext) => {
  const { request } = context
  const method = request.method.toUpperCase()

  // GET requests are public
  if (method === 'GET') {
    return context.next()
  }

  // POST to /api/login is public
  const url = new URL(request.url)
  if (method === 'POST' && url.pathname === '/api/login') {
    return context.next()
  }

  // All other write operations require JWT
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized()
  }

  const token = authHeader.slice(7)
  try {
    const secret = new TextEncoder().encode(context.env.JWT_SECRET)
    await jwtVerify(token, secret)
  } catch {
    return unauthorized()
  }

  return context.next()
}
