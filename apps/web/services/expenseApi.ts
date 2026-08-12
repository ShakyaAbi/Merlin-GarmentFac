import { request } from './apiClient'

export type ExpenseStatus = 'APPROVED' | 'PAID' | 'VOID'

export type Expense = {
  id: string
  expenseNumber?: string | null
  expenseDate?: string | null
  category: string
  vendor?: string | null
  description: string
  amount: number | string
  currency?: string | null
  status: ExpenseStatus
  paymentDate?: string | null
  notes?: string | null
}

export const expenseApi = {
  list: (params?: { search?: string; status?: string; category?: string }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.status && params.status !== 'ALL') q.set('status', params.status)
    if (params?.category) q.set('category', params.category)
    const query = q.toString()
    return request<Expense[]>(`/expenses${query ? `?${query}` : ''}`)
  },
  get: (id: string) => request<Expense>(`/expenses/${id}`),
  create: (body: Partial<Expense>) => request<Expense>('/expenses', { method: 'POST', body }),
  update: (id: string, body: Partial<Expense>) => request<Expense>(`/expenses/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => request<Expense>(`/expenses/${id}`, { method: 'DELETE' }),
}
