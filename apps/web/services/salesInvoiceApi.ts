import { getToken, request } from './apiClient'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'

export const salesInvoiceApi = {
  list: () => request('/sales-invoices'),
  get: (id: string) => request(`/sales-invoices/${id}`),
  listCustomers: (search?: string) => request(`/sales-invoices/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  listProducts: (search?: string) => request(`/sales-invoices/products${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  export: async (params?: { search?: string; status?: string; paymentStatus?: string }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.status && params.status !== 'ALL') q.set('invoiceStatus', params.status)
    if (params?.paymentStatus && params.paymentStatus !== 'ALL') q.set('paymentStatus', params.paymentStatus)
    const token = getToken()
    const response = await fetch(`${API_BASE}/sales-invoices/export${q.toString() ? `?${q.toString()}` : ''}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.error?.message || 'Export failed')
    }

    return response.blob()
  },
  downloadCsv: async (id: string) => {
    const token = getToken()
    const response = await fetch(`${API_BASE}/sales-invoices/${id}/export`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.error?.message || 'Download failed')
    }

    return response.blob()
  },
  downloadPdf: async (id: string) => {
    const token = getToken()
    const response = await fetch(`${API_BASE}/sales-invoices/${id}/export`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.error?.message || 'Download failed')
    }

    return response.blob()
  },
  create: (body: any) => request('/sales-invoices', { method: 'POST', body }),
  update: (id: string, body: any) => request(`/sales-invoices/${id}`, { method: 'PATCH', body }),
  submit: (id: string) => request(`/sales-invoices/${id}/submit`, { method: 'POST' }),
  issue: (id: string) => request(`/sales-invoices/${id}/issue`, { method: 'POST' }),
  payment: (id: string, body: any) => request(`/sales-invoices/${id}/payment`, { method: 'POST', body }),
  cancel: (id: string, body: any) => request(`/sales-invoices/${id}/cancel`, { method: 'POST', body }),
}
