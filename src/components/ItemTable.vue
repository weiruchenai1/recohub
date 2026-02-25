<script setup lang="ts">
import ItemTableRow from '@/components/ItemTableRow.vue'
import CustomCheckbox from '@/components/CustomCheckbox.vue'
import { useItemsStore } from '@/stores/items'
import { useUiStore } from '@/stores/ui'
import type { Item } from '@/types'

const emit = defineEmits<{
  edit: [item: Item]
  deleted: []
}>()

const items = useItemsStore()
const ui = useUiStore()

const headerLabel = {
  software: { name: '软件名称', url: '官方下载地址', note: '备注' },
  website: { name: '网站名称', url: '地址', note: '备注' },
}
</script>

<template>
  <div class="overflow-x-auto" style="-webkit-overflow-scrolling:touch">
    <table class="w-full border-collapse border rounded-md overflow-hidden" style="border-color:var(--border-color);box-shadow:0 1px 3px rgba(0,0,0,0.02)">
      <thead>
        <tr>
          <th
            v-if="ui.checklistEnabled"
            class="w-10 text-center px-3 py-3 font-semibold border-b"
            style="background-color:var(--header-bg);border-color:var(--border-color);color:var(--text-color)"
          >
            <CustomCheckbox
              :checked="items.allSelected"
              @change="items.toggleSelectAll()"
            />
          </th>
          <th class="px-4 py-3 font-semibold text-left border-b w-1/4" style="background-color:var(--header-bg);border-color:var(--border-color);color:var(--text-color)">
            {{ headerLabel[ui.activeTab].name }}
          </th>
          <th class="px-4 py-3 font-semibold text-left border-b w-[35%]" style="background-color:var(--header-bg);border-color:var(--border-color);color:var(--text-color)">
            {{ headerLabel[ui.activeTab].url }}
          </th>
          <th class="px-4 py-3 font-semibold text-left border-b w-[40%]" style="background-color:var(--header-bg);border-color:var(--border-color);color:var(--text-color)">
            {{ headerLabel[ui.activeTab].note }}
          </th>
        </tr>
      </thead>
      <tbody>
        <ItemTableRow
          v-for="(item, index) in items.items"
          :key="item.id"
          :item="item"
          :index="index"
          @edit="emit('edit', item)"
          @deleted="emit('deleted')"
        />
        <tr v-if="items.items.length === 0">
          <td
            :colspan="ui.checklistEnabled ? 4 : 3"
            class="text-center py-8"
            style="color:var(--note-color)"
          >
            暂无数据
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
