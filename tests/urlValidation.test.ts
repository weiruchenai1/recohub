import { describe, it, expect } from 'vitest'
import { assertSafeUrl, isValidHttpUrl, safeFetch } from '../functions/lib/urlValidation'

describe('isValidHttpUrl', () => {
  it('接受 http / https', () => {
    expect(isValidHttpUrl('http://example.com')).toBe(true)
    expect(isValidHttpUrl('https://example.com/path?q=1')).toBe(true)
  })

  it('拒绝非 http(s) 协议与非法 URL', () => {
    expect(isValidHttpUrl('ftp://example.com')).toBe(false)
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isValidHttpUrl('not a url')).toBe(false)
  })
})

describe('assertSafeUrl', () => {
  const blocked = (url: string) => expect(() => assertSafeUrl(url), url).toThrow()
  const ok = (url: string) => expect(() => assertSafeUrl(url), url).not.toThrow()

  it('允许公网 http/https', () => {
    ok('https://example.com')
    ok('http://8.8.8.8/favicon.ico')
    ok('https://github.com/owner/repo')
    ok('http://172.32.0.1') // 172.32+ 不属于私有段
  })

  it('拒绝非 http(s) 协议', () => {
    blocked('ftp://example.com')
    blocked('file:///etc/passwd')
    blocked('data:text/html,x')
  })

  it('拒绝 localhost 与私有 IPv4 段', () => {
    blocked('http://localhost')
    blocked('http://127.0.0.1')
    blocked('http://127.1.2.3')
    blocked('http://10.0.0.1')
    blocked('http://172.16.0.1')
    blocked('http://172.31.255.255')
    blocked('http://192.168.1.1')
    blocked('http://169.254.169.254') // 云元数据端点
    blocked('http://0.0.0.0')
  })

  it('拒绝 IPv4 的十进制 / 十六进制编码（WHATWG 归一化后仍命中）', () => {
    blocked('http://2130706433') // = 127.0.0.1
    blocked('http://0x7f000001') // = 127.0.0.1
  })

  it('拒绝 IPv6 loopback / ULA / link-local / IPv4-mapped', () => {
    blocked('http://[::1]')
    blocked('http://[fc00::1]')
    blocked('http://[fd12:3456::1]')
    blocked('http://[fe80::1]')
    blocked('http://[::ffff:127.0.0.1]') // IPv4-mapped，会被规范化为 ::ffff:7f00:1
  })
})

describe('safeFetch', () => {
  it('对不安全的初始 URL 直接抛错，不发起请求', async () => {
    await expect(safeFetch('http://169.254.169.254/latest/meta-data')).rejects.toThrow()
    await expect(safeFetch('http://127.0.0.1')).rejects.toThrow()
  })
})
