<script setup lang="ts">
import { ref } from 'vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import SearchDropdown from '@/components/SearchDropdown.vue'
import AccountDropdown from '@/components/AccountDropdown.vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'

const ui = useUiStore()
const auth = useAuthStore()
const globalDropdownOpen = ref(false)
const accountDropdownOpen = ref(false)

function onGlobalInput() {
  globalDropdownOpen.value = ui.globalSearch.trim().length > 0
}

function onGlobalFocus() {
  if (ui.globalSearch.trim()) globalDropdownOpen.value = true
}

function onAccountClick() {
  if (auth.isLoggedIn) {
    accountDropdownOpen.value = !accountDropdownOpen.value
  } else {
    ui.showLoginModal = true
  }
}
</script>

<template>
  <nav
    class="fixed top-0 left-0 right-0 z-[1000] flex items-center h-14 px-4 border-b border-border bg-navbar backdrop-blur-[20px] backdrop-saturate-[180%] transition-[background-color,border-color] duration-300"
  >
    <!-- Left -->
    <div class="flex-none md:flex-1 flex items-center min-w-0">
      <div v-if="ui.logoVisible" class="flex items-center gap-2 shrink-0">
        <svg class="h-6 w-auto" viewBox="44 32 116 136" fill="none">
          <path d="M52 160V40h50a34 34 0 0 1 0 68l50 52h-32L78 108v52Z M78 60h16a14 14 0 0 1 0 28H78Z" fill="currentColor" fill-rule="evenodd"/>
        </svg>
        <span class="text-base font-semibold whitespace-nowrap hidden md:block text-text truncate max-w-[160px]">{{ ui.logoText }}</span>
      </div>
    </div>

    <!-- Center -->
    <div class="flex-1 md:flex-none md:w-[420px] mx-4 relative">
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

    <!-- Right -->
    <div class="flex-none md:flex-1 flex items-center justify-end gap-2 min-w-0">
      <ThemeToggle />
      <div class="relative">
        <button
          type="button"
          :aria-label="auth.isLoggedIn ? '账号菜单' : '登录'"
          :title="auth.isLoggedIn ? '账号菜单' : '登录'"
          class="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-[background-color] duration-150 bg-transparent hover:bg-search"
          @click="onAccountClick"
        >
          <!-- Logged-in: user-check icon -->
          <svg v-if="auth.isLoggedIn" class="w-[18px] h-[18px] icon-stroke text-text" viewBox="0 0 24 24" fill="none">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <polyline points="16 11 18 13 22 9"/>
          </svg>
          <!-- Logged-out: user icon -->
          <svg v-else class="w-[18px] h-[18px] icon-stroke text-note" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </button>
        <AccountDropdown
          v-if="accountDropdownOpen"
          @close="accountDropdownOpen = false"
        />
      </div>
    </div>
  </nav>
</template>
