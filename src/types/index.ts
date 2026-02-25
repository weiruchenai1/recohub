export type Category = 'software' | 'website'

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
