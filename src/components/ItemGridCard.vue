<script setup lang="ts">
import { ref } from 'vue'
import CustomCheckbox from '@/components/CustomCheckbox.vue'
import StarRating from '@/components/StarRating.vue'
import { useItemsStore } from '@/stores/items'
import { useUiStore } from '@/stores/ui'
import { displayUrl } from '@/lib/utils'
import type { Item } from '@/types'

const props = defineProps<{
  item: Item
}>()

const items = useItemsStore()
const ui = useUiStore()
const faviconFailed = ref(false)

const isChecked = () => items.selectedIds.has(props.item.id)

function firstChar(): string {
  return props.item.name.charAt(0).toUpperCase()
}
</script>

<template>
  <div
    class="relative flex flex-col p-4 border border-border rounded-[10px] bg-row cursor-default transition-[background-color,box-shadow,border-color] duration-200 hover:bg-header hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
    :class="{ 'opacity-45': isChecked() }"
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

    <!-- Name with favicon -->
    <div class="flex items-center gap-2.5 text-[15px] font-semibold mb-2 pr-7 break-words text-text">
      <img
        v-if="item.icon_url && !faviconFailed"
        :src="item.icon_url"
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
      class="text-[13px] font-medium mb-2 break-all text-link"
    >
      {{ displayUrl(item.url) }}
    </a>

    <!-- Rating -->
    <div class="mb-1">
      <StarRating :item-id="item.id" />
    </div>

    <!-- Note -->
    <div
      v-if="item.note"
      class="text-xs mt-auto text-note"
    >
      {{ item.note }}
    </div>
  </div>
</template>
