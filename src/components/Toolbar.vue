<script setup lang="ts">
import { ref } from 'vue'
import SearchDropdown from '@/components/SearchDropdown.vue'
import { useUiStore } from '@/stores/ui'
import { useItemsStore } from '@/stores/items'

const emit = defineEmits<{ refresh: [] }>()

const ui = useUiStore()
const items = useItemsStore()
const localDropdownOpen = ref(false)

function handleAdd() {
  items.startAdd()
  ui.showItemModal = true
}

function onLocalInput() {
  localDropdownOpen.value = ui.localSearch.trim().length > 0
  ui.page = 1
}

function onLocalFocus() {
  if (ui.localSearch.trim()) localDropdownOpen.value = true
}
</script>

<template>
  <div class="flex items-center gap-2 py-3">
    <!-- Local search -->
    <div class="relative min-w-0 flex-1 max-w-[220px]">
      <svg class="absolute left-[9px] top-1/2 -translate-y-1/2 w-[14px] h-[14px] pointer-events-none icon-stroke text-note" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        v-model="ui.localSearch"
        type="text"
        placeholder="筛选当前列表..."
        class="w-full py-1.5 pl-[30px] pr-2.5 text-[13px] border-none rounded-md outline-none text-text bg-search"
        @input="onLocalInput"
        @focus="onLocalFocus"
      />
      <SearchDropdown
        v-if="localDropdownOpen && ui.localSearch.trim()"
        scope="local"
        :keyword="ui.localSearch"
        @close="localDropdownOpen = false"
      />
    </div>

    <!-- Right side actions -->
    <div class="flex items-center ml-auto gap-2">
      <!-- Add button -->
      <button
        @click="handleAdd"
        type="button"
        title="添加"
        class="inline-flex items-center justify-center w-8 h-8 border border-border rounded-md bg-transparent text-note cursor-pointer transition-[background-color,color,border-color] duration-200 hover:text-text hover:bg-header"
      >
        <svg class="w-4 h-4 icon-stroke" viewBox="0 0 24 24">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      <!-- Checklist toggle -->
      <button
        @click="ui.checklistEnabled = !ui.checklistEnabled; items.clearSelection()"
        type="button"
        title="显示复选框"
        class="inline-flex items-center justify-center w-8 h-8 border rounded-md bg-transparent cursor-pointer transition-[background-color,color,border-color] duration-200"
        :class="ui.checklistEnabled ? 'border-link text-link bg-header' : 'border-border text-note hover:text-text hover:bg-header'"
      >
        <svg class="w-4 h-4 icon-stroke" viewBox="0 0 24 24">
          <path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>
        </svg>
      </button>

      <!-- Layout toggle -->
      <div class="inline-flex items-center rounded-md p-0.5 bg-header">
        <button
          @click="ui.layout = 'list'"
          type="button"
          title="列表视图"
          class="inline-flex items-center justify-center w-8 h-7 border-none rounded cursor-pointer transition-[background-color,color,box-shadow] duration-200"
          :class="ui.layout === 'list' ? 'bg-row text-text shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'bg-transparent text-note'"
        >
          <svg class="w-4 h-4 icon-stroke" viewBox="0 0 24 24">
            <line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>
          </svg>
        </button>
        <button
          @click="ui.layout = 'grid'"
          type="button"
          title="网格视图"
          class="inline-flex items-center justify-center w-8 h-7 border-none rounded cursor-pointer transition-[background-color,color,box-shadow] duration-200"
          :class="ui.layout === 'grid' ? 'bg-row text-text shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'bg-transparent text-note'"
        >
          <svg class="w-4 h-4 icon-stroke" viewBox="0 0 24 24">
            <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
