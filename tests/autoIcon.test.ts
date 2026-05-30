import { describe, it, expect } from 'vitest'
import { getIconKey } from '../functions/lib/autoIcon'

describe('getIconKey', () => {
  it('基于域名生成 key（不含扩展名）', () => {
    expect(getIconKey('https://www.example.com/page')).toBe('www.example.com')
    expect(getIconKey('https://github.com/owner/repo')).toBe('github.com')
    expect(getIconKey('http://sub.domain.co.uk:8080/x')).toBe('sub.domain.co.uk')
  })

  it('对非法 URL 回退为清洗后的字符串', () => {
    expect(getIconKey('not a url')).toBe('not_a_url')
  })
})
