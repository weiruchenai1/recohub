export type Category = 'software' | 'website'

export const CATEGORY_OPTIONS: { key: Category; label: string }[] = [
  { key: 'software', label: '软件推荐' },
  { key: 'website', label: '网站推荐' },
]

export interface Item {
  id: number
  category: Category
  name: string
  url: string
  note: string
  sort_order: number
  created_at: string
  updated_at: string
}

export type ModalMode = 'add' | 'edit'

export type ViewLayout = 'list' | 'grid'

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
}

export interface LoginResponse {
  token: string
}

export interface ApiError {
  error: string
}
