import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Category, ViewLayout } from '@/types'

export const useUiStore = defineStore('ui', () => {
  const theme = ref<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  )
  const layout = ref<ViewLayout>((localStorage.getItem('layout') as ViewLayout) || 'list')
  const activeTab = ref<Category>((localStorage.getItem('activeTab') as Category) || 'software')
  const checklistEnabled = ref(localStorage.getItem('checklistEnabled') === 'true')
  const globalSearch = ref('')
  const localSearch = ref('')
  const page = ref(1)
  const perPage = ref(parseInt(localStorage.getItem('perPage') || '20'))

  const showLoginModal = ref(false)
  const showItemModal = ref(false)
  const pendingAction = ref<(() => void) | null>(null)

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function setTab(tab: Category) {
    activeTab.value = tab
    page.value = 1
    localSearch.value = ''
  }

  function requireAuthOrLogin(action: () => void, isLoggedIn: boolean) {
    if (isLoggedIn) {
      action()
    } else {
      pendingAction.value = action
      showLoginModal.value = true
    }
  }

  function onLoginSuccess() {
    showLoginModal.value = false
    if (pendingAction.value) {
      pendingAction.value()
      pendingAction.value = null
    }
  }

  // Persist to localStorage
  watch(theme, (v) => {
    localStorage.setItem('theme', v)
    document.documentElement.classList.toggle('dark', v === 'dark')
  }, { immediate: true })

  watch(layout, (v) => localStorage.setItem('layout', v))
  watch(activeTab, (v) => localStorage.setItem('activeTab', v))
  watch(checklistEnabled, (v) => localStorage.setItem('checklistEnabled', String(v)))
  watch(perPage, (v) => localStorage.setItem('perPage', String(v)))

  return {
    theme, layout, activeTab, checklistEnabled,
    globalSearch, localSearch, page, perPage,
    showLoginModal, showItemModal, pendingAction,
    toggleTheme, setTab, requireAuthOrLogin, onLoginSuccess,
  }
})
