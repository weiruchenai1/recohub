<script setup lang="ts">
import CustomCheckbox from '@/components/CustomCheckbox.vue'
import { useItemsStore } from '@/stores/items'
import { useUiStore } from '@/stores/ui'
import type { Item } from '@/types'

const props = defineProps<{
  item: Item
  index: number
}>()

const emit = defineEmits<{
  edit: []
  deleted: []
}>()

const items = useItemsStore()
const ui = useUiStore()
function displayUrl(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

const isChecked = () => items.selectedIds.has(props.item.id)
</script>

<template>
  <tr
    class="table-row"
    :class="{
      'row-checked': isChecked(),
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
      <strong>{{ item.name }}</strong>
    </td>
    <td class="px-4 py-3 border-b border-border">
      <a
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
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
.table-row {
  transition: background-color 0.2s;
}
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
