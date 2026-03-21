<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useItemsStore } from '@/stores/items'
import { api, ApiRequestError } from '@/lib/api'
import { SETTINGS_BASE_ITEMS, SETTINGS_ADMIN_ITEMS } from '@/lib/menuItems'
import type { IconInfo } from '@/types'
import ReviewPanel from '@/components/ReviewPanel.vue'
import MenuIcon from '@/components/MenuIcon.vue'

const ui = useUiStore()
const auth = useAuthStore()
const itemsStore = useItemsStore()

const sidebarItems = computed(() => {
  if (auth.isLoggedIn) return [...SETTINGS_BASE_ITEMS, ...SETTINGS_ADMIN_ITEMS]
  return SETTINGS_BASE_ITEMS.filter(item => item.visitor)
})

const activeTab = computed(() => ui.settingsTab)

function switchTab(key: string) {
  ui.settingsTab = key
}

function close() {
  ui.showSettingsModal = false
}

// --- Personalization ---
const LOGO_TEXT_MAX = 20

// --- Group management ---
const newGroupLabel = ref('')

async function addGroup() {
  const label = newGroupLabel.value.trim()
  if (!label) return
  const key = label.toLowerCase().replace(/\s+/g, '-')
  if (ui.categories.some(c => c.key === key)) return
  ui.requireAuthOrLogin(async () => {
    await ui.addCategory(key, label)
    newGroupLabel.value = ''
  }, auth.isLoggedIn)
}

const groupError = ref('')
const groupErrorIndex = ref(-1)
let groupErrorTimer: ReturnType<typeof setTimeout>

async function removeGroup(index: number) {
  if (ui.categories.length <= 1) return
  clearTimeout(groupErrorTimer)
  const cat = ui.categories[index]
  if (!cat) return

  ui.requireAuthOrLogin(() => {
    ui.confirm('删除分组', `确定删除分组「${cat.label}」？`, async () => {
      try {
        await ui.removeCategory(index)
        groupError.value = ''
        groupErrorIndex.value = -1
      } catch (e) {
        groupErrorIndex.value = index
        if (e instanceof ApiRequestError && e.status === 409) {
          groupError.value = e.message
        } else {
          groupError.value = '删除失败，请检查网络连接'
        }
        groupErrorTimer = setTimeout(() => { groupError.value = ''; groupErrorIndex.value = -1 }, 3000)
      }
    }, { buttonText: '删除' })
  }, auth.isLoggedIn)
}

function onDragEnd() {
  ui.requireAuthOrLogin(() => {
    ui.syncCategories()
  }, auth.isLoggedIn)
}

// --- Icon management ---
const icons = ref<IconInfo[]>([])
const iconsLoading = ref(false)

async function fetchIcons() {
  iconsLoading.value = true
  try {
    icons.value = await api.get<IconInfo[]>('/icons')
  } catch {
    icons.value = []
  } finally {
    iconsLoading.value = false
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  return (bytes / 1024).toFixed(1) + ' KB'
}

async function deleteIcon(icon: IconInfo) {
  ui.requireAuthOrLogin(() => {
    ui.confirm('删除图标', '确定删除该图标？如果有条目正在使用，将恢复为自动获取。', async () => {
      try {
        await api.delete(`/icons/${encodeURIComponent(icon.key)}`)
        icons.value = icons.value.filter(i => i.key !== icon.key)
      } catch {
        // silently fail
      }
    }, { buttonText: '删除' })
  }, auth.isLoggedIn)
}

// --- Batch icon fetch ---
const batchIconLoading = ref(false)
const batchIconResult = ref<{ total: number; fetched: number; failed: number } | null>(null)
const batchIconProgress = ref<{ current: number; total: number; name: string } | null>(null)

async function batchFetchIcons() {
  ui.requireAuthOrLogin(() => {
    ui.confirm('获取图标', '将为所有没有图标的条目自动获取图标，此操作可能需要一些时间。', async () => {
      batchIconLoading.value = true
      batchIconResult.value = null
      batchIconProgress.value = null
      try {
        const token = localStorage.getItem('auth_token')
        const resp = await fetch('/api/items/fetch-icons', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: '{}',
        })
        if (!resp.ok || !resp.body) throw new Error('request failed')

        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop()!

          for (const line of lines) {
            if (!line.trim()) continue
            const msg = JSON.parse(line)
            if (msg.type === 'progress') {
              batchIconProgress.value = { current: msg.current, total: msg.total, name: msg.name }
            } else if (msg.type === 'done') {
              batchIconResult.value = { total: msg.total, fetched: msg.fetched, failed: msg.failed }
            }
          }
        }

        fetchIcons()
      } catch {
        batchIconResult.value = null
      } finally {
        batchIconLoading.value = false
        batchIconProgress.value = null
      }
    }, { buttonText: '确认', variant: 'primary' })
  }, auth.isLoggedIn)
}

