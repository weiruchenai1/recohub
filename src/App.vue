<script setup lang="ts">
import { watch, computed, toRef, onMounted, ref } from 'vue'
import Navbar from '@/components/Navbar.vue'
import TabBar from '@/components/TabBar.vue'
import Toolbar from '@/components/Toolbar.vue'
import ItemTable from '@/components/ItemTable.vue'
import ItemGrid from '@/components/ItemGrid.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import FloatingToolbar from '@/components/FloatingToolbar.vue'
import ItemModal from '@/components/ItemModal.vue'
import LoginModal from '@/components/LoginModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import { useUiStore } from '@/stores/ui'
import { useItemsStore } from '@/stores/items'
import { useAuthStore } from '@/stores/auth'
import { useSubmissionsStore } from '@/stores/submissions'
import { useDebouncedRef } from '@/composables/useDebounce'

const ui = useUiStore()
const items = useItemsStore()
const auth = useAuthStore()
const submissionsStore = useSubmissionsStore()

const oauthMessage = ref('')

// Handle OAuth callback parameters
onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const oauthToken = params.get('oauth_token')
  const oauthError = params.get('oauth_error')

  if (oauthToken) {
    auth.loginWithOAuthToken(oauthToken)
    oauthMessage.value = `欢迎，${auth.visitorInfo?.linuxdo_name || auth.visitorInfo?.linuxdo_username || 'Linux DO 用户'}`
  } else if (oauthError) {
    oauthMessage.value = oauthError
  }

  if (oauthMessage.value) {
    setTimeout(() => { oauthMessage.value = '' }, oauthToken ? 3000 : 5000)
    window.history.replaceState({}, '', window.location.pathname)
  }
})

// Load categories from backend on startup
ui.fetchCategories()

// Fetch pending count if already logged in
if (auth.isLoggedIn) {
  submissionsStore.fetchPendingCount()
}

// Lock body scroll when any modal is open
const anyModalOpen = computed(() =>
  ui.showSettingsModal || ui.showItemModal || ui.showLoginModal || ui.showConfirmDialog
)
watch(anyModalOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

const debouncedLocal = useDebouncedRef(toRef(ui, 'localSearch'), 300)

function loadItems() {
  items.fetchItems({
    category: ui.activeTab,
    page: ui.page,
    perPage: ui.perPage,
    q: debouncedLocal.value || undefined,
  }).then(() => {
    if (items.items.length === 0 && ui.page > 1) {
      ui.page = Math.max(1, Math.ceil(items.total / ui.perPage))
    }
  })
}

watch(
  () => [ui.activeTab, ui.perPage, debouncedLocal.value],
  () => {
    items.clearSelection()
    loadItems()
  },
  { immediate: true },
)

watch(() => ui.page, () => {
  loadItems()
})
</script>

<template>
  <Navbar />
  <div class="max-w-[1200px] mx-auto w-[95%] relative z-[1]">
    <TabBar />
    <Toolbar @refresh="loadItems" />

    <div v-if="items.loading && !items.initialized" class="text-center py-12 text-note">
      加载中...
    </div>

    <template v-else>
      <ItemTable
        v-if="ui.layout === 'list'"
      />
      <ItemGrid
        v-else
      />
    </template>

    <PaginationBar v-if="items.total > 0" />
  </div>

  <FloatingToolbar @refresh="loadItems" />
  <ItemModal v-if="ui.showItemModal" @close="ui.showItemModal = false" @saved="loadItems" />
  <LoginModal v-if="ui.showLoginModal" @close="ui.showLoginModal = false; ui.loginAdminOnly = false" />
  <ConfirmDialog v-if="ui.showConfirmDialog" />
  <SettingsModal v-if="ui.showSettingsModal" />

  <!-- OAuth toast -->
  <Transition name="toast">
    <div
      v-if="oauthMessage"
      class="fixed top-20 left-1/2 -translate-x-1/2 z-[3000] px-5 py-3 rounded-xl text-sm font-medium shadow-lg bg-row border border-border text-text"
    >
      {{ oauthMessage }}
    </div>
  </Transition>
</template>
