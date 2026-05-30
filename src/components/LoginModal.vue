<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { api } from '@/lib/api'

const emit = defineEmits<{
  close: []
}>()

const auth = useAuthStore()
const ui = useUiStore()

const password = ref('')
const error = ref('')
const loading = ref(false)
const linuxdoEnabled = ref(false)
const linuxdoClientId = ref('')

const adminOnly = ui.loginAdminOnly

onMounted(async () => {
  if (adminOnly) return
  try {
    const config = await api.get<{ linuxdo_enabled: boolean; linuxdo_client_id: string }>('/oauth/config')
    linuxdoEnabled.value = config.linuxdo_enabled
    linuxdoClientId.value = config.linuxdo_client_id
  } catch {
    // OAuth not configured, hide the button
  }
})

async function handleLogin() {
  error.value = ''
  if (!password.value) return

  loading.value = true
  try {
    await auth.login(password.value)
    ui.onLoginSuccess()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    loading.value = false
  }
}

function handleLinuxDoLogin() {
  if (!linuxdoClientId.value) {
    error.value = 'Linux DO OAuth 尚未配置'
    return
  }
  const redirectUri = `${window.location.origin}/api/oauth/linuxdo`
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: linuxdoClientId.value,
    redirect_uri: redirectUri,
    scope: 'user',
  })
  window.location.href = `https://connect.linux.do/oauth2/authorize?${params.toString()}`
}

function handleClose() {
  ui.loginAdminOnly = false
  emit('close')
}
</script>

<template>
  <div
    class="fixed inset-0 z-[2000] flex items-center justify-center transition-opacity duration-[250ms] bg-overlay"
    @click.self="handleClose"
  >
    <div class="w-[420px] max-w-[92vw] rounded-2xl p-7 border-none bg-row">
      <div class="flex items-center gap-3 m-0 mb-5">
        <h3 class="text-[17px] font-semibold text-text">
          登录
        </h3>
      </div>

      <!-- Linux DO 访客登录 -->
      <template v-if="!adminOnly">
        <div v-if="linuxdoEnabled || auth.isVisitorLoggedIn" class="mb-5">
          <button
            v-if="!auth.isVisitorLoggedIn"
            type="button"
            class="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-lg cursor-pointer border border-border text-text bg-search transition-colors hover:bg-header"
            @click="handleLinuxDoLogin"
          >
            <svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            通过 Linux DO 登录
          </button>
          <div
            v-else
            class="flex items-center justify-between py-2.5 px-4 rounded-lg border border-border bg-search"
          >
            <span class="text-sm text-text">
              {{ auth.visitorInfo?.linuxdo_name || auth.visitorInfo?.linuxdo_username }}
            </span>
            <button
              type="button"
              class="text-xs text-note cursor-pointer bg-transparent border-none hover:text-danger transition-colors"
              @click="auth.visitorLogout()"
            >
              退出
            </button>
          </div>
        </div>

        <div v-if="linuxdoEnabled || auth.isVisitorLoggedIn" class="h-px bg-border mb-5"></div>
      </template>

      <!-- 管理员密码登录 -->
      <div class="flex items-center gap-3 mb-2.5">
        <p class="text-[13px] text-note">管理员登录</p>
        <span v-if="error" class="text-xs text-danger">
          {{ error }}
        </span>
      </div>
      <div class="mb-3.5">
        <input
          v-model="password"
          type="password"
          autofocus
          placeholder="请输入管理密码"
          class="w-full py-[9px] px-3 text-sm border-none rounded-lg outline-none transition-[box-shadow] duration-150 text-text bg-search"
          @keydown.enter="handleLogin"
        />
      </div>

      <div class="flex justify-end gap-2 mt-[22px]">
        <button
          type="button"
          @click="handleClose"
          class="px-[18px] py-2 text-sm font-medium rounded-lg cursor-pointer bg-transparent border border-border text-text transition-colors"
        >
          取消
        </button>
        <button
          type="button"
          :disabled="loading"
          @click="handleLogin"
          class="px-[18px] py-2 text-sm font-medium rounded-lg cursor-pointer border-none text-white bg-primary transition-opacity hover:opacity-85"
        >
          {{ loading ? '登录中...' : '管理员登录' }}
        </button>
      </div>
    </div>
  </div>
</template>
