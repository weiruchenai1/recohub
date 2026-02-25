<script setup lang="ts">
import { useFavicon } from '@/composables/useFavicon'
import CustomCheckbox from '@/components/CustomCheckbox.vue'
import { useItemsStore } from '@/stores/items'
import { useUiStore } from '@/stores/ui'
import type { Item } from '@/types'

const props = defineProps<{
  item: Item
}>()

const emit = defineEmits<{
  edit: []
  deleted: []
}>()

const items = useItemsStore()
const ui = useUiStore()
const { faviconUrl } = useFavicon(props.item.url)

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
    class="relative flex flex-col p-4 border rounded-[10px] cursor-default transition-[background-color,box-shadow,border-color] duration-200"
    :style="{
      borderColor: 'var(--border-color)',
      backgroundColor: 'var(--row-bg)',
      opacity: isChecked() ? '0.45' : '1',
    }"
    @mouseenter="($event.currentTarget as HTMLElement).style.backgroundColor='var(--header-bg)';($event.currentTarget as HTMLElement).style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'"
    @mouseleave="($event.currentTarget as HTMLElement).style.backgroundColor='var(--row-bg)';($event.currentTarget as HTMLElement).style.boxShadow='none'"
  >
    <!-- Checkbox -->
    <div
      v-if="ui.checklistEnabled"
      class="absolute top-3 right-3"
      :style="isChecked() ? { opacity: '1' } : {}"
    >
      <CustomCheckbox
        :checked="isChecked()"
        @change="items.toggleSelect(item.id)"
      />
    </div>

    <!-- Name with favicon -->
    <div class="flex items-center gap-2.5 text-[15px] font-semibold mb-2 pr-7 break-words" style="color:var(--text-color)">
      <img
        v-if="faviconUrl"
        :src="faviconUrl"
        alt=""
        class="w-8 h-8 rounded-md shrink-0 object-contain"
        @error="($event.target as HTMLImageElement).style.display='none'"
      />
      <div
        v-else
        class="w-8 h-8 rounded-md shrink-0 flex items-center justify-center text-[15px] font-bold text-white"
        style="background-color:var(--note-color)"
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
      style="color:var(--link-color)"
    >
      {{ displayUrl(item.url) }}
    </a>

    <!-- Note -->
    <div
      v-if="item.note"
      class="text-xs mt-auto"
      style="color:var(--note-color)"
    >
      {{ item.note }}
    </div>
  </div>
</template>
