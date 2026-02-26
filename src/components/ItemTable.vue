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
  <div class="overflow-x-auto [-webkit-overflow-scrolling:touch]">
    <table class="w-full border-collapse border border-border rounded-md overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <thead>
        <tr>
          <th
            v-if="ui.checklistEnabled"
            class="w-10 text-center px-3 py-3 font-semibold border-b border-border bg-header text-text"
          >
            <CustomCheckbox
              :checked="items.allSelected"
              @change="items.toggleSelectAll()"
            />
          </th>
          <th class="px-4 py-3 font-semibold text-left border-b border-border bg-header text-text w-1/4">
            {{ headerLabel[ui.activeTab].name }}
          </th>
          <th class="px-4 py-3 font-semibold text-left border-b border-border bg-header text-text w-[35%]">
            {{ headerLabel[ui.activeTab].url }}
          </th>
          <th class="px-4 py-3 font-semibold text-left border-b border-border bg-header text-text w-[40%]">
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
            class="text-center py-8 text-note"
          >
            暂无数据
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
