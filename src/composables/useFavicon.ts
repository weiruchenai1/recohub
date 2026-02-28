import { ref } from 'vue'

export function useFavicon(_url: string, iconUrl?: string | null) {
  const faviconUrl = ref(iconUrl || '')
  const loaded = ref(!!iconUrl)

  return { faviconUrl, loaded }
}
