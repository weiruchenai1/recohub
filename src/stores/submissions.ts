import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'
import type { Submission } from '@/types'

export const useSubmissionsStore = defineStore('submissions', () => {
  const pendingCount = ref(0)
  const submissions = ref<Submission[]>([])
  const loading = ref(false)

  async function fetchPendingCount() {
    try {
      const res = await api.get<{ count: number }>('/submissions/count')
      pendingCount.value = res.count
    } catch {
      // silently fail — user may not be logged in
    }
  }

  async function fetchSubmissions() {
    loading.value = true
    try {
      const res = await api.get<Submission[]>('/submissions')
      submissions.value = res
    } catch {
      submissions.value = []
    } finally {
      loading.value = false
    }
  }

  async function approve(id: number, data?: { name?: string; url?: string; note?: string; category?: string; icon_url?: string | null }) {
    await api.post(`/submissions/${id}/approve`, data || {})
    submissions.value = submissions.value.filter(s => s.id !== id)
    pendingCount.value = Math.max(0, pendingCount.value - 1)
  }

  async function reject(id: number) {
    await api.delete(`/submissions/${id}`)
    submissions.value = submissions.value.filter(s => s.id !== id)
    pendingCount.value = Math.max(0, pendingCount.value - 1)
  }

  async function submitWebsite(data: { name: string; url: string; note: string; category: string; icon_url?: string | null; _hp: string }) {
    await api.post('/submissions', data)
  }

  return {
    pendingCount, submissions, loading,
    fetchPendingCount, fetchSubmissions, approve, reject, submitWebsite,
  }
})
