<script setup lang="ts">
import { watch, toRef } from 'vue'
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
import { useDebouncedRef } from '@/composables/useDebounce'

const ui = useUiStore()
const items = useItemsStore()

const debouncedLocal = useDebouncedRef(toRef(ui, 'localSearch'), 300)

function loadItems() {
  items.fetchItems({
    category: ui.activeTab,
    page: ui.page,
    perPage: ui.perPage,
    q: debouncedLocal.value || undefined,
  })
}

watch(
  () => [ui.activeTab, ui.page, ui.perPage, debouncedLocal.value],
  () => {
    items.clearSelection()
    loadItems()
  },
  { immediate: true },
)
</script>

<template>
  <!-- Wallpaper layer -->
  <div
    v-if="ui.wallpaper"
    class="fixed inset-0 z-0 transition-[background] duration-500"
    :style="{ background: ui.wallpaper }"
  ></div>

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
        @edit="(item) => { items.startEdit(item); ui.showItemModal = true }"
        @deleted="loadItems"
      />
      <ItemGrid
        v-else
        @edit="(item) => { items.startEdit(item); ui.showItemModal = true }"
        @deleted="loadItems"
      />
    </template>

    <PaginationBar v-if="items.total > 0" />
  </div>

  <FloatingToolbar @refresh="loadItems" />
  <ItemModal v-if="ui.showItemModal" @close="ui.showItemModal = false" @saved="loadItems" />
  <LoginModal v-if="ui.showLoginModal" @close="ui.showLoginModal = false" />
  <ConfirmDialog v-if="ui.showConfirmDialog" />
  <SettingsModal v-if="ui.showSettingsModal" />
</template>
