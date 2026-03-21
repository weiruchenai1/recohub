<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { DROPDOWN_ITEMS } from '@/lib/menuItems'
import MenuIcon from '@/components/MenuIcon.vue'

const emit = defineEmits<{ close: [] }>()

const auth = useAuthStore()
const ui = useUiStore()
const el = ref<HTMLElement | null>(null)

const menuItems = computed(() => {
  if (auth.isLoggedIn) return DROPDOWN_ITEMS
  return DROPDOWN_ITEMS.filter(item => item.visitor)
})

function handleClick(key: string) {
  ui.openSettings(key === 'system' ? 'account' : key)
  emit('close')
}

function handleLogout() {
  if (auth.isLoggedIn) {
    auth.logout()
  } else {
    auth.visitorLogout()
  }
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
      <MenuIcon :name="item.icon" />
      <span>{{ item.label }}</span>
    </button>

    <div class="h-px bg-border"></div>

    <button class="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] font-medium bg-none border-none text-danger cursor-pointer transition-colors text-left hover:bg-header" @click="handleLogout">
      <MenuIcon name="logout" />
      <span>退出账号</span>
    </button>
  </div>
</template>
