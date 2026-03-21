import { jwtVerify } from 'jose'
import { json } from './response'

/** 从请求中手动校验 JWT，返回 null 表示验证通过，否则返回 401 响应 */
export async function requireAuth(request: Request, jwtSecret: string): Promise<Response | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }
  try {
    const secret = new TextEncoder().encode(jwtSecret)
    await jwtVerify(authHeader.slice(7), secret)
    return null
  } catch {
    return json({ error: 'Unauthorized' }, 401)
  }
}
