<script setup lang="ts">
import ItemGridCard from '@/components/ItemGridCard.vue'
import { useItemsStore } from '@/stores/items'
import type { Item } from '@/types'

const emit = defineEmits<{
  edit: [item: Item]
  deleted: []
}>()

const items = useItemsStore()
</script>

<template>
  <div
    class="grid gap-3"
    style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))"
  >
    <ItemGridCard
      v-for="item in items.items"
      :key="item.id"
      :item="item"
      @edit="emit('edit', item)"
      @deleted="emit('deleted')"
    />
    <div
      v-if="items.items.length === 0"
      class="col-span-full text-center py-12"
      style="color:var(--note-color)"
    >
      暂无数据
    </div>
  </div>
</template>
