<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const emit = defineEmits<{
  close: []
}>()

const auth = useAuthStore()
const ui = useUiStore()
const el = ref<HTMLElement | null>(null)

const menuItems = [
  { key: 'account', label: '我的账号', icon: 'user' },
  { key: 'personalize', label: '个性化设置', icon: 'palette' },
  { key: 'groups', label: '分组管理', icon: 'folder' },
  { key: 'system', label: '系统设置', icon: 'settings' },
]

function handleClick(key: string) {
  if (key === 'system') {
    ui.openSettings('account')
  } else {
    ui.openSettings(key)
  }
  emit('close')
}

function handleLogout() {
  auth.logout()
  emit('close')
}

function onClickOutside(e: MouseEvent) {
  if (el.value && !el.value.contains(e.target as Node)) {
    emit('close')
  }
}

onMounted(() => {
  setTimeout(() => document.addEventListener('mousedown', onClickOutside), 0)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
})
</script>

<template>
  <div
    ref="el"
    class="absolute right-0 top-[calc(100%+6px)] z-[1100] w-48 rounded-xl border bg-row border-border shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden"
  >
    <button
      v-for="item in menuItems"
      :key="item.key"
      class="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] font-medium bg-none border-none text-text cursor-pointer transition-colors text-left hover:bg-header"
      @click="handleClick(item.key)"
    >
      <!-- user -->
      <svg v-if="item.icon === 'user'" class="w-4 h-4 icon-stroke shrink-0" viewBox="0 0 24 24" fill="none">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
      <!-- palette -->
      <svg v-else-if="item.icon === 'palette'" class="w-4 h-4 icon-stroke shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/>
        <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/>
        <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/>
        <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
      </svg>
      <!-- folder -->
      <svg v-else-if="item.icon === 'folder'" class="w-4 h-4 icon-stroke shrink-0" viewBox="0 0 24 24" fill="none">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      <!-- settings -->
      <svg v-else-if="item.icon === 'settings'" class="w-4 h-4 icon-stroke shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
      <span>{{ item.label }}</span>
    </button>

    <div class="h-px bg-border"></div>

    <button class="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] font-medium bg-none border-none text-danger cursor-pointer transition-colors text-left hover:bg-header" @click="handleLogout">
      <svg class="w-4 h-4 icon-stroke shrink-0" viewBox="0 0 24 24" fill="none">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      <span>退出账号</span>
    </button>
  </div>
</template>
