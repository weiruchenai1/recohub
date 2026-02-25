import { onMounted, onBeforeUnmount, type Ref } from 'vue'

export function useClickOutside(
  target: Ref<HTMLElement | null>,
  callback: () => void,
) {
  function handler(e: MouseEvent) {
    if (target.value && !target.value.contains(e.target as Node)) {
      callback()
    }
  }

  onMounted(() => document.addEventListener('click', handler))
  onBeforeUnmount(() => document.removeEventListener('click', handler))
}
