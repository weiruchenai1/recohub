<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/lib/api'

interface HealthItem {
  id: number
  category: string
  name: string
  url: string
  note: string
  status: string
  last_checked: string | null
  fail_count: number
}

interface HealthResponse {
  items: HealthItem[]
  interval: number
  lastChecked: string | null
}

const deadItems = ref<HealthItem[]>([])
const loading = ref(false)
const interval = ref(21600)
const lastChecked = ref<string | null>(null)
const saving = ref(false)

const intervalOptions = [
  { label: '1 小时', value: 3600 },
  { label: '6 小时', value: 21600 },
  { label: '12 小时', value: 43200 },
  { label: '24 小时', value: 86400 },
]

async function fetchHealth() {
  loading.value = true
  try {
    const data = await api.get<HealthResponse>('/items/health')
    deadItems.value = data.items
    interval.value = data.interval
    lastChecked.value = data.lastChecked
  } catch {
    deadItems.value = []
  } finally {
    loading.value = false
  }
}

async function updateInterval(e: Event) {
  const value = parseInt((e.target as HTMLSelectElement).value)
  saving.value = true
  try {
    await api.put('/items/health', { interval: value })
    interval.value = value
  } catch {
    // revert on failure
  } finally {
    saving.value = false
  }
}

async function dismissItem(id: number) {
  try {
    await api.delete(`/items/health?id=${id}`)
    deadItems.value = deadItems.value.filter(i => i.id !== id)
  } catch { /* ignore */ }
}

function formatInterval(sec: number): string {
  const opt = intervalOptions.find(o => o.value === sec)
  return opt ? opt.label : `${sec} 秒`
}

function formatTime(iso: string | null): string {
  if (!iso) return '从未'
  try {
    const d = new Date(iso + 'Z')
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

// Load on mount
fetchHealth()
</script>

<template>
  <div class="panel">
    <h2 class="panel-title">
      链接检查
      <button
        class="ml-3 p-1 rounded-lg bg-transparent border-none cursor-pointer text-note hover:text-text transition-colors align-middle"
        title="刷新列表"
        :disabled="loading"
        @click="fetchHealth"
      >
        <svg class="w-4 h-4 icon-stroke" :class="loading && 'animate-spin'" viewBox="0 0 24 24" fill="none">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </button>
    </h2>

    <!-- Check settings -->
    <div class="section">
      <h4 class="section-label">检查设置</h4>
      <div class="flex flex-col gap-3 mt-2">
        <div class="flex items-center justify-between">
          <span class="text-sm text-text">检查间隔</span>
          <select
            :value="interval"
            :disabled="saving"
            class="py-1.5 px-2.5 text-sm border-none rounded-lg outline-none text-text bg-search cursor-pointer"
            @change="updateInterval"
          >
            <option v-for="opt in intervalOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-2 px-3 py-2 rounded-md bg-search text-xs">
          <span class="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
          <span class="text-note">
            自动检查已启用，每 {{ formatInterval(interval) }} 执行一次
          </span>
          <span class="ml-auto text-note shrink-0">
            上次检查: {{ formatTime(lastChecked) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Dead items list -->
    <div class="section">
      <h4 class="section-label">异常链接</h4>

      <div v-if="loading && deadItems.length === 0" class="text-sm text-note mt-2">
        加载中...
      </div>

      <div v-else-if="deadItems.length === 0" class="text-sm text-note mt-2">
        所有链接状态正常
      </div>

      <div v-else class="flex flex-col gap-2 mt-2">
        <div
          v-for="item in deadItems"
          :key="item.id"
          class="health-card relative"
        >
          <button
            class="absolute top-2 right-2 p-0.5 rounded bg-transparent border-none cursor-pointer text-note hover:text-text transition-colors"
            title="重置状态"
            @click="dismissItem(item.id)"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div class="flex items-center gap-2 mb-1 pr-6">
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
              :class="item.status === 'dead' ? 'bg-red-500/15 text-red-500' : 'bg-yellow-500/15 text-yellow-600'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="item.status === 'dead' ? 'bg-red-500' : 'bg-yellow-500'"></span>
              {{ item.status === 'dead' ? '已失效' : '异常' }}
            </span>
            <strong class="text-sm text-text truncate">{{ item.name }}</strong>
          </div>
          <a :href="item.url" target="_blank" rel="noopener noreferrer" class="text-xs text-link break-all">
            {{ item.url }}
          </a>
          <div class="flex items-center gap-4 mt-1 text-[10px] text-note">
            <span>连续失败: {{ item.fail_count }} 次</span>
            <span>最后检测: {{ formatTime(item.last_checked) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  padding: 28px 32px;
}
.panel-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 24px 0;
  color: var(--text-color);
}
.section {
  margin-bottom: 24px;
}
.section-label {
  font-size: 13px;
  font-weight: 600;
  margin: 0;
  color: var(--link-color);
}

.health-card {
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--search-bg);
  transition: background-color 0.15s;
}
</style>
