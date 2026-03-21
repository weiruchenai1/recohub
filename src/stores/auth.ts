import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api'
import type { LoginResponse } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const visitorToken = ref<string | null>(localStorage.getItem('visitor_token'))

  const isLoggedIn = computed(() => !!token.value)
  const isVisitorLoggedIn = computed(() => !!visitorToken.value)

  // Decode visitor info from JWT payload (base64url)
  const visitorInfo = computed(() => {
    if (!visitorToken.value) return null
    try {
      const payload = visitorToken.value.split('.')[1]
      if (!payload) return null
      const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
      const decoded = JSON.parse(new TextDecoder().decode(bytes))
      return {
        linuxdo_id: decoded.linuxdo_id as number,
        linuxdo_username: decoded.linuxdo_username as string,
        linuxdo_name: decoded.linuxdo_name as string,
        linuxdo_avatar: decoded.linuxdo_avatar as string,
        trust_level: decoded.trust_level as number,
      }
    } catch {
      return null
    }
  })

  async function login(password: string) {
    const res = await api.post<LoginResponse>('/login', { password })
    token.value = res.token
    localStorage.setItem('auth_token', res.token)
  }

  function loginWithOAuthToken(oauthToken: string) {
    visitorToken.value = oauthToken
    localStorage.setItem('visitor_token', oauthToken)
  }

  function logout() {
    token.value = null
    localStorage.removeItem('auth_token')
  }

  function visitorLogout() {
    visitorToken.value = null
    localStorage.removeItem('visitor_token')
  }

  return {
    token, visitorToken,
    isLoggedIn, isVisitorLoggedIn, visitorInfo,
    login, loginWithOAuthToken, logout, visitorLogout,
  }
})
