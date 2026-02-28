<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { api, ApiRequestError } from '@/lib/api'
import type { IconInfo } from '@/types'
import ReviewPanel from '@/components/ReviewPanel.vue'
import HealthPanel from '@/components/HealthPanel.vue'

const ui = useUiStore()
const auth = useAuthStore()

const baseSidebarItems = [
  { key: 'account', label: '我的账号', icon: 'user' },
  { key: 'personalize', label: '个性化设置', icon: 'palette' },
  { key: 'groups', label: '分组管理', icon: 'folder' },
  { key: 'icons', label: '图标管理', icon: 'image' },
]

const adminSidebarItems = [
  { key: 'review', label: '审核管理', icon: 'inbox' },
  { key: 'health', label: '链接检查', icon: 'activity' },
]

const sidebarItems = computed(() =>
  auth.isLoggedIn
    ? [...baseSidebarItems, ...adminSidebarItems]
    : baseSidebarItems
)

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
    })
  }, auth.isLoggedIn)
}

function onDragEnd() {
  ui.requireAuthOrLogin(() => {
    ui.syncCategories()
  }, auth.isLoggedIn)
}

// --- Wallpaper presets ---
const wallpaperPresets = [
  { label: '无', value: '' },
  { label: '渐变蓝紫', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { label: '渐变青绿', value: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)' },
  { label: '渐变暖橙', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { label: '渐变深空', value: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #0c0c1d 100%)' },
]

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
    })
  }, auth.isLoggedIn)
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
            <!-- user -->
            <svg v-if="item.icon === 'user'" class="w-4 h-4 icon-stroke shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <!-- palette -->
            <svg v-else-if="item.icon === 'palette'" class="w-4 h-4 icon-stroke shrink-0" viewBox="0 0 24 24" fill="none">
              <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/>
              <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/>
              <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/>
              <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
            <!-- folder -->
            <svg v-else-if="item.icon === 'folder'" class="w-4 h-4 icon-stroke shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <!-- image -->
            <svg v-else-if="item.icon === 'image'" class="w-4 h-4 icon-stroke shrink-0" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <!-- inbox -->
            <svg v-else-if="item.icon === 'inbox'" class="w-4 h-4 icon-stroke shrink-0" viewBox="0 0 24 24" fill="none">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
              <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
            </svg>
            <!-- activity -->
            <svg v-else-if="item.icon === 'activity'" class="w-4 h-4 icon-stroke shrink-0" viewBox="0 0 24 24" fill="none">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
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
        <div v-if="activeTab === 'account'" class="settings-panel">
          <h2 class="settings-title">我的账号</h2>

          <div class="setting-section">
            <h4 class="setting-label">登录状态</h4>
            <div class="flex items-center gap-3 mt-2">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                :class="auth.isLoggedIn ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="auth.isLoggedIn ? 'bg-green-500' : 'bg-red-500'"></span>
                {{ auth.isLoggedIn ? '已登录' : '未登录' }}
              </span>
            </div>
          </div>

          <div v-if="auth.isLoggedIn" class="setting-section">
            <h4 class="setting-label">操作</h4>
            <button
              class="mt-2 px-4 py-2 text-sm font-medium rounded-lg border border-danger text-danger bg-transparent cursor-pointer hover:bg-red-500/10 transition-colors"
              @click="auth.logout(); close()"
            >
              退出登录
            </button>
          </div>
        </div>

        <!-- Personalization -->
        <div v-else-if="activeTab === 'personalize'" class="settings-panel">
          <h2 class="settings-title">个性化设置</h2>

          <!-- LOGO visibility -->
          <div class="setting-section">
            <h4 class="setting-label">LOGO</h4>
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
          <div class="setting-section">
            <h4 class="setting-label">文本内容</h4>
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

          <!-- Wallpaper -->
          <div class="setting-section">
            <h4 class="setting-label">切换壁纸</h4>
            <div class="grid grid-cols-5 gap-2 mt-2">
              <button
                v-for="preset in wallpaperPresets"
                :key="preset.value"
                class="wallpaper-btn"
                :class="ui.wallpaper === preset.value && 'wallpaper-btn-active'"
                :style="preset.value ? { background: preset.value } : {}"
                :title="preset.label"
                @click="ui.wallpaper = preset.value"
              >
                <span v-if="!preset.value" class="text-[10px] text-note leading-none">无</span>
                <svg v-if="ui.wallpaper === preset.value" class="w-4 h-4 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Group management -->
        <div v-else-if="activeTab === 'groups'" class="settings-panel">
          <h2 class="settings-title">分组管理</h2>

          <div class="setting-section">
            <div class="flex items-center justify-between">
              <h4 class="setting-label">当前分组</h4>
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
                <div class="group-item">
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

          <div class="setting-section">
            <h4 class="setting-label">添加分组</h4>
            <div class="flex gap-2 mt-2">
              <input
                v-model="newGroupLabel"
                type="text"
                placeholder="输入分组名称"
                class="flex-1 py-[9px] px-3 text-sm border-none rounded-lg outline-none text-text bg-search"
                @keydown.enter="addGroup"
              />
              <button
                class="shrink-0 px-4 py-2 text-sm font-medium rounded-lg border-none text-white cursor-pointer transition-opacity hover:opacity-85"
                :style="{ backgroundColor: 'var(--btn-primary-bg)' }"
                @click="addGroup"
              >
                添加
              </button>
            </div>
          </div>
        </div>

        <!-- Icon management -->
        <div v-else-if="activeTab === 'icons'" class="settings-panel">
          <h2 class="settings-title">
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

          <div v-if="iconsLoading && icons.length === 0" class="text-sm text-note">
            加载中...
          </div>

          <div v-else-if="icons.length === 0" class="text-sm text-note">
            暂无已上传的图标
          </div>

          <div v-else class="icon-grid">
            <div v-for="icon in icons" :key="icon.key" class="icon-card">
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

        <!-- Review management -->
        <ReviewPanel v-else-if="activeTab === 'review'" />

        <!-- Health check -->
        <HealthPanel v-else-if="activeTab === 'health'" />
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

.settings-panel {
  padding: 28px 32px;
}

.settings-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 24px 0;
  color: var(--text-color);
}

.setting-section {
  margin-bottom: 24px;
}

.setting-label {
  font-size: 13px;
  font-weight: 600;
  margin: 0;
  color: var(--link-color);
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
  background-color: var(--btn-primary-bg);
  border-color: var(--btn-primary-bg);
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

/* Wallpaper presets */
.wallpaper-btn {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 8px;
  border: 2px solid var(--border-color);
  cursor: pointer;
  transition: border-color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--search-bg);
}
.wallpaper-btn:hover {
  border-color: var(--link-color);
}
.wallpaper-btn-active {
  border-color: var(--link-color);
}

/* Group items */
.group-item {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
}
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

/* Icon management */
.icon-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.icon-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background-color: var(--search-bg);
  transition: background-color 0.15s;
}
.icon-card:hover {
  background-color: var(--header-bg);
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