async function deleteAllIcons() {
  if (icons.value.length === 0) return
  ui.requireAuthOrLogin(() => {
    ui.confirm('删除全部图标', `确定删除全部 ${icons.value.length} 个图标？所有条目的图标将恢复为自动获取。`, async () => {
      try {
        await api.delete('/icons')
        icons.value = []
      } catch {
        // silently fail
      }
    }, { buttonText: '全部删除' })
  }, auth.isLoggedIn)
}

// --- Data management ---
const exportLoading = ref(false)
const importLoading = ref(false)
const importResult = ref<{ categories_imported: number; items_imported: number; items_skipped: number } | null>(null)
const importError = ref('')
const importMode = ref<'merge' | 'overwrite'>('merge')
const fileInput = ref<HTMLInputElement | null>(null)

async function exportData() {
  exportLoading.value = true
  try {
    const data = await api.get<Record<string, unknown>>('/db/export')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recohub-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    // silently fail
  } finally {
    exportLoading.value = false
  }
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  importLoading.value = true
  importResult.value = null
  importError.value = ''

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    data.mode = importMode.value

    const res = await api.post<{ categories_imported: number; items_imported: number; items_skipped: number }>('/db/import', data)
    importResult.value = res

    // Refresh categories and current items list
    await ui.fetchCategories()
    await itemsStore.fetchItems({
      category: ui.activeTab,
      page: ui.page,
      perPage: ui.perPage,
    })
  } catch (err) {
    if (err instanceof ApiRequestError) {
      importError.value = err.message
    } else if (err instanceof SyntaxError) {
      importError.value = '文件格式错误，请选择有效的 JSON 文件'
    } else {
      importError.value = '导入失败，请检查文件格式'
    }
  } finally {
    importLoading.value = false
    // Reset file input
    if (fileInput.value) fileInput.value.value = ''
  }
}

watch(activeTab, (tab) => {
  if (tab === 'icons') {
    fetchIcons()
  }
})
</script>

