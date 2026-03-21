<script setup lang="ts">
import CustomCheckbox from '@/components/CustomCheckbox.vue'
import StarRating from '@/components/StarRating.vue'
import { useItemsStore } from '@/stores/items'
import { useUiStore } from '@/stores/ui'
import { displayUrl } from '@/lib/utils'
import type { Item } from '@/types'

const props = defineProps<{
  item: Item
  index: number
}>()

const items = useItemsStore()
const ui = useUiStore()

const isChecked = () => items.selectedIds.has(props.item.id)
</script>

<template>
  <tr
    class="transition-colors duration-200"
    :class="{
      'opacity-45': isChecked(),
      'even-row': !isChecked() && index % 2 === 0,
      'odd-row': !isChecked() && index % 2 !== 0,
    }"
  >
    <td
      v-if="ui.checklistEnabled"
      class="w-10 text-center px-3 py-3 border-b border-border"
    >
      <CustomCheckbox
        :checked="isChecked()"
        @change="items.toggleSelect(item.id)"
      />
    </td>
    <td class="px-4 py-3 border-b border-border">
      <div class="flex items-center gap-2">
        <strong>{{ item.name }}</strong>
        <StarRating :item-id="item.id" />
      </div>
    </td>
    <td class="px-4 py-3 border-b border-border">
      <a
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        class="text-link"
      >
        {{ displayUrl(item.url) }}
      </a>
    </td>
    <td class="px-4 py-3 border-b border-border text-[0.9em] text-note">
      {{ item.note }}
    </td>
  </tr>
</template>

<style scoped>
.even-row {
  background-color: var(--row-bg);
}
.odd-row {
  background-color: var(--row-alt-bg);
}
.even-row:hover,
.odd-row:hover {
  background-color: var(--header-bg);
}
</style>
