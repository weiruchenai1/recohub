<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import { CATEGORY_OPTIONS } from '@/types'

const ui = useUiStore()
</script>

<template>
  <div class="flex items-center border-b border-border">
    <div class="flex">
      <button
        v-for="tab in CATEGORY_OPTIONS"
        :key="tab.key"
        @click="ui.setTab(tab.key)"
        class="tab-btn"
        :class="ui.activeTab === tab.key ? 'tab-btn-active' : 'tab-btn-inactive'"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.tab-btn {
  padding: 12px 24px;
  font-size: 18px;
  font-weight: 500;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}
.tab-btn-active {
  border-bottom-color: var(--link-color);
  color: var(--link-color);
}
.tab-btn-inactive {
  color: var(--note-color);
}
.tab-btn-inactive:hover {
  color: var(--text-color);
}
</style>
