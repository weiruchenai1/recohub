<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <div
    class="fixed inset-0 z-[3000] flex items-center justify-center transition-opacity duration-[250ms] bg-overlay"
    @click.self="ui.cancelConfirm()"
  >
    <div class="w-[420px] max-w-[92vw] rounded-2xl p-7 border-none bg-row">
      <h3 class="m-0 mb-5 text-[17px] font-semibold text-text">
        {{ ui.confirmTitle }}
      </h3>

      <p class="m-0 text-sm text-note leading-relaxed">
        {{ ui.confirmMessage }}
      </p>

      <div class="flex justify-end gap-2 mt-[22px]">
        <button
          type="button"
          @click="ui.cancelConfirm()"
          class="px-[18px] py-2 text-sm font-medium rounded-lg cursor-pointer bg-transparent border border-border text-text transition-colors"
        >
          取消
        </button>
        <button
          type="button"
          @click="ui.resolveConfirm()"
          :class="ui.confirmVariant === 'primary'
            ? 'px-[18px] py-2 text-sm font-medium rounded-lg cursor-pointer border-none text-white bg-primary transition-opacity hover:opacity-85'
            : 'px-[18px] py-2 text-sm font-medium rounded-lg cursor-pointer border-none text-danger bg-red-500/10 transition-colors hover:bg-red-500/20'"
        >
          {{ ui.confirmButtonText }}
        </button>
      </div>
    </div>
  </div>
</template>
