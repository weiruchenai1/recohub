<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useItemsStore } from '@/stores/items'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { CATEGORY_OPTIONS } from '@/types'
import type { Category } from '@/types'

const emit = defineEmits<{ refresh: [] }>()

const items = useItemsStore()
const ui = useUiStore()
const auth = useAuthStore()

const show = computed(() => ui.checklistEnabled && items.selectedCount > 0)

const showMoveMenu = ref(false)
const moveMenuRef = ref<HTMLElement | null>(null)

const moveTargets = computed(() =>
  CATEGORY_OPTIONS.filter(opt => opt.key !== ui.activeTab)
)

async function handleRename() {
  ui.requireAuthOrLogin(() => {
    const selected = items.items.find(i => items.selectedIds.has(i.id))
    if (!selected) return
    items.startEdit(selected)
    ui.showItemModal = true
  }, auth.isLoggedIn)
}

function handleMove() {
  ui.requireAuthOrLogin(() => {
    showMoveMenu.value = !showMoveMenu.value
  }, auth.isLoggedIn)
}

async function confirmMove(category: Category) {
  const ids = Array.from(items.selectedIds)
  await items.batchMove(ids, category)
  items.clearSelection()
  showMoveMenu.value = false
  emit('refresh')
}

async function handleDelete() {
  ui.requireAuthOrLogin(() => {
    ui.confirm('确认删除', `确定删除选中的 ${items.selectedCount} 项？`, async () => {
      const ids = Array.from(items.selectedIds)
      await items.batchDelete(ids)
      items.clearSelection()
      emit('refresh')
    })
  }, auth.isLoggedIn)
}

function handleDeselect() {
  items.clearSelection()
}

function onClickOutside(e: MouseEvent) {
  if (moveMenuRef.value && !moveMenuRef.value.contains(e.target as Node)) {
    showMoveMenu.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div
    class="fixed bottom-6 left-1/2 z-[1000] flex items-center gap-1 py-1.5 px-2 rounded-xl border border-border bg-navbar backdrop-blur-[20px] backdrop-saturate-[180%] shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-[transform,opacity] duration-300"
    :style="{
      transform: show ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(80px)',
      opacity: show ? '1' : '0',
      pointerEvents: show ? 'auto' : 'none',
    }"
  >
    <span
      class="text-[13px] font-semibold px-2.5 whitespace-nowrap leading-9 text-text"
    >
      已选 {{ items.selectedCount }} 项
    </span>

    <div class="w-px h-5 shrink-0 bg-border"></div>

    <!-- Rename -->
    <button
      @click="handleRename"
      type="button"
      title="重命名"
      class="float-btn"
    >
      <svg viewBox="0 0 24 24"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
    </button>

    <!-- Move -->
    <div ref="moveMenuRef" class="relative">
      <button
        @click.stop="handleMove"
        type="button"
        title="移动"
        class="float-btn"
      >
        <svg viewBox="0 0 24 24"><path d="M12 2v20"/><path d="m15 5-3-3-3 3"/><path d="m15 19-3 3-3-3"/><path d="M2 12h20"/><path d="m5 9-3 3 3 3"/><path d="m19 9 3 3-3 3"/></svg>
      </button>
      <div
        v-if="showMoveMenu"
        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-1 rounded-lg border border-border bg-navbar backdrop-blur-[20px] backdrop-saturate-[180%] shadow-[0_8px_24px_rgba(0,0,0,0.12)] min-w-max"
      >
        <button
          v-for="opt in moveTargets"
          :key="opt.key"
          @click="confirmMove(opt.key)"
          class="move-menu-item"
        >
          移动到「{{ opt.label }}」
        </button>
      </div>
    </div>

    <!-- Delete -->
    <button
      @click="handleDelete"
      type="button"
      title="删除"
      class="float-btn float-btn-danger"
    >
      <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
    </button>

    <div class="w-px h-5 shrink-0 bg-border"></div>

    <!-- Deselect -->
    <button
      @click="handleDeselect"
      type="button"
      title="取消选择"
      class="float-btn"
    >
      <svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
  </div>
</template>

<style scoped>
.float-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--text-color);
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
  white-space: nowrap;
  transition: background-color 0.15s;
}
.float-btn:hover {
  background-color: var(--header-bg);
}
.float-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}
.float-btn-danger {
  color: #f85149;
}
.float-btn-danger:hover {
  background-color: rgba(248, 81, 73, 0.1);
}
.move-menu-item {
  display: block;
  width: 100%;
  padding: 6px 16px;
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
  color: var(--text-color);
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  text-align: left;
  transition: background-color 0.15s;
}
.move-menu-item:hover {
  background-color: var(--header-bg);
}
</style>
