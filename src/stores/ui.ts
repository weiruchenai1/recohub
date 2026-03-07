import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { api } from '@/lib/api'
import type { Category, CategoryOption, ViewLayout } from '@/types'
import { DEFAULT_CATEGORIES } from '@/types'

export const useUiStore = defineStore('ui', () => {
  const theme = ref<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  )
  const layout = ref<ViewLayout>((localStorage.getItem('layout') as ViewLayout) || 'list')
  const activeTab = ref<Category>(localStorage.getItem('activeTab') || 'software')
  const checklistEnabled = ref(localStorage.getItem('checklistEnabled') === 'true')
  const globalSearch = ref('')
  const localSearch = ref('')
  const page = ref(1)
  const perPage = ref(parseInt(localStorage.getItem('perPage') || '20'))

  const showLoginModal = ref(false)
  const showItemModal = ref(false)
  const pendingAction = ref<(() => void) | null>(null)

  const showConfirmDialog = ref(false)
  const confirmTitle = ref('')
  const confirmMessage = ref('')
  const confirmCallback = ref<(() => void) | null>(null)

  // Settings modal
  const showSettingsModal = ref(false)
  const settingsTab = ref('account')

  // Personalization
  const logoVisible = ref(localStorage.getItem('logoVisible') !== 'false')
  const logoText = ref(localStorage.getItem('logoText') || 'RecoHub')
  // Dynamic categories — loaded from backend, fallback to defaults
  const categories = ref<CategoryOption[]>(DEFAULT_CATEGORIES)
  const categoriesLoaded = ref(false)

  const categoryOptions = computed(() => categories.value)

  async function fetchCategories() {
    try {
      const data = await api.get<CategoryOption[]>('/categories')
      if (data && data.length > 0) {
        categories.value = data
      }
      categoriesLoaded.value = true
    } catch {
      // On failure, keep current value (defaults on first load)
      categoriesLoaded.value = true
    }
  }

  async function addCategory(key: string, label: string) {
    try {
      const created = await api.post<CategoryOption>('/categories', { key, label })
      categories.value = [...categories.value, created]
    } catch {
      // silently fail
    }
  }

  async function removeCategory(index: number) {
    const removed = categories.value[index]
    if (!removed) return
    await api.delete(`/categories/${removed.key}`)
    categories.value = categories.value.filter((_, i) => i !== index)
    if (activeTab.value === removed.key && categories.value.length > 0) {
      activeTab.value = categories.value[0]!.key
    }
  }

  async function updateCategory(index: number, label: string) {
    const item = categories.value[index]
    if (!item) return
    const updated = [...categories.value]
    updated[index] = { ...item, label }
    categories.value = updated
    await syncCategories()
  }

  async function syncCategories() {
    try {
      await api.put('/categories', {
        categories: categories.value.map((cat, i) => ({
          key: cat.key,
          label: cat.label,
          sort_order: i,
        })),
      })
    } catch {
      // silently fail
    }
  }

  function openSettings(tab = 'account') {
    settingsTab.value = tab
    showSettingsModal.value = true
  }

  function confirm(title: string, message: string, onConfirm: () => void) {
    confirmTitle.value = title
    confirmMessage.value = message
    confirmCallback.value = onConfirm
    showConfirmDialog.value = true
  }

  function resolveConfirm() {
    showConfirmDialog.value = false
    if (confirmCallback.value) {
      confirmCallback.value()
      confirmCallback.value = null
    }
  }

  function cancelConfirm() {
    showConfirmDialog.value = false
    confirmCallback.value = null
  }

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

  // Persist to localStorage (only UI preferences, not categories)
  watch(theme, (v) => {
    localStorage.setItem('theme', v)
    document.documentElement.classList.toggle('dark', v === 'dark')
  }, { immediate: true })

  watch(layout, (v) => localStorage.setItem('layout', v))
  watch(activeTab, (v) => localStorage.setItem('activeTab', v))
  watch(checklistEnabled, (v) => localStorage.setItem('checklistEnabled', String(v)))
  watch(perPage, (v) => localStorage.setItem('perPage', String(v)))
  watch(logoVisible, (v) => localStorage.setItem('logoVisible', String(v)))
  watch(logoText, (v) => localStorage.setItem('logoText', v))
  return {
    theme, layout, activeTab, checklistEnabled,
    globalSearch, localSearch, page, perPage,
    showLoginModal, showItemModal, pendingAction,
    showConfirmDialog, confirmTitle, confirmMessage,
    showSettingsModal, settingsTab,
    logoVisible, logoText,
    categories, categoryOptions, categoriesLoaded,
    fetchCategories, addCategory, removeCategory, updateCategory, syncCategories,
    openSettings,
    confirm, resolveConfirm, cancelConfirm,
    toggleTheme, setTab, requireAuthOrLogin, onLoginSuccess,
  }
})
