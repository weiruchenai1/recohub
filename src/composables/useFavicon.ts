import { ref } from 'vue'

export function useFavicon(iconUrl?: string | null) {
  const faviconUrl = ref(iconUrl || '')
  return { faviconUrl }
}
