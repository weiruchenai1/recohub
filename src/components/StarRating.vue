<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  itemId: number
}>()

const auth = useAuthStore()

const avg = ref(0)
const count = ref(0)
const userScore = ref<number | null>(null)
const hoverScore = ref(0)
const loading = ref(false)

async function fetchRating() {
  try {
    const headers: Record<string, string> = {}
    if (auth.visitorToken) {
      headers['Authorization'] = `Bearer ${auth.visitorToken}`
    }
    const res = await fetch(`/api/items/${props.itemId}/rating`, { headers })
    if (res.ok) {
      const data = await res.json()
      avg.value = data.avg
      count.value = data.count
      userScore.value = data.userScore
    }
  } catch {
    // ignore
  }
}

async function submitRating(score: number) {
  if (!auth.isVisitorLoggedIn || loading.value) return
  loading.value = true
  try {
    const res = await fetch(`/api/items/${props.itemId}/rating`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.visitorToken}`,
      },
      body: JSON.stringify({ score }),
    })
    if (res.ok) {
      const data = await res.json()
      avg.value = data.avg
      count.value = data.count
      userScore.value = data.userScore
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

onMounted(fetchRating)
watch(() => auth.visitorToken, fetchRating)
</script>

<template>
  <div class="inline-flex items-center gap-1">
    <div class="flex items-center">
      <button
        v-for="star in 5"
        :key="star"
        type="button"
        class="p-0 border-none bg-transparent cursor-pointer leading-none transition-transform duration-100"
        :class="{
          'cursor-pointer hover:scale-110': auth.isVisitorLoggedIn,
          'cursor-default': !auth.isVisitorLoggedIn,
        }"
        :title="auth.isVisitorLoggedIn ? `评 ${star} 分` : '登录后可评分'"
        @click="submitRating(star)"
        @mouseenter="auth.isVisitorLoggedIn && (hoverScore = star)"
        @mouseleave="hoverScore = 0"
      >
        <svg
          class="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          :fill="(hoverScore ? star <= hoverScore : (userScore ? star <= userScore : star <= Math.round(avg))) ? 'currentColor' : 'none'"
          stroke="currentColor"
          stroke-width="2"
          :class="{
            'text-amber-400': hoverScore ? star <= hoverScore : (userScore ? star <= userScore : star <= Math.round(avg)),
            'text-note': !(hoverScore ? star <= hoverScore : (userScore ? star <= userScore : star <= Math.round(avg))),
          }"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </button>
    </div>
    <span v-if="count > 0" class="text-[11px] text-note ml-0.5">
      {{ avg }}
    </span>
    <span v-if="count > 0" class="text-[10px] text-note">
      ({{ count }})
    </span>
  </div>
</template>
