import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api'
import type { Item, PaginatedResponse, ModalMode } from '@/types'

export const useItemsStore = defineStore('items', () => {
  const items = ref<Item[]>([])
  const total = ref(0)
  const loading = ref(false)
  const selectedIds = ref<Set<number>>(new Set())

  const editingItem = ref<Item | null>(null)
  const modalMode = ref<ModalMode>('add')

  const selectedCount = computed(() => selectedIds.value.size)
  const allSelected = computed(() =>
    items.value.length > 0 && items.value.every(i => selectedIds.value.has(i.id))
  )

  async function fetchItems(params: {
    category: string
    page: number
    perPage: number
    q?: string
  }) {
    loading.value = true
    try {
      const query = new URLSearchParams({
        category: params.category,
        page: String(params.page),
        perPage: String(params.perPage),
      })
      if (params.q) query.set('q', params.q)

      const res = await api.get<PaginatedResponse<Item>>(`/items?${query}`)
      items.value = res.data
      total.value = res.total
    } finally {
      loading.value = false
    }
  }

  async function createItem(data: Partial<Item>) {
    const item = await api.post<Item>('/items', data)
    return item
  }

  async function updateItem(id: number, data: Partial<Item>) {
    const item = await api.put<Item>(`/items/${id}`, data)
    return item
  }

  async function deleteItem(id: number) {
    await api.delete(`/items/${id}`)
  }

  async function batchDelete(ids: number[]) {
    await api.post('/items/batch', { action: 'delete', ids })
  }

  async function batchMove(ids: number[], targetCategory: string) {
    await api.post('/items/batch', { action: 'move', ids, targetCategory })
  }

  function toggleSelect(id: number) {
    const s = new Set(selectedIds.value)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    selectedIds.value = s
  }

  function toggleSelectAll() {
    if (allSelected.value) {
      selectedIds.value = new Set()
    } else {
      selectedIds.value = new Set(items.value.map(i => i.id))
    }
  }

  function clearSelection() {
    selectedIds.value = new Set()
  }

  function startEdit(item: Item) {
    editingItem.value = { ...item }
    modalMode.value = 'edit'
  }

  function startAdd() {
    editingItem.value = null
    modalMode.value = 'add'
  }

  return {
    items, total, loading, selectedIds, editingItem, modalMode,
    selectedCount, allSelected,
    fetchItems, createItem, updateItem, deleteItem,
    batchDelete, batchMove,
    toggleSelect, toggleSelectAll, clearSelection,
    startEdit, startAdd,
  }
})
