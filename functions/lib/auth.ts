import { jwtVerify } from 'jose'
import { json } from './response'

/**
 * 从请求中手动校验 JWT。返回 null 表示通过，否则返回错误响应。
 * 默认要求管理员身份（role === 'admin'）；传入 requiredRole 可指定其它角色，
 * 传入 null 则只校验 token 有效性、不限角色。
 */
export async function requireAuth(
  request: Request,
  jwtSecret: string,
  requiredRole: string | null = 'admin',
): Promise<Response | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }
  try {
    const secret = new TextEncoder().encode(jwtSecret)
    const { payload } = await jwtVerify(authHeader.slice(7), secret)
    if (requiredRole && payload.role !== requiredRole) {
      return json({ error: 'Forbidden' }, 403)
    }
    return null
  } catch {
    return json({ error: 'Unauthorized' }, 401)
  }
}
