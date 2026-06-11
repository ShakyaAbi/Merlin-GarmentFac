import { request, getToken } from './apiClient'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'

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

  exportCSV: async (filters?: Record<string, any>): Promise<Blob> => {
    const token = getToken()
    const response = await fetch(`${API_BASE}/inventory/materials/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ filters: filters || {} }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.error?.message || 'Export failed')
    }

    return response.blob()
  },

  downloadImportTemplate: async (): Promise<Blob> => {
    const token = getToken()
    const response = await fetch(`${API_BASE}/inventory/materials/import-template-sample`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.error?.message || 'Template download failed')
    }

    return response.blob()
  },

  uploadCSV: async (file: File): Promise<any> => {
    const token = getToken()
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE}/inventory/materials/import`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.error?.message || error?.message || 'Import failed')
    }

    return response.json()
  },
}
