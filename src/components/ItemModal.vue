<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useItemsStore } from '@/stores/items'
import { useUiStore } from '@/stores/ui'
import { api, ApiRequestError } from '@/lib/api'

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
  icon_url: null as string | null,
})

const saving = ref(false)

// --- Icon fetching ---
const showIconPicker = ref(false)
const fetchedIcons = ref<string[]>([])
const fetchingIcons = ref(false)
const savingIcon = ref<string | null>(null)
const fetchError = ref('')

// --- File upload (inside picker) ---
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

onMounted(() => {
  if (isEdit.value && items.editingItem) {
    form.value = {
      name: items.editingItem.name,
      url: items.editingItem.url,
      note: items.editingItem.note,
      category: items.editingItem.category,
      icon_url: items.editingItem.icon_url ?? null,
    }
  }
  setTimeout(() => {
    const el = document.getElementById('modal-name-input')
    if (el) el.focus()
  }, 100)
})

async function fetchIcons() {
  if (!form.value.url.trim()) return

  fetchError.value = ''
  fetchingIcons.value = true
  fetchedIcons.value = []
  showIconPicker.value = true

  try {
    const res = await api.post<{ icons: string[] }>('/icons/fetch', { url: form.value.url })
    fetchedIcons.value = res.icons
    if (res.icons.length === 0) {
      fetchError.value = '未找到图标'
    }
  } catch (err) {
    fetchError.value = err instanceof ApiRequestError ? err.message : '获取图标失败'
  } finally {
    fetchingIcons.value = false
  }
}

async function selectIcon(iconUrl: string) {
  savingIcon.value = iconUrl
  try {
    const res = await api.post<{ key: string; url: string; size: number }>('/icons/save', { url: iconUrl })
    form.value.icon_url = res.url
    showIconPicker.value = false
  } catch {
    // silently fail
  } finally {
    savingIcon.value = null
  }
}

function triggerUpload() {
  fileInput.value?.click()
}

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.upload<{ key: string; url: string; size: number }>('/icons', formData)
    form.value.icon_url = res.url
    showIconPicker.value = false
  } catch {
    // silently fail
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function removeIcon() {
  form.value.icon_url = null
}

async function handleSubmit() {
  if (!form.value.name.trim()) return
  if (!form.value.url.trim()) return

  saving.value = true
  try {
    const data = {
      name: form.value.name,
      url: form.value.url,
      note: form.value.note,
      category: form.value.category,
      icon_url: form.value.icon_url,
    }
    if (isEdit.value && items.editingItem) {
      await items.updateItem(items.editingItem.id, data)
    } else {
      await items.createItem(data)
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

      <!-- Icon preview (when icon is set) -->
      <div v-if="form.icon_url" class="mb-4 flex items-center gap-3">
        <img :src="form.icon_url" alt="" class="w-10 h-10 rounded-lg object-contain shrink-0" />
        <span class="text-xs text-note flex-1">已设置自定义图标</span>
        <button type="button" class="icon-remove-btn" @click="removeIcon">移除</button>
      </div>

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
        <div class="flex gap-2">
          <input
            v-model="form.url"
            type="text"
            placeholder="输入地址"
            class="flex-1 py-[9px] px-3 text-sm border-none rounded-lg outline-none transition-[box-shadow] duration-150 text-text bg-search"
            @keydown.enter="handleSubmit"
          />
          <button
            type="button"
            class="fetch-icon-btn"
            :disabled="!form.url.trim() || fetchingIcons"
            @click="fetchIcons"
          >
            {{ fetchingIcons ? '获取中...' : '获取图标' }}
          </button>
        </div>
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
        <button type="button" @click="emit('close')" class="modal-btn-cancel">
          取消
        </button>
        <button type="button" :disabled="saving" @click="handleSubmit" class="modal-btn-primary">
          {{ isEdit ? '修改' : '添加' }}
        </button>
      </div>
    </div>

    <!-- Icon picker dialog -->
    <div
      v-if="showIconPicker"
      class="fixed inset-0 z-[2001] flex items-center justify-center bg-overlay"
      @click.self="showIconPicker = false"
    >
      <div class="w-[400px] max-w-[90vw] rounded-2xl p-6 border-none bg-row">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-[16px] font-semibold text-text m-0">请选择一个图标</h3>
          <button
            class="p-1 rounded-lg bg-transparent border-none cursor-pointer text-note hover:text-text transition-colors"
            @click="showIconPicker = false"
          >
            <svg class="w-5 h-5 icon-stroke" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Loading -->
        <div v-if="fetchingIcons" class="text-sm text-note py-6 text-center">获取图标中...</div>

        <!-- Error -->
        <div v-else-if="fetchError && fetchedIcons.length === 0" class="text-sm text-danger py-6 text-center">{{ fetchError }}</div>

        <!-- Icon grid -->
        <div v-else class="flex flex-wrap gap-3 mb-4">
          <button
            v-for="icon in fetchedIcons"
            :key="icon"
            class="icon-candidate"
            :class="savingIcon === icon && 'icon-candidate-active'"
            :disabled="!!savingIcon"
            @click="selectIcon(icon)"
          >
            <img
              :src="icon"
              alt=""
              class="w-12 h-12 object-contain"
              @error="($event.target as HTMLImageElement).parentElement!.style.display = 'none'"
            />
            <div v-if="savingIcon === icon" class="icon-candidate-overlay">
              <svg class="w-5 h-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
          </button>
        </div>

        <!-- Upload local file option -->
        <div v-if="!fetchingIcons" class="border-t border-border pt-3">
          <button
            type="button"
            class="text-[12px] text-link cursor-pointer bg-transparent border-none hover:underline p-0"
            :disabled="uploading"
            @click="triggerUpload"
          >
            {{ uploading ? '上传中...' : '或上传本地图标' }}
          </button>
        </div>

        <input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg,image/gif,image/svg+xml,image/x-icon,image/webp"
          class="hidden"
          @change="handleFileChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.fetch-icon-btn {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background-color 0.15s;
}
.fetch-icon-btn:hover:not(:disabled) {
  background-color: var(--search-bg);
}
.fetch-icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-remove-btn {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid var(--danger);
  background: transparent;
  color: var(--danger);
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.15s;
}
.icon-remove-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.icon-candidate {
  position: relative;
  width: 72px;
  height: 72px;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: hidden;
  transition: border-color 0.15s;
}
.icon-candidate:hover:not(:disabled) {
  border-color: var(--link-color);
}
.icon-candidate-active {
  border-color: var(--link-color);
}
.icon-candidate:disabled {
  cursor: wait;
}

.icon-candidate-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 8px;
}

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
  background-color: var(--btn-primary-bg);
  transition: opacity 0.15s;
}
.modal-btn-primary:hover {
  opacity: 0.85;
}
</style>
