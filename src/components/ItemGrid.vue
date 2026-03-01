<script setup lang="ts">
import ItemGridCard from '@/components/ItemGridCard.vue'
import { useItemsStore } from '@/stores/items'

const items = useItemsStore()
</script>

<template>
  <div
    class="grid gap-3 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]"
  >
    <ItemGridCard
      v-for="item in items.items"
      :key="item.id"
      :item="item"
    />
    <div
      v-if="items.items.length === 0"
      class="col-span-full text-center py-12 text-note"
    >
      暂无数据
    </div>
  </div>
</template>
