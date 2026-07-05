import { getToken, request } from './apiClient'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'

export type SalesPaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID'
export type SalesInvoiceStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ISSUED' | 'CANCELLED'

export type SalesInvoicePayment = {
  id: string
  amount: number | string
  paymentDate?: string | null
  createdAt?: string | null
  paidAt?: string | null
  paymentMethod?: string | null
  method?: string | null
  note?: string | null
  notes?: string | null
  chequeNumber?: string | null
  chequeDate?: string | null
  bankName?: string | null
}

export type SalesInvoiceItem = {
  id: string
  productId: string
  productCode?: string | null
  productName: string
  quantity: number | string
  unitPrice: number | string
  discountAmount?: number | string | null
  taxAmount?: number | string | null
  lineTotal?: number | string | null
  warehouseId?: string | null
}

export type SalesInvoiceCustomer = {
  id: string
  customerName: string
  phone?: string | null
  email?: string | null
  address?: string | null
  panVatNumber?: string | null
  customerType?: string | null
  notes?: string | null
}

export type SalesInvoiceProduct = {
  id: string
  sku?: string | null
  productCode?: string | null
  name: string
  description?: string | null
  category?: string | null
  unit?: string | null
  sellingPrice?: number | null
  costPrice?: number | null
  active?: boolean
  notes?: string | null
}

export type SalesInvoice = {
  id: string
  invoiceNumber?: string | null
  fiscalYear?: string | null
  customerId: string
  customer?: SalesInvoiceCustomer | null
  customerName?: string | null
  salesOrderId?: string | null
  invoiceDate?: string | null
  dueDate?: string | null
  subtotal?: number | string | null
  discountAmount?: number | string | null
  taxableAmount?: number | string | null
  nonTaxableAmount?: number | string | null
  taxAmount?: number | string | null
  grandTotal?: number | string | null
  paidAmount?: number | string | null
  dueAmount?: number | string | null
  paymentStatus?: SalesPaymentStatus | string | null
  invoiceStatus?: SalesInvoiceStatus | string | null
  printedCount?: number | null
  remarks?: string | null
  cancellationReason?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  issuedAt?: string | null
  cancelledAt?: string | null
  items?: SalesInvoiceItem[]
  payments?: SalesInvoicePayment[]
}

export type SalesInvoicePayload = {
  invoiceNumber?: string
  fiscalYear?: string
  customerId: string
  salesOrderId?: string
  invoiceDate?: string
  dueDate?: string
  discountAmount?: number
  taxAmount?: number
  remarks?: string
  items: Array<{
    productId?: string
    productCode?: string
    productName: string
    quantity: number
    unitPrice: number
    discountAmount: number
    taxAmount: number
    lineTotal: number
    warehouseId?: string
  }>
  invoiceStatus?: SalesInvoiceStatus
  paymentStatus?: SalesPaymentStatus
}

export const salesInvoiceApi = {
  list: async (params?: { search?: string; customerId?: string; status?: string; paymentStatus?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.customerId) q.set('customerId', params.customerId)
    if (params?.status && params.status !== 'ALL') q.set('invoiceStatus', params.status)
    if (params?.paymentStatus && params.paymentStatus !== 'ALL') q.set('paymentStatus', params.paymentStatus)
    if (params?.page) q.set('page', String(params.page))
    if (params?.pageSize) q.set('pageSize', String(params.pageSize))

    const response = await request<{ items?: SalesInvoice[] } | SalesInvoice[]>(`/sales-invoices${q.toString() ? `?${q.toString()}` : ''}`)
    return Array.isArray(response) ? response : Array.isArray(response?.items) ? response.items : []
  },
  get: (id: string) => request(`/sales-invoices/${id}`),
  listCustomers: (search?: string) => request(`/sales-invoices/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  listProducts: (search?: string) => request(`/sales-invoices/products${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  previewNextInvoiceNumber: async (invoiceDate: string) => {
    const q = new URLSearchParams()
    if (invoiceDate) q.set('invoiceDate', invoiceDate)
    const response = await request<{ invoiceNumber?: string }>(`/sales-invoices/next-number${q.toString() ? `?${q.toString()}` : ''}`)
    return response?.invoiceNumber || ''
  },
  export: async (params?: { search?: string; status?: string; paymentStatus?: string }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.status && params.status !== 'ALL') q.set('invoiceStatus', params.status)
    if (params?.paymentStatus && params.paymentStatus !== 'ALL') q.set('paymentStatus', params.paymentStatus)
    const token = getToken()
    let response: Response
    try {
      response = await fetch(`${API_BASE}/sales-invoices/export${q.toString() ? `?${q.toString()}` : ''}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (error) {
      throw new Error(`Unable to reach the API server at ${API_BASE}. Make sure the backend is running.`)
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.error?.message || 'Export failed')
    }

    return response.blob()
  },
  downloadCsv: async (id: string) => {
    const token = getToken()
    let response: Response
    try {
      response = await fetch(`${API_BASE}/sales-invoices/${id}/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (error) {
      throw new Error(`Unable to reach the API server at ${API_BASE}. Make sure the backend is running.`)
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.error?.message || 'Download failed')
    }

    return response.blob()
  },
  downloadPdf: async (id: string) => {
    const token = getToken()
    let response: Response
    try {
      response = await fetch(`${API_BASE}/sales-invoices/${id}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (error) {
      throw new Error(`Unable to reach the API server at ${API_BASE}. Make sure the backend is running.`)
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.error?.message || 'PDF download failed')
    }

    return response.blob()
  },
  create: (body: any) => request('/sales-invoices', { method: 'POST', body }),
  update: (id: string, body: any) => request(`/sales-invoices/${id}`, { method: 'PATCH', body }),
  submit: (id: string) => request(`/sales-invoices/${id}/submit`, { method: 'POST' }),
  issue: (id: string) => request(`/sales-invoices/${id}/issue`, { method: 'POST' }),
  payment: (id: string, body: any) => request(`/sales-invoices/${id}/payment`, { method: 'POST', body }),
  listPayments: (id: string) => request<{ payments?: SalesInvoicePayment[] }>(`/sales-invoices/${id}/payments`),
  updatePayment: (invoiceId: string, paymentId: string, body: any) =>
    request(`/sales-invoices/${invoiceId}/payments/${paymentId}`, { method: 'PATCH', body }),
  deletePayment: (invoiceId: string, paymentId: string) =>
    request<void>(`/sales-invoices/${invoiceId}/payments/${paymentId}`, { method: 'DELETE' }),
  cancel: (id: string, body: any) => request(`/sales-invoices/${id}/cancel`, { method: 'POST', body }),
}
