export type Category = string

export interface CategoryOption {
  key: string
  label: string
}

export const DEFAULT_CATEGORIES: CategoryOption[] = [
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
  icon_url: string | null
  created_at: string
  updated_at: string
}

export interface Submission {
  id: number
  name: string
  url: string
  note: string
  category: string
  icon_url: string | null
  submitter_ip: string
  created_at: string
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

export interface IconInfo {
  key: string
  url: string
  size: number
  uploaded: string
}
