import { SignJWT } from 'jose'

interface Env {
  JWT_SECRET: string
  LINUXDO_CLIENT_ID: string
  LINUXDO_CLIENT_SECRET: string
  SITE_URL: string
}

const TOKEN_URL = 'https://connect.linux.do/oauth2/token'
const USER_INFO_URL = 'https://connect.linux.do/api/user'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  // SITE_URL for dev (Vite on different port), fall back to url.origin for production
  const origin = env.SITE_URL || url.origin

  if (!code) {
    return redirectWithError(origin, '缺少授权码')
  }

  if (!env.LINUXDO_CLIENT_ID || !env.LINUXDO_CLIENT_SECRET) {
    return redirectWithError(origin, 'Linux DO OAuth 未配置')
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: env.LINUXDO_CLIENT_ID,
        client_secret: env.LINUXDO_CLIENT_SECRET,
        code,
        redirect_uri: `${origin}/api/oauth/linuxdo`,
        grant_type: 'authorization_code',
      }).toString(),
    })

    if (!tokenRes.ok) {
      return redirectWithError(origin, '获取访问令牌失败')
    }

    const tokenData = await tokenRes.json<{ access_token?: string }>()
    if (!tokenData.access_token) {
      return redirectWithError(origin, '获取访问令牌失败')
    }

    // Fetch user info
    const userRes = await fetch(USER_INFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    if (!userRes.ok) {
      return redirectWithError(origin, '获取用户信息失败')
    }

    const userInfo = await userRes.json<{
      id: number
      username: string
      name: string
      avatar_template: string
      trust_level: number
      active: boolean
      silenced: boolean
    }>()

    if (!userInfo.active) {
      return redirectWithError(origin, '账号未激活')
    }
    if (userInfo.silenced) {
      return redirectWithError(origin, '账号已被禁言')
    }

    // Build avatar URL from template
    let avatarUrl = ''
    if (userInfo.avatar_template) {
      const tpl = userInfo.avatar_template.replace('{size}', '120')
      avatarUrl = tpl.startsWith('http') ? tpl : `https://linux.do${tpl}`
    }

    // Issue visitor JWT
    const secret = new TextEncoder().encode(env.JWT_SECRET)
    const token = await new SignJWT({
      role: 'visitor',
      linuxdo_id: userInfo.id,
      linuxdo_username: userInfo.username,
      linuxdo_name: userInfo.name,
      linuxdo_avatar: avatarUrl,
      trust_level: userInfo.trust_level,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${origin}/?oauth_token=${encodeURIComponent(token)}`,
      },
    })
  } catch {
    return redirectWithError(origin, '登录过程出错')
  }
}

function redirectWithError(origin: string, message: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${origin}/?oauth_error=${encodeURIComponent(message)}`,
    },
  })
}
