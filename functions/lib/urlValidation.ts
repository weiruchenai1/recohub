/**
 * SSRF protection — validate URLs before server-side fetch.
 * Blocks private/internal IP ranges, localhost, and non-http(s) protocols.
 *
 * 注意：受运行平台限制，应用层无法获知 fetch 实际解析到的 IP，
 * 因此无法在代码层完全防御 DNS rebinding（域名解析到内网）。
 * 这一点依赖 Cloudflare Workers 默认不路由到 RFC1918 私有网络来缓解。
 */

const PRIVATE_IPV4_PATTERNS = [
  /^127\./, // loopback
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^169\.254\./, // link-local / 云元数据端点
  /^0\./, // 0.0.0.0/8
]

const BLOCKED_HOSTNAMES = ['localhost']

function isPrivateIPv4(ip: string): boolean {
  return PRIVATE_IPV4_PATTERNS.some((re) => re.test(ip))
}

/** 把十进制整数 / 十六进制等非点分 IPv4 编码归一化为点分十进制，无法识别返回 null */
function normalizeIpv4(host: string): string | null {
  let n: number | null = null
  if (/^\d+$/.test(host)) n = Number(host)
  else if (/^0x[0-9a-f]+$/i.test(host)) n = parseInt(host, 16)
  if (n === null || !Number.isInteger(n) || n < 0 || n > 0xffffffff) return null
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

function isPrivateIP(hostname: string): boolean {
  let host = hostname.toLowerCase()

  // 去掉 IPv6 字面量的方括号
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1)

  // IPv6
  if (host.includes(':')) {
    if (host === '::1' || host === '::') return true // loopback / unspecified
    if (/^fc/.test(host) || /^fd/.test(host)) return true // ULA fc00::/7
    if (/^fe[89ab]/.test(host)) return true // link-local fe80::/10
    // IPv4-mapped：::ffff:127.0.0.1，或 WHATWG 规范化后的十六进制形式 ::ffff:7f00:1
    const mapped = host.match(/^::ffff:(.+)$/)
    if (mapped) {
      const rest = mapped[1]
      if (rest.includes('.')) {
        if (isPrivateIPv4(rest)) return true
      } else {
        const [hiHex, loHex] = rest.split(':')
        const hi = parseInt(hiHex, 16)
        const lo = parseInt(loHex, 16)
        if (Number.isFinite(hi) && Number.isFinite(lo)) {
          const v4 = [(hi >> 8) & 255, hi & 255, (lo >> 8) & 255, lo & 255].join('.')
          if (isPrivateIPv4(v4)) return true
        }
      }
    }
    return false
  }

  // IPv4（含十进制 / 十六进制等编码）
  if (isPrivateIPv4(host)) return true
  const normalized = normalizeIpv4(host)
  if (normalized && isPrivateIPv4(normalized)) return true

  return false
}

/** 检查 URL 是否为有效的 http/https 链接 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 校验 URL 可安全地发起服务端请求（防 SSRF）。不安全则抛出带说明的错误。
 */
export function assertSafeUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https protocols are allowed')
  }

  const hostname = parsed.hostname
  if (BLOCKED_HOSTNAMES.includes(hostname.toLowerCase())) {
    throw new Error('Requests to localhost are not allowed')
  }
  if (isPrivateIP(hostname)) {
    throw new Error('Requests to private/internal IP addresses are not allowed')
  }
}

/**
 * 带 SSRF 校验的 fetch：手动跟随重定向，并对初始 URL 及每一跳目标都执行 assertSafeUrl，
 * 防止「初始 URL 合法但 3xx 跳转到内网」绕过校验。
 */
export async function safeFetch(
  url: string,
  init: RequestInit = {},
  maxRedirects = 3,
): Promise<Response> {
  let current = url
  for (let i = 0; i <= maxRedirects; i++) {
    assertSafeUrl(current)
    const resp = await fetch(current, { ...init, redirect: 'manual' })
    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get('location')
      if (!location) return resp
      current = new URL(location, current).toString()
      continue
    }
    return resp
  }
  throw new Error('Too many redirects')
}
