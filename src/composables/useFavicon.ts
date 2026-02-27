import { ref } from 'vue'

const CACHE_PREFIX = 'favicon_'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

interface CachedFavicon {
  url: string
  timestamp: number
}

function getCached(domain: string): string | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + domain)
    if (!raw) return null
    const cached: CachedFavicon = JSON.parse(raw)
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + domain)
      return null
    }
    return cached.url
  } catch {
    return null
  }
}

function setCache(domain: string, url: string) {
  try {
    localStorage.setItem(CACHE_PREFIX + domain, JSON.stringify({
      url,
      timestamp: Date.now(),
    }))
  } catch {
    // localStorage full, ignore
  }
}

export function useFavicon(url: string, iconUrl?: string | null) {
  const faviconUrl = ref<string>('')
  const loaded = ref(false)

  // If a custom icon URL is provided, use it directly
  if (iconUrl) {
    faviconUrl.value = iconUrl
    loaded.value = true
    return { faviconUrl, loaded }
  }

  try {
    const domain = new URL(url).hostname
    const cached = getCached(domain)
    if (cached) {
      faviconUrl.value = cached
      loaded.value = true
      return { faviconUrl, loaded }
    }

    // Google S2 favicon API
    const googleUrl = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`
    faviconUrl.value = googleUrl

    // Verify it loads
    const img = new Image()
    img.onload = () => {
      setCache(domain, googleUrl)
      loaded.value = true
    }
    img.onerror = () => {
      // Fallback to direct /favicon.ico
      const fallback = `https://${domain}/favicon.ico`
      faviconUrl.value = fallback
      const img2 = new Image()
      img2.onload = () => {
        setCache(domain, fallback)
        loaded.value = true
      }
      img2.onerror = () => {
        faviconUrl.value = ''
        loaded.value = false
      }
      img2.src = fallback
    }
    img.src = googleUrl
  } catch {
    faviconUrl.value = ''
  }

  return { faviconUrl, loaded }
}
