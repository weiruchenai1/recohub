<script setup lang="ts">
import { ref } from 'vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import SearchDropdown from '@/components/SearchDropdown.vue'
import { useUiStore } from '@/stores/ui'
const ui = useUiStore()
const globalDropdownOpen = ref(false)

function onGlobalInput() {
  globalDropdownOpen.value = ui.globalSearch.trim().length > 0
}

function onGlobalFocus() {
  if (ui.globalSearch.trim()) globalDropdownOpen.value = true
}
</script>

<template>
  <nav
    class="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between h-14 px-6 border-b border-border bg-navbar backdrop-blur-[20px] backdrop-saturate-[180%] transition-[background-color,border-color] duration-300"
  >
    <div class="flex items-center gap-2 shrink-0">
      <svg class="h-6 w-auto" viewBox="44 32 116 136" fill="none">
        <path d="M52 160V40h50a34 34 0 0 1 0 68l50 52h-32L78 108v52Z M78 60h16a14 14 0 0 1 0 28H78Z" fill="currentColor" fill-rule="evenodd"/>
      </svg>
      <span class="text-base font-semibold whitespace-nowrap hidden md:block text-text">RecoHub</span>
    </div>

    <div class="flex-1 max-w-[420px] mx-6 relative">
      <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] pointer-events-none icon-stroke text-note" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        v-model="ui.globalSearch"
        type="text"
        placeholder="全局搜索..."
        class="w-full py-[7px] pl-8 pr-3 text-sm border-none rounded-lg outline-none transition-[background-color] duration-200 text-text bg-search"
        @input="onGlobalInput"
        @focus="onGlobalFocus"
      />
      <SearchDropdown
        v-if="globalDropdownOpen && ui.globalSearch.trim()"
        scope="global"
        :keyword="ui.globalSearch"
        @close="globalDropdownOpen = false"
      />
    </div>

    <div class="flex items-center shrink-0">
      <ThemeToggle />
    </div>
  </nav>
</template>
