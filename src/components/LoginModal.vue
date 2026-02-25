<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const emit = defineEmits<{
  close: []
}>()

const auth = useAuthStore()
const ui = useUiStore()

const password = ref('')
const error = ref('')
const loading = ref(false)

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
</script>

<template>
  <div
    class="fixed inset-0 z-[2000] flex items-center justify-center transition-opacity duration-[250ms]"
    style="background-color:rgba(0,0,0,0.4)"
    @click.self="emit('close')"
  >
    <div
      class="w-[420px] max-w-[92vw] rounded-2xl p-7 border-none"
      style="background-color:var(--row-bg)"
    >
      <h3 class="m-0 mb-5 text-[17px] font-semibold" style="color:var(--text-color)">
        管理员登录
      </h3>

      <div v-if="error" class="mb-3 text-sm" style="color:#f85149">
        {{ error }}
      </div>

      <div class="mb-3.5">
        <label class="block text-[13px] font-medium mb-1" style="color:var(--note-color)">
          密码 <span style="color:#f85149;margin-left:2px">*</span>
        </label>
        <input
          v-model="password"
          type="password"
          autofocus
          placeholder="请输入管理密码"
          class="w-full py-[9px] px-3 text-sm border-none rounded-lg outline-none transition-[box-shadow] duration-150"
          :style="{ color: 'var(--text-color)', backgroundColor: 'var(--search-bg)', fontFamily: 'inherit' }"
          @keydown.enter="handleLogin"
        />
      </div>

      <div class="flex justify-end gap-2 mt-[22px]">
        <button
          type="button"
          @click="emit('close')"
          class="py-2 px-[18px] text-sm font-medium rounded-lg cursor-pointer transition-[background-color,color] duration-150"
          style="background:transparent;border:1px solid var(--border-color);color:var(--text-color);font-family:inherit"
        >
          取消
        </button>
        <button
          type="button"
          :disabled="loading"
          @click="handleLogin"
          class="py-2 px-[18px] text-sm font-medium rounded-lg cursor-pointer border-none text-white transition-opacity duration-150"
          style="background-color:var(--link-color);font-family:inherit"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </div>
    </div>
  </div>
</template>