<template>
  <div
    class="fixed inset-0 z-[2000] flex items-center justify-center bg-overlay"
    @click.self="close"
  >
    <div class="settings-container">
      <!-- Sidebar -->
      <aside class="settings-sidebar">
        <h3 class="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-note">
          系统设置
        </h3>
        <nav class="flex flex-col gap-0.5 px-2">
          <button
            v-for="item in sidebarItems"
            :key="item.key"
            class="sidebar-item"
            :class="activeTab === item.key && 'sidebar-item-active'"
            @click="switchTab(item.key)"
          >
            <MenuIcon :name="item.icon" />
            <span>{{ item.label }}</span>
          </button>
        </nav>
      </aside>

      <!-- Content -->
      <main class="settings-content">
        <!-- Close button -->
        <button class="absolute top-4 right-4 p-1 rounded-lg bg-transparent border-none cursor-pointer text-note hover:text-text transition-colors" @click="close">
          <svg class="w-5 h-5 icon-stroke" viewBox="0 0 24 24" fill="none">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- Account -->
        <div v-if="activeTab === 'account'" class="py-7 px-8">
          <h2 class="text-lg font-semibold m-0 mb-6 text-text">我的账号</h2>

          <!-- Visitor (Linux DO) -->
          <template v-if="auth.isVisitorLoggedIn && auth.visitorInfo">
            <div class="flex items-center gap-4 mb-6 p-4 rounded-xl bg-search">
              <img
                v-if="auth.visitorInfo.linuxdo_avatar"
                :src="auth.visitorInfo.linuxdo_avatar"
                alt="头像"
                class="w-14 h-14 rounded-full object-cover shrink-0"
              />
              <div v-else class="w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl font-semibold shrink-0">
                {{ (auth.visitorInfo.linuxdo_name || auth.visitorInfo.linuxdo_username).charAt(0) }}
              </div>
              <div class="min-w-0">
                <div class="text-base font-semibold text-text truncate">{{ auth.visitorInfo.linuxdo_name || auth.visitorInfo.linuxdo_username }}</div>
                <div class="text-sm text-note">@{{ auth.visitorInfo.linuxdo_username }}</div>
                <div class="text-xs text-note mt-1">信任等级：{{ auth.visitorInfo.trust_level }}</div>
              </div>
            </div>

            <div class="mb-6">
              <h4 class="text-[13px] font-semibold m-0 text-link">登录状态</h4>
              <div class="flex items-center gap-3 mt-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-500">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  已登录（Linux DO）
                </span>
              </div>
            </div>

            <div class="mb-6">
              <h4 class="text-[13px] font-semibold m-0 text-link">操作</h4>
              <button
                class="mt-2 px-4 py-2 text-sm font-medium rounded-lg border border-danger text-danger bg-transparent cursor-pointer hover:bg-red-500/10 transition-colors"
                @click="auth.visitorLogout(); close()"
              >
                退出登录
              </button>
            </div>
          </template>

          <!-- Admin -->
          <template v-else-if="auth.isLoggedIn">
            <div class="mb-6">
              <h4 class="text-[13px] font-semibold m-0 text-link">登录状态</h4>
              <div class="flex items-center gap-3 mt-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-500">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  已登录（管理员）
                </span>
              </div>
            </div>

            <div class="mb-6">
              <h4 class="text-[13px] font-semibold m-0 text-link">操作</h4>
              <button
                class="mt-2 px-4 py-2 text-sm font-medium rounded-lg border border-danger text-danger bg-transparent cursor-pointer hover:bg-red-500/10 transition-colors"
                @click="auth.logout(); close()"
              >
                退出登录
              </button>
            </div>
          </template>

          <!-- Not logged in -->
          <template v-else>
            <div class="mb-6">
              <h4 class="text-[13px] font-semibold m-0 text-link">登录状态</h4>
              <div class="flex items-center gap-3 mt-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-500">
                  <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  未登录
                </span>
              </div>
            </div>
          </template>
        </div>

        <!-- Personalization -->
        <div v-else-if="activeTab === 'personalize'" class="py-7 px-8">
          <h2 class="text-lg font-semibold m-0 mb-6 text-text">个性化设置</h2>

          <!-- LOGO visibility -->
          <div class="mb-6">
            <h4 class="text-[13px] font-semibold m-0 text-link">LOGO</h4>
            <div class="flex items-center justify-between mt-2">
              <span class="text-sm text-text">显示</span>
              <button
                type="button"
                role="switch"
                :aria-checked="ui.logoVisible"
                class="settings-toggle"
                :class="ui.logoVisible ? 'settings-toggle-on' : 'settings-toggle-off'"
                @click="ui.logoVisible = !ui.logoVisible"
              >
                <span class="settings-toggle-thumb" :class="ui.logoVisible ? 'translate-x-[18px]' : 'translate-x-0'"></span>
              </button>
            </div>
          </div>

          <!-- LOGO text -->
          <div class="mb-6">
            <h4 class="text-[13px] font-semibold m-0 text-link">文本内容</h4>
            <div class="relative mt-2">
              <input
                v-model="ui.logoText"
                type="text"
                :maxlength="LOGO_TEXT_MAX"
                class="w-full py-[9px] px-3 pr-16 text-sm border-none rounded-lg outline-none text-text bg-search"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-note pointer-events-none">
                {{ ui.logoText.length }} / {{ LOGO_TEXT_MAX }}
              </span>
            </div>
          </div>

        </div>

        <!-- Group management -->
        <div v-else-if="activeTab === 'groups'" class="py-7 px-8">
          <h2 class="text-lg font-semibold m-0 mb-6 text-text">分组管理</h2>

          <div class="mb-6">
            <div class="flex items-center justify-between">
              <h4 class="text-[13px] font-semibold m-0 text-link">当前分组</h4>
            </div>
            <VueDraggable
              v-model="ui.categories"
              :animation="150"
              handle=".drag-handle"
              ghost-class="group-item-ghost"
              drag-class="group-item-drag"
              class="flex flex-col gap-1.5 mt-2"
              @end="onDragEnd"
            >
              <div v-for="(cat, index) in ui.categories" :key="cat.key" class="group-item-wrapper">
                <div class="flex items-center gap-1 rounded-md">
                  <span class="drag-handle flex items-center text-note shrink-0 cursor-grab active:cursor-grabbing">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                      <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                      <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                    </svg>
                  </span>
                  <input
                    :value="cat.label"
                    class="flex-1 py-1.5 px-2.5 text-sm border-none rounded-md outline-none text-text bg-search"
                    @change="(e: Event) => ui.updateCategory(index, (e.target as HTMLInputElement).value)"
                  />
                  <button
                    class="group-action-btn hover:!text-danger"
                    :class="ui.categories.length <= 1 && 'opacity-30 !cursor-not-allowed'"
                    :disabled="ui.categories.length <= 1"
                    title="删除"
                    @click="removeGroup(index)"
                  >
                    <svg class="w-4 h-4 icon-stroke" viewBox="0 0 24 24" fill="none">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
                <div v-if="groupErrorIndex === index && groupError" class="px-3 py-2 mt-1 text-xs text-danger rounded-md bg-red-500/10">
                  {{ groupError }}
                </div>
              </div>
            </VueDraggable>
          </div>

          <div class="mb-6">
            <h4 class="text-[13px] font-semibold m-0 text-link">添加分组</h4>
            <div class="flex gap-2 mt-2">
              <input
                v-model="newGroupLabel"
                type="text"
                placeholder="输入分组名称"
                class="flex-1 py-[9px] px-3 text-sm border-none rounded-lg outline-none text-text bg-search"
                @keydown.enter="addGroup"
              />
              <button
                class="shrink-0 px-4 py-2 text-sm font-medium rounded-lg border-none bg-primary text-white cursor-pointer transition-opacity hover:opacity-85"
                @click="addGroup"
              >
                添加
              </button>
            </div>
          </div>
        </div>

        <!-- Icon management -->
        <div v-else-if="activeTab === 'icons'" class="py-7 px-8">
          <h2 class="text-lg font-semibold m-0 mb-6 text-text">
            图标管理
            <button
              class="ml-3 p-1 rounded-lg bg-transparent border-none cursor-pointer text-note hover:text-text transition-colors align-middle"
              title="刷新"
              :disabled="iconsLoading"
              @click="fetchIcons"
            >
              <svg class="w-4 h-4 icon-stroke" :class="iconsLoading && 'animate-spin'" viewBox="0 0 24 24" fill="none">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
          </h2>

          <!-- Batch fetch icons -->
          <div class="mb-6">
            <h4 class="text-[13px] font-semibold m-0 text-link">批量获取图标</h4>
            <p class="text-xs text-note mt-1 mb-2">为所有没有图标的条目自动获取网站图标</p>
            <button
              class="px-4 py-2 text-sm font-medium rounded-lg border-none bg-primary text-white cursor-pointer transition-opacity hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="batchIconLoading"
              @click="batchFetchIcons"
            >
              {{ batchIconLoading ? '获取中...' : '一键获取图标' }}
            </button>
            <!-- Progress bar -->
            <div v-if="batchIconProgress" class="mt-3">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-note truncate mr-2">正在获取：{{ batchIconProgress.name }}</span>
                <span class="text-xs text-text shrink-0">{{ batchIconProgress.current }} / {{ batchIconProgress.total }}</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-search overflow-hidden">
                <div
                  class="h-full rounded-full bg-primary transition-all duration-300"
                  :style="{ width: (batchIconProgress.current / batchIconProgress.total * 100) + '%' }"
                ></div>
              </div>
            </div>
            <div v-if="batchIconResult" class="mt-2 px-3 py-2 text-xs rounded-md bg-green-500/10 text-green-600 dark:text-green-400">
              共 {{ batchIconResult.total }} 个缺失图标，成功获取 {{ batchIconResult.fetched }} 个<span v-if="batchIconResult.failed">，{{ batchIconResult.failed }} 个获取失败</span>
            </div>
          </div>

          <!-- Delete all icons -->
          <div v-if="icons.length > 0" class="mb-6">
            <h4 class="text-[13px] font-semibold m-0 text-link">删除全部图标</h4>
            <p class="text-xs text-note mt-1 mb-2">删除所有已上传的图标，条目将恢复为自动获取</p>
            <button
              class="px-4 py-2 text-sm font-medium rounded-lg border border-danger text-danger bg-transparent cursor-pointer hover:bg-red-500/10 transition-colors"
              @click="deleteAllIcons"
            >
              删除全部图标（{{ icons.length }}）
            </button>
          </div>

          <div v-if="iconsLoading && icons.length === 0" class="text-sm text-note">
            加载中...
          </div>

          <div v-else-if="icons.length === 0" class="text-sm text-note">
            暂无已上传的图标
          </div>

          <div v-else class="flex flex-col gap-2">
            <div v-for="icon in icons" :key="icon.key" class="flex items-center gap-3 py-2 px-2.5 rounded-lg bg-search transition-colors hover:bg-header">
              <img :src="icon.url" alt="" class="w-10 h-10 rounded-lg object-contain" />
              <div class="flex-1 min-w-0">
                <div class="text-xs text-text truncate" :title="icon.key">{{ icon.key }}</div>
                <div class="text-[11px] text-note">{{ formatSize(icon.size) }}</div>
              </div>
              <button
                class="group-action-btn hover:!text-danger shrink-0"
                title="删除"
                @click="deleteIcon(icon)"
              >
                <svg class="w-4 h-4 icon-stroke" viewBox="0 0 24 24" fill="none">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Data management -->
        <div v-else-if="activeTab === 'data'" class="py-7 px-8">
          <h2 class="text-lg font-semibold m-0 mb-6 text-text">数据管理</h2>

          <!-- Export -->
          <div class="mb-6">
            <h4 class="text-[13px] font-semibold m-0 text-link">导出数据</h4>
            <p class="text-xs text-note mt-1 mb-2">将所有分组和条目导出为 JSON 文件</p>
            <button
              class="px-4 py-2 text-sm font-medium rounded-lg border-none bg-primary text-white cursor-pointer transition-opacity hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="exportLoading"
              @click="exportData"
            >
              {{ exportLoading ? '导出中...' : '导出数据' }}
            </button>
          </div>

          <!-- Import -->
          <div class="mb-6">
            <h4 class="text-[13px] font-semibold m-0 text-link">导入数据</h4>
            <p class="text-xs text-note mt-1 mb-2">从 JSON 文件导入分组和条目</p>

            <div class="flex items-center gap-4 mb-3">
              <label class="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                <input type="radio" value="merge" v-model="importMode" class="accent-primary" />
                合并导入
              </label>
              <label class="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                <input type="radio" value="overwrite" v-model="importMode" class="accent-primary" />
                覆盖导入
              </label>
            </div>
            <p v-if="importMode === 'merge'" class="text-xs text-note mb-2">合并模式：保留现有数据，仅添加不存在的分组和条目</p>
            <p v-else class="text-xs text-danger mb-2">覆盖模式：将清空现有所有分组和条目，然后导入文件中的数据</p>

            <input ref="fileInput" type="file" accept=".json" class="hidden" @change="handleImportFile" />
            <button
              class="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              :class="importMode === 'overwrite' ? 'border border-danger text-danger bg-transparent hover:bg-red-500/10' : 'border border-transparent bg-primary text-white hover:opacity-85'"
              :disabled="importLoading"
              @click="importMode === 'overwrite' ? ui.confirm('覆盖导入', '此操作将清空所有现有数据！确定要继续吗？', triggerImport, { buttonText: '确认覆盖' }) : triggerImport()"
            >
              {{ importLoading ? '导入中...' : '选择文件并导入' }}
            </button>

            <div v-if="importResult" class="mt-2 px-3 py-2 text-xs rounded-md bg-green-500/10 text-green-600 dark:text-green-400">
              导入完成：{{ importResult.categories_imported }} 个分组，{{ importResult.items_imported }} 个条目<span v-if="importResult.items_skipped">，{{ importResult.items_skipped }} 个条目已跳过（重复）</span>
            </div>
            <div v-if="importError" class="mt-2 px-3 py-2 text-xs rounded-md bg-red-500/10 text-danger">
              {{ importError }}
            </div>
          </div>
        </div>

        <!-- Review management -->
        <ReviewPanel v-else-if="activeTab === 'review'" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.settings-container {
  display: flex;
  width: 680px;
  max-width: 94vw;
  height: 480px;
  max-height: 85vh;
  border-radius: 16px;
  overflow: hidden;
  background-color: var(--row-bg);
  border: 1px solid var(--border-color);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
}

