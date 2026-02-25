<script setup lang="ts">
import CustomCheckbox from '@/components/CustomCheckbox.vue'
import { useItemsStore } from '@/stores/items'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
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
const auth = useAuthStore()

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

const isChecked = () => items.selectedIds.has(props.item.id)

function handleEdit() {
  ui.requireAuthOrLogin(() => {
    emit('edit')
  }, auth.isLoggedIn)
}

async function handleDelete() {
  ui.requireAuthOrLogin(async () => {
    if (!confirm(`确定删除「${props.item.name}」？`)) return
    await items.deleteItem(props.item.id)
    emit('deleted')
  }, auth.isLoggedIn)
}
</script>

<template>
  <tr
    class="transition-[background-color] duration-200 border-b"
    :class="{ 'row-checked': isChecked() }"
    :style="{
      backgroundColor: isChecked() ? undefined : (index % 2 === 0 ? 'var(--row-bg)' : 'var(--row-alt-bg)'),
      borderColor: 'var(--border-color)',
    }"
    @mouseenter="!isChecked() && (($event.currentTarget as HTMLElement).style.backgroundColor = 'var(--header-bg)')"
    @mouseleave="!isChecked() && (($event.currentTarget as HTMLElement).style.backgroundColor = index % 2 === 0 ? 'var(--row-bg)' : 'var(--row-alt-bg)')"
  >
    <td
      v-if="ui.checklistEnabled"
      class="w-10 text-center px-3 py-3 border-b"
      style="border-color:var(--border-color)"
      :style="isChecked() ? {} : {}"
    >
      <CustomCheckbox
        :checked="isChecked()"
        @change="items.toggleSelect(item.id)"
      />
    </td>
    <td
      class="px-4 py-3 border-b"
      style="border-color:var(--border-color)"
      :style="isChecked() ? { opacity: '0.45', textDecoration: 'line-through' } : {}"
    >
      <strong>{{ item.name }}</strong>
    </td>
    <td
      class="px-4 py-3 border-b"
      style="border-color:var(--border-color)"
      :style="isChecked() ? { opacity: '0.45', textDecoration: 'line-through' } : {}"
    >
      <a
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ displayUrl(item.url) }}
      </a>
    </td>
    <td
      class="px-4 py-3 border-b text-[0.9em]"
      style="border-color:var(--border-color);color:var(--note-color)"
      :style="isChecked() ? { opacity: '0.45', textDecoration: 'line-through' } : {}"
    >
      {{ item.note }}
    </td>
  </tr>
</template>
