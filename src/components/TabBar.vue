<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <div class="overflow-x-auto border-b border-border [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
    <div class="flex w-max">
      <button
        v-for="tab in ui.categoryOptions"
        :key="tab.key"
        @click="ui.setTab(tab.key)"
        class="py-3 px-6 text-lg font-medium bg-transparent border-none border-b-2 border-b-transparent cursor-pointer transition-[color,border-color] duration-200"
        :class="ui.activeTab === tab.key ? 'border-b-link text-link' : 'text-note hover:text-text'"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>
