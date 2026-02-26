<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <div
    class="fixed inset-0 z-[2000] flex items-center justify-center transition-opacity duration-[250ms] bg-overlay"
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
          class="modal-btn-cancel"
        >
          取消
        </button>
        <button
          type="button"
          @click="ui.resolveConfirm()"
          class="modal-btn-danger"
        >
          删除
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
.modal-btn-danger {
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  color: #f85149;
  background-color: rgba(248, 81, 73, 0.1);
  transition: background-color 0.15s;
}
.modal-btn-danger:hover {
  background-color: rgba(248, 81, 73, 0.2);
}
</style>
