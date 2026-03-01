import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api'
import type { LoginResponse } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'))

  const isLoggedIn = computed(() => !!token.value)

  async function login(password: string) {
    const res = await api.post<LoginResponse>('/login', { password })
    token.value = res.token
    localStorage.setItem('auth_token', res.token)
  }

  function logout() {
    token.value = null
    localStorage.removeItem('auth_token')
  }

  return { token, isLoggedIn, login, logout }
})
