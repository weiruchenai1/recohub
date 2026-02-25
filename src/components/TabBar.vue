<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import type { Category } from '@/types'

const ui = useUiStore()

const tabs: { key: Category; label: string }[] = [
  { key: 'software', label: '软件推荐' },
  { key: 'website', label: '网站推荐' },
]
</script>

<template>
  <div class="flex items-center border-b" style="border-color: var(--border-color)">
    <div class="flex">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="ui.setTab(tab.key)"
        class="px-6 py-3 text-lg font-medium border-b-2 cursor-pointer transition-[color,border-color] duration-200"
        :style="{
          background: 'none',
          border: 'none',
          borderBottom: ui.activeTab === tab.key
            ? '2px solid var(--link-color)'
            : '2px solid transparent',
          color: ui.activeTab === tab.key ? 'var(--link-color)' : 'var(--note-color)',
          fontFamily: 'inherit',
        }"
        @mouseenter="($event.target as HTMLElement).style.color = ui.activeTab === tab.key ? 'var(--link-color)' : 'var(--text-color)'"
        @mouseleave="($event.target as HTMLElement).style.color = ui.activeTab === tab.key ? 'var(--link-color)' : 'var(--note-color)'"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>
