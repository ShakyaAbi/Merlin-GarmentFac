import { request } from './apiClient'

export type SalesOrderStatus = 'DRAFT' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED'

export type SalesOrderCustomer = {
  id: string
  customerName: string
  phone?: string | null
  email?: string | null
  customerType?: string | null
}

export type SalesOrderMaterialRequirement = {
  materialId?: string | null
  materialName: string
  sku?: string | null
  unit?: string | null
  quantityPerUnit: number
}

export type SalesOrderProduct = {
  id: string
  name: string
  productCode?: string | null
  sku?: string | null
  unit?: string | null
  sellingPrice?: number | string | null
  currentStock?: number | null
  bomItemCount?: number | null
  materialRequirements?: SalesOrderMaterialRequirement[]
}

export type SalesOrderItem = {
  id?: string
  productId: string
  productCode?: string | null
  productName: string
  quantity: number
  unitPrice: number | string
  discountAmount?: number | string | null
  taxAmount?: number | string | null
  lineTotal?: number | string | null
  product?: SalesOrderProduct
}

export type SalesOrder = {
  id: string
  orderNumber?: string | null
  status: SalesOrderStatus
  orderDate?: string | null
  requiredBy?: string | null
  notes?: string | null
  subtotal?: number | string | null
  discountAmount?: number | string | null
  taxAmount?: number | string | null
  grandTotal?: number | string | null
  customerId: string
  customer?: SalesOrderCustomer | null
  items?: SalesOrderItem[]
  invoices?: Array<{ id: string; invoiceNumber?: string | null; invoiceStatus?: string | null }>
}

export type SalesOrderPayload = {
  customerId: string
  orderDate: string
  requiredBy?: string
  notes?: string
  items: Array<{
    productId: string
    quantity: number
    unitPrice?: number
    discountAmount?: number
    taxAmount?: number
  }>
}

export const salesOrderApi = {
  list: (params?: { search?: string; status?: string; customerId?: string }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.status && params.status !== 'ALL') q.set('status', params.status)
    if (params?.customerId) q.set('customerId', params.customerId)
    const query = q.toString()
    return request<SalesOrder[]>(`/sales-orders${query ? `?${query}` : ''}`)
  },
  get: (id: string) => request<SalesOrder>(`/sales-orders/${id}`),
  create: (body: SalesOrderPayload) => request<SalesOrder>('/sales-orders', { method: 'POST', body }),
  update: (id: string, body: Partial<SalesOrderPayload>) => request<SalesOrder>(`/sales-orders/${id}`, { method: 'PATCH', body }),
  confirm: (id: string) => request<SalesOrder>(`/sales-orders/${id}/confirm`, { method: 'POST' }),
  fulfill: (id: string) => request<SalesOrder>(`/sales-orders/${id}/fulfill`, { method: 'POST' }),
  cancel: (id: string, reason?: string) => request<SalesOrder>(`/sales-orders/${id}/cancel`, { method: 'POST', body: { reason } }),
  invoice: (id: string) => request(`/sales-orders/${id}/invoice`, { method: 'POST' }),
  listCustomers: () => request<SalesOrderCustomer[]>('/customers'),
  listProducts: () => request<SalesOrderProduct[]>('/sales-orders/products'),
}