.settings-sidebar {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-color);
  background-color: var(--header-bg);
  padding-bottom: 12px;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  position: relative;
  scrollbar-width: none;
}
.settings-content::-webkit-scrollbar {
  display: none;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  transition: background-color 0.1s;
  text-align: left;
}
.sidebar-item:hover {
  background-color: var(--search-bg);
}
.sidebar-item-active {
  background-color: var(--search-bg);
  color: var(--link-color);
}

/* Toggle */
.settings-toggle {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  border: 1px solid var(--border-color);
  padding: 0;
  cursor: pointer;
  transition: background-color 0.25s, border-color 0.25s;
}
.settings-toggle-on {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}
.settings-toggle-off {
  background-color: var(--search-bg);
}
.settings-toggle-thumb {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
  transition: transform 0.25s;
}

/* Group items */
.group-item-ghost {
  opacity: 0.4;
}
.group-item-drag {
  opacity: 0;
}

.group-action-btn {
  padding: 4px;
  border-radius: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--note-color);
  transition: color 0.15s, background-color 0.15s;
  flex-shrink: 0;
}
.group-action-btn:hover:not(:disabled) {
  color: var(--text-color);
  background-color: var(--search-bg);
}

@media (max-width: 640px) {
  .settings-container {
    flex-direction: column;
    height: 90vh;
  }
  .settings-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  .settings-sidebar nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 4px 8px;
    scrollbar-width: none;
  }
  .settings-sidebar nav::-webkit-scrollbar {
    display: none;
  }
  .sidebar-item {
    flex-shrink: 0;
    white-space: nowrap;
  }
}
</style>
