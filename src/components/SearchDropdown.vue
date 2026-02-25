<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useItemsStore } from '@/stores/items'
import { useUiStore } from '@/stores/ui'

const props = defineProps<{
  scope: 'global' | 'local'
  keyword: string
}>()

const emit = defineEmits<{
  close: []
}>()

const items = useItemsStore()
const ui = useUiStore()
const el = ref<HTMLElement | null>(null)

const filtered = computed(() => {
  const kw = props.keyword.trim().toLowerCase()
  if (!kw) return []
  return items.items.filter(item =>
    item.name.toLowerCase().includes(kw) ||
    item.note.toLowerCase().includes(kw) ||
    item.url.toLowerCase().includes(kw)
  )
})

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
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
    class="absolute left-0 right-0 z-[1100] max-h-80 overflow-y-auto rounded-[10px] border"
    style="top:calc(100% + 4px);background-color:var(--row-bg);border-color:var(--border-color);box-shadow:0 8px 24px rgba(0,0,0,0.12);scrollbar-width:none"
  >
    <a
      v-for="item in filtered"
      :key="item.id"
      :href="item.url"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center gap-2 px-3.5 py-2.5 border-b text-[13px] font-medium no-underline transition-[background-color] duration-100 cursor-pointer"
      style="border-color:var(--border-color);color:var(--link-color)"
      @mouseenter="($event.target as HTMLElement).style.backgroundColor='var(--header-bg)'"
      @mouseleave="($event.target as HTMLElement).style.backgroundColor='transparent'"
    >
      <span style="color:var(--note-color);font-weight:400;flex-shrink:0">#</span>
      <span style="color:var(--text-color);font-weight:500">{{ item.name }}</span>
      <template v-if="item.note">
        <span style="color:var(--note-color);margin:0 2px">›</span>
        <span style="color:var(--note-color);font-weight:400">{{ item.note }}</span>
      </template>
    </a>
    <div
      v-if="filtered.length === 0"
      class="py-3.5 text-center text-[13px]"
      style="color:var(--note-color)"
    >
      无匹配结果
    </div>
  </div>
</template>
