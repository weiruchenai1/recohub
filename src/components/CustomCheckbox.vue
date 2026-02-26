<script setup lang="ts">
const props = defineProps<{
  checked: boolean
}>()

const emit = defineEmits<{
  change: [value: boolean]
}>()
</script>

<template>
  <button
    type="button"
    @click="emit('change', !checked)"
    class="inline-flex items-center justify-center w-4 h-4 rounded-[3px] border p-0 shrink-0 cursor-pointer align-middle transition-[background-color,border-color] duration-150"
    :class="checked ? 'custom-check-checked' : 'custom-check-unchecked'"
  >
    <svg class="w-3 h-3 icon-stroke" :class="{ 'stroke-transparent': !checked }" viewBox="0 0 24 24">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  </button>
</template>

<style scoped>
.custom-check-unchecked {
  background-color: #f5f5f5;
  border-color: #d4d4d4;
}
.custom-check-unchecked svg {
  stroke: transparent;
}
.custom-check-checked {
  background-color: #525252;
  border-color: #171717;
}
.custom-check-checked svg {
  stroke: #f5f5f5;
}

:root.dark .custom-check-unchecked {
  background-color: #262626;
  border-color: #404040;
}
:root.dark .custom-check-checked {
  background-color: #d4d4d4;
  border-color: #d4d4d4;
}
:root.dark .custom-check-checked svg {
  stroke: #171717;
}
</style>
