<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSubmissionsStore } from '@/stores/submissions'
import { useUiStore } from '@/stores/ui'
import type { Submission } from '@/types'

const submissionsStore = useSubmissionsStore()
const ui = useUiStore()

const editingId = ref<number | null>(null)
const editForm = ref({ name: '', url: '', note: '', category: '', icon_url: null as string | null })
const error = ref('')

onMounted(() => {
  submissionsStore.fetchSubmissions()
})

function startEdit(s: Submission) {
  editingId.value = s.id
  editForm.value = {
    name: s.name,
    url: s.url,
    note: s.note,
    category: s.category || ui.categories[0]?.key || '',
    icon_url: s.icon_url ?? null,
  }
}

function cancelEdit() {
  editingId.value = null
}

async function approve(s: Submission) {
  error.value = ''
  try {
    if (editingId.value === s.id) {
      await submissionsStore.approve(s.id, {
        name: editForm.value.name,
        url: editForm.value.url,
        note: editForm.value.note,
        category: editForm.value.category,
        icon_url: editForm.value.icon_url,
      })
      editingId.value = null
    } else {
      const category = s.category || ui.categories[0]?.key || ''
      if (!category) {
        error.value = '请选择分类后再通过'
        return
      }
      await submissionsStore.approve(s.id, { category })
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '操作失败'
  }
}

async function reject(s: Submission) {
  error.value = ''
  try {
    await submissionsStore.reject(s.id)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '操作失败'
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso + 'Z')
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}
</script>

<template>
  <div class="py-7 px-8">
    <h2 class="text-lg font-semibold m-0 mb-6 text-text">
      审核管理
      <span v-if="submissionsStore.submissions.length > 0" class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 ml-1.5 text-[11px] font-semibold leading-none text-link bg-search rounded-[9px] align-middle">
        {{ submissionsStore.submissions.length }}
      </span>
      <button
        class="ml-3 p-1 rounded-lg bg-transparent border-none cursor-pointer text-note hover:text-text transition-colors align-middle"
        title="刷新"
        :disabled="submissionsStore.loading"
        @click="submissionsStore.fetchSubmissions()"
      >
        <svg class="w-4 h-4 icon-stroke" :class="submissionsStore.loading && 'animate-spin'" viewBox="0 0 24 24" fill="none">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </button>
    </h2>

    <div v-if="error" class="px-3 py-2 mb-4 text-xs text-danger rounded-md bg-red-500/10">
      {{ error }}
    </div>

    <div class="mb-6">
      <h4 class="text-[13px] font-semibold m-0 text-link">待审核列表</h4>

      <div v-if="submissionsStore.loading && submissionsStore.submissions.length === 0" class="text-sm text-note mt-2">
        加载中...
      </div>

      <div v-else-if="submissionsStore.submissions.length === 0" class="text-sm text-note mt-2">
        暂无待审核的提交
      </div>

      <div v-else class="flex flex-col gap-2 mt-2">
        <div
          v-for="s in submissionsStore.submissions"
          :key="s.id"
          class="py-3 px-3.5 rounded-lg bg-search transition-colors"
        >
          <!-- Editing mode -->
          <template v-if="editingId === s.id">
            <div class="space-y-2 mb-3">
              <input
                v-model="editForm.name"
                type="text"
                placeholder="名称"
                class="w-full py-1.5 px-2.5 text-sm border-none rounded-md outline-none text-text bg-row"
              />
              <input
                v-model="editForm.url"
                type="url"
                placeholder="URL"
                class="w-full py-1.5 px-2.5 text-sm border-none rounded-md outline-none text-text bg-row"
              />
              <input
                v-model="editForm.note"
                type="text"
                placeholder="简介"
                class="w-full py-1.5 px-2.5 text-sm border-none rounded-md outline-none text-text bg-row"
              />
              <select
                v-model="editForm.category"
                class="w-full py-1.5 px-2.5 text-sm border-none rounded-md outline-none text-text bg-row cursor-pointer"
              >
                <option v-for="cat in ui.categories" :key="cat.key" :value="cat.key">
                  {{ cat.label }}
                </option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <button class="py-1 px-3 text-xs font-medium rounded-md border-none cursor-pointer transition-opacity hover:opacity-85 bg-green-500 text-white" @click="approve(s)">保存并通过</button>
              <button class="py-1 px-3 text-xs font-medium rounded-md border-none cursor-pointer transition-opacity hover:opacity-85 bg-border text-text" @click="cancelEdit">取消</button>
            </div>
          </template>

          <!-- Display mode -->
          <template v-else>
            <div class="flex items-start justify-between gap-2 mb-1">
              <div class="flex items-center gap-2 min-w-0">
                <img v-if="s.icon_url" :src="s.icon_url" alt="" class="w-5 h-5 rounded object-contain shrink-0" />
                <strong class="text-sm text-text truncate">{{ s.name }}</strong>
              </div>
              <span class="text-[10px] text-note whitespace-nowrap shrink-0">{{ formatTime(s.created_at) }}</span>
            </div>
            <a :href="s.url" target="_blank" rel="noopener noreferrer" class="text-xs text-link break-all">
              {{ s.url }}
            </a>
            <div v-if="s.note" class="text-xs text-note mt-1">{{ s.note }}</div>
            <div v-if="s.category" class="text-[10px] text-note mt-1">
              分类: {{ ui.categories.find(c => c.key === s.category)?.label || s.category }}
            </div>

            <div class="flex items-center gap-2 mt-3">
              <button class="py-1 px-3 text-xs font-medium rounded-md border-none cursor-pointer transition-opacity hover:opacity-85 bg-green-500 text-white" @click="approve(s)">通过</button>
              <button class="py-1 px-3 text-xs font-medium rounded-md border-none cursor-pointer transition-opacity hover:opacity-85 bg-primary text-white" @click="startEdit(s)">编辑</button>
              <button class="py-1 px-3 text-xs font-medium rounded-md border-none cursor-pointer transition-opacity hover:opacity-85 bg-red-500 text-white" @click="reject(s)">拒绝</button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
