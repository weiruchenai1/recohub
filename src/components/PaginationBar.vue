<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useItemsStore } from '@/stores/items'

const ui = useUiStore()
const items = useItemsStore()

const totalPages = computed(() => Math.max(1, Math.ceil(items.total / ui.perPage)))

const pages = computed(() => {
  const total = totalPages.value
  const current = ui.page
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const result: (number | '...')[] = [1]
  if (current > 3) result.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) result.push(i)
  if (current < total - 2) result.push('...')
  result.push(total)
  return result
})

const perPageOptions = [10, 20, 50, 100]

function goTo(p: number) {
  ui.page = Math.max(1, Math.min(p, totalPages.value))
}
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-between gap-y-2 py-3.5 text-[13px] select-none text-note"
  >
    <!-- Left: total + per page -->
    <div class="flex items-center gap-1.5">
      共 {{ items.total }} 条, 显示
      <select
        :value="ui.perPage"
        @change="ui.perPage = Number(($event.target as HTMLSelectElement).value); ui.page = 1"
        class="py-1 px-2 text-[13px] rounded-md outline-none cursor-pointer text-text bg-row border border-border"
      >
        <option v-for="n in perPageOptions" :key="n" :value="n">{{ n }}</option>
      </select>
      条/页
    </div>

    <!-- Right: page buttons -->
    <div class="flex items-center gap-1 ml-auto">
      <!-- Prev -->
      <button
        :disabled="ui.page <= 1"
        @click="goTo(ui.page - 1)"
        class="page-btn"
      >
        <svg viewBox="0 0 24 24" class="w-3.5 h-3.5 icon-stroke">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>

      <template v-for="p in pages" :key="p">
        <span
          v-if="p === '...'"
          class="inline-flex items-center justify-center min-w-8 h-8 text-sm tracking-wider text-note"
        >···</span>
        <button
          v-else
          @click="goTo(p)"
          class="page-btn"
          :class="{ 'page-btn-active': p === ui.page }"
        >
          {{ p }}
        </button>
      </template>

      <!-- Next -->
      <button
        :disabled="ui.page >= totalPages"
        @click="goTo(ui.page + 1)"
        class="page-btn"
      >
        <svg viewBox="0 0 24 24" class="w-3.5 h-3.5 icon-stroke">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-color);
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}
.page-btn:hover:not(:disabled):not(.page-btn-active) {
  background-color: var(--header-bg);
}
.page-btn-active {
  background-color: var(--text-color);
  color: var(--bg-color);
  border-color: var(--text-color);
  font-weight: 600;
}
.page-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
</style>
