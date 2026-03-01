<script setup lang="ts">
import { ref } from 'vue'
import { useFavicon } from '@/composables/useFavicon'
import CustomCheckbox from '@/components/CustomCheckbox.vue'
import { useItemsStore } from '@/stores/items'
import { useUiStore } from '@/stores/ui'
import type { Item } from '@/types'

const props = defineProps<{
  item: Item
}>()

const items = useItemsStore()
const ui = useUiStore()
const { faviconUrl } = useFavicon(props.item.icon_url)
const faviconFailed = ref(false)

function displayUrl(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

const isChecked = () => items.selectedIds.has(props.item.id)

function firstChar(): string {
  return props.item.name.charAt(0).toUpperCase()
}
</script>

<template>
  <div
    class="grid-card"
    :class="{ 'grid-card-checked': isChecked() }"
  >
    <!-- Checkbox -->
    <div
      v-if="ui.checklistEnabled"
      class="absolute top-3 right-3"
      :class="{ 'opacity-100': isChecked() }"
    >
      <CustomCheckbox
        :checked="isChecked()"
        @change="items.toggleSelect(item.id)"
      />
    </div>

    <!-- Dead badge -->
    <span
      v-if="item.status === 'dead'"
      class="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-500"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
      已失效
    </span>

    <!-- Name with favicon -->
    <div class="flex items-center gap-2.5 text-[15px] font-semibold mb-2 pr-7 break-words text-text">
      <img
        v-if="faviconUrl && !faviconFailed"
        :src="faviconUrl"
        alt=""
        class="w-8 h-8 rounded-md shrink-0 object-contain"
        @error="faviconFailed = true"
      />
      <div
        v-else
        class="w-8 h-8 rounded-md shrink-0 flex items-center justify-center text-[15px] font-bold text-white bg-note"
      >
        {{ firstChar() }}
      </div>
      <span>{{ item.name }}</span>
    </div>

    <!-- Link -->
    <a
      :href="item.url"
      target="_blank"
      rel="noopener noreferrer"
      class="text-[13px] font-medium mb-2 break-all"
      :class="item.status === 'dead' ? 'text-red-500 line-through opacity-60' : 'text-link'"
    >
      {{ displayUrl(item.url) }}
    </a>

    <!-- Note -->
    <div
      v-if="item.note"
      class="text-xs mt-auto text-note"
    >
      {{ item.note }}
    </div>
  </div>
</template>

<style scoped>
.grid-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background-color: var(--row-bg);
  cursor: default;
  transition: background-color 0.2s, box-shadow 0.2s, border-color 0.2s;
}
.grid-card:hover {
  background-color: var(--header-bg);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.grid-card-checked {
  opacity: 0.45;
}
</style>
