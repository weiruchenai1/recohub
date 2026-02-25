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
    class="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between h-14 px-6 border-b transition-[background-color,border-color] duration-300"
    :style="{
      backgroundColor: 'var(--navbar-bg)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderColor: 'var(--border-color)',
    }"
  >
    <span class="text-base font-semibold whitespace-nowrap shrink-0 hidden md:block" style="color: var(--text-color)">推荐列表</span>

    <div class="flex-1 max-w-[420px] mx-6 relative">
      <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] pointer-events-none" style="fill:none;stroke:var(--note-color);stroke-width:2;stroke-linecap:round;stroke-linejoin:round" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        v-model="ui.globalSearch"
        type="text"
        placeholder="全局搜索..."
        class="w-full py-[7px] pl-8 pr-3 text-sm border-none rounded-lg outline-none transition-[background-color] duration-200"
        :style="{ color: 'var(--text-color)', backgroundColor: 'var(--search-bg)', fontFamily: 'inherit' }"
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
