<script setup lang="ts">
import { ref, watch, toRef, onMounted, onBeforeUnmount } from 'vue'
import { api } from '@/lib/api'
import { useDebouncedRef } from '@/composables/useDebounce'
import type { Item, PaginatedResponse } from '@/types'

const props = defineProps<{
  scope: 'global' | 'local'
  keyword: string
}>()

const emit = defineEmits<{
  close: []
}>()

const el = ref<HTMLElement | null>(null)
const results = ref<Item[]>([])
const debouncedKeyword = useDebouncedRef(toRef(props, 'keyword'), 300)

watch(
  debouncedKeyword,
  async (kw) => {
    const q = kw.trim()
    if (!q) { results.value = []; return }
    const query = new URLSearchParams({ q, page: '1', perPage: '50' })
    const res = await api.get<PaginatedResponse<Item>>(`/items?${query}`)
    results.value = res.data
  },
  { immediate: true },
)

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
    class="absolute left-0 right-0 z-[1100] max-h-80 overflow-y-auto rounded-[10px] border top-[calc(100%+4px)] bg-row border-border shadow-[0_8px_24px_rgba(0,0,0,0.12)] [scrollbar-width:none]"
  >
    <a
      v-for="item in results"
      :key="item.id"
      :href="item.url"
      target="_blank"
      rel="noopener noreferrer"
      class="search-result-item"
    >
      <span class="text-note font-normal shrink-0">#</span>
      <span class="text-text font-medium">{{ item.name }}</span>
      <template v-if="item.note">
        <span class="text-note mx-0.5">›</span>
        <span class="text-note font-normal">{{ item.note }}</span>
      </template>
    </a>
    <div
      v-if="results.length === 0"
      class="py-3.5 text-center text-[13px] text-note"
    >
      无匹配结果
    </div>
  </div>
</template>

<style scoped>
.search-result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  color: var(--link-color);
  cursor: pointer;
  transition: background-color 0.1s;
}
.search-result-item:hover {
  background-color: var(--header-bg);
}
</style>
