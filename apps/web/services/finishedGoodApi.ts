import { request, getToken } from './apiClient'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'

export const finishedGoodApi = {
  list: (params?: { search?: string; articleCategoryId?: string; active?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.articleCategoryId) q.set('articleCategoryId', params.articleCategoryId)
    if (params?.active) q.set('active', params.active)
    if (params?.page) q.set('page', String(params.page))
    if (params?.pageSize) q.set('pageSize', String(params.pageSize))
    return request<any>(`/inventory/finished-goods?${q.toString()}`)
  },

  get: (id: string) => request<any>(`/inventory/finished-goods/${id}`),

  exportCSV: async (filters?: Record<string, any>): Promise<Blob> => {
    const token = getToken()
    const response = await fetch(`${API_BASE}/inventory/finished-goods/export`, {
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
    const response = await fetch(`${API_BASE}/inventory/finished-goods/import-template-sample`, {
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

    const response = await fetch(`${API_BASE}/inventory/finished-goods/import`, {
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
