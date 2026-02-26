<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useItemsStore } from '@/stores/items'
import { useUiStore } from '@/stores/ui'

const emit = defineEmits<{
  close: []
  saved: []
}>()

const items = useItemsStore()
const ui = useUiStore()

const isEdit = computed(() => items.modalMode === 'edit')

const form = ref({
  name: '',
  url: '',
  note: '',
  category: ui.activeTab,
})

const saving = ref(false)

onMounted(() => {
  if (isEdit.value && items.editingItem) {
    form.value = {
      name: items.editingItem.name,
      url: items.editingItem.url,
      note: items.editingItem.note,
      category: items.editingItem.category,
    }
  }
  setTimeout(() => {
    const el = document.getElementById('modal-name-input')
    if (el) el.focus()
  }, 100)
})

async function handleSubmit() {
  if (!form.value.name.trim()) return
  if (!form.value.url.trim()) return

  saving.value = true
  try {
    if (isEdit.value && items.editingItem) {
      await items.updateItem(items.editingItem.id, form.value)
    } else {
      await items.createItem(form.value)
    }
    emit('saved')
    emit('close')
  } catch {
    // silently fail
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-[2000] flex items-center justify-center transition-opacity duration-[250ms] bg-overlay"
    @click.self="emit('close')"
  >
    <div class="w-[420px] max-w-[92vw] rounded-2xl p-7 border-none bg-row">
      <h3 class="m-0 mb-5 text-[17px] font-semibold text-text">
        {{ isEdit ? '重命名' : '添加' }}
      </h3>

      <div class="mb-3.5">
        <label class="block text-[13px] font-medium mb-1 text-note">
          名称 <span class="text-danger ml-0.5">*</span>
        </label>
        <input
          id="modal-name-input"
          v-model="form.name"
          type="text"
          placeholder="输入名称"
          class="w-full py-[9px] px-3 text-sm border-none rounded-lg outline-none transition-[box-shadow] duration-150 text-text bg-search"
          @keydown.enter="handleSubmit"
        />
      </div>

      <div class="mb-3.5">
        <label class="block text-[13px] font-medium mb-1 text-note">
          地址 <span class="text-danger ml-0.5">*</span>
        </label>
        <input
          v-model="form.url"
          type="text"
          placeholder="输入地址"
          class="w-full py-[9px] px-3 text-sm border-none rounded-lg outline-none transition-[box-shadow] duration-150 text-text bg-search"
          @keydown.enter="handleSubmit"
        />
      </div>

      <div class="mb-3.5">
        <label class="block text-[13px] font-medium mb-1 text-note">
          备注
        </label>
        <input
          v-model="form.note"
          type="text"
          placeholder="输入备注（选填）"
          class="w-full py-[9px] px-3 text-sm border-none rounded-lg outline-none transition-[box-shadow] duration-150 text-text bg-search"
          @keydown.enter="handleSubmit"
        />
      </div>

      <div class="flex justify-end gap-2 mt-[22px]">
        <button
          type="button"
          @click="emit('close')"
          class="modal-btn-cancel"
        >
          取消
        </button>
        <button
          type="button"
          :disabled="saving"
          @click="handleSubmit"
          class="modal-btn-primary"
        >
          {{ isEdit ? '修改' : '添加' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-btn-cancel {
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-color);
  transition: background-color 0.15s, color 0.15s;
}
.modal-btn-primary {
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  color: white;
  background-color: var(--link-color);
  transition: opacity 0.15s;
}
.modal-btn-primary:hover {
  opacity: 0.85;
}
</style>
