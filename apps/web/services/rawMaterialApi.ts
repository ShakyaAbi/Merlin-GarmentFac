import { request } from './apiClient'

export interface RawMaterialPayload {
  name: string
  sku?: string
  defaultUnit: string
  categoryId?: string
  description?: string
  reorderLevel?: number
  costPrice?: number
  averageUnitCost?: number
  active?: boolean
  notes?: string
}

export interface StockAdjustPayload {
  change: number
  unit: string
  reason: string
  transactionType?: string
  unitCost?: number
}

export interface CategoryPayload {
  categoryName: string
  description?: string
}

export const rawMaterialApi = {
  list: (params?: { search?: string; categoryId?: string; active?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.categoryId) q.set('categoryId', params.categoryId)
    if (params?.active) q.set('active', params.active)
    if (params?.page) q.set('page', String(params.page))
    if (params?.pageSize) q.set('pageSize', String(params.pageSize))
    return request<any>(`/inventory/materials?${q.toString()}`)
  },

  get: (id: string) => request<any>(`/inventory/materials/${id}`),

  create: (data: RawMaterialPayload) =>
    request<any>('/inventory/materials', { method: 'POST', body: data }),

  update: (id: string, data: Partial<RawMaterialPayload>) =>
    request<any>(`/inventory/materials/${id}`, { method: 'PUT', body: data }),

  toggleStatus: (id: string, active: boolean) =>
    request<any>(`/inventory/materials/${id}/status`, { method: 'PATCH', body: { active } }),

  delete: (id: string) =>
    request<void>(`/inventory/materials/${id}`, { method: 'DELETE' }),

  adjustStock: (id: string, data: StockAdjustPayload) =>
    request<any>(`/inventory/materials/${id}/adjust-stock`, { method: 'POST', body: data }),

  getTransactions: (id: string, params?: { page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.pageSize) q.set('pageSize', String(params.pageSize))
    return request<any[]>(`/inventory/materials/${id}/transactions?${q.toString()}`)
  },

  getCategories: () => request<any[]>('/inventory/material-categories'),

  createCategory: (data: CategoryPayload) =>
    request<any>('/inventory/material-categories', { method: 'POST', body: data }),

  getPurchases: (id: string) =>
    request<any[]>(`/inventory/materials/${id}/purchases`),
}