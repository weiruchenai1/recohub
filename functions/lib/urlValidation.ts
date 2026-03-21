/**
 * SSRF protection — validate URLs before server-side fetch.
 * Blocks private/internal IP ranges, localhost, and non-http(s) protocols.
 */

const PRIVATE_IP_PATTERNS = [
  /^127\./, // loopback
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^169\.254\./, // link-local
  /^0\./, // 0.0.0.0/8
]

const BLOCKED_HOSTNAMES = ['localhost', '[::1]']

function isPrivateIP(hostname: string): boolean {
  // Check IPv6 loopback
  if (hostname === '[::1]' || hostname === '::1') return true

  // Check IPv4 patterns
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) return true
  }

  return false
}

/**
 * Validate that a URL is safe to fetch (no SSRF).
 * Throws an error with a descriptive message if the URL is unsafe.
 */
/** 检查 URL 是否为有效的 http/https 链接 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

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
