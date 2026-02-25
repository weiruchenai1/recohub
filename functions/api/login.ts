import { SignJWT } from 'jose'

interface Env {
  AUTH_PASSWORD: string
  JWT_SECRET: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const body = await request.json<{ password: string }>()

  if (!body.password || body.password !== env.AUTH_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Invalid password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const secret = new TextEncoder().encode(env.JWT_SECRET)
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)

  return new Response(JSON.stringify({ token }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
