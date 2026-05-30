import { SignJWT } from 'jose'
import { json } from '../lib/response'

interface Env {
  DB: D1Database
  AUTH_PASSWORD: string
  JWT_SECRET: string
}

const MAX_ATTEMPTS = 5 // 窗口内最大失败次数
const WINDOW_MINUTES = 15 // 滑动窗口（分钟）

/** 常量时间字符串比较，避免密码比较产生时序侧信道 */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  // 即使长度不同也走完整循环，尽量不通过耗时泄露长度
  let diff = ab.length ^ bb.length
  const len = Math.max(ab.length, bb.length)
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0)
  }
  return diff === 0
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const db = env.DB
  const ip =
    request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown'

  // IP 失败限流（滑动窗口）：窗口内失败次数达上限直接拒绝，防暴力破解
  const recent = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM login_attempts WHERE ip = ? AND created_at > datetime('now', '-${WINDOW_MINUTES} minutes')`,
    )
    .bind(ip)
    .first<{ cnt: number }>()
  if (recent && recent.cnt >= MAX_ATTEMPTS) {
    return json({ error: `尝试过于频繁，请 ${WINDOW_MINUTES} 分钟后再试` }, 429)
  }

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  if (!body.password || !timingSafeEqual(body.password, env.AUTH_PASSWORD)) {
    // 记录失败，并顺手清理 1 小时前的旧记录避免表无限增长
    await db.batch([
      db.prepare('INSERT INTO login_attempts (ip) VALUES (?)').bind(ip),
      db.prepare(`DELETE FROM login_attempts WHERE created_at < datetime('now', '-1 hour')`),
    ])
    return json({ error: '密码错误' }, 401)
  }

  // 登录成功，清除该 IP 的失败记录
  await db.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run()

  const secret = new TextEncoder().encode(env.JWT_SECRET)
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)

  return json({ token })
}
