import { request } from './apiClient'

export type LedgerEntry = {
  id: string
  entryDate?: string | null
  entryType: string
  referenceType?: string | null
  referenceId?: string | null
  documentNumber?: string | null
  description?: string | null
  debit?: number | string | null
  credit?: number | string | null
  runningBalance?: number | string | null
}

export type CustomerLedgerSummary = {
  currentBalance: number
  totalInvoiced: number
  totalPaid: number
  outstandingAmount: number
  lastInvoiceDate?: string | null
  lastPaymentDate?: string | null
}

export type SupplierLedgerSummary = {
  currentBalance: number
  totalPurchases: number
  totalPaid: number
  outstandingPayable: number
  lastPurchaseDate?: string | null
  lastPaymentDate?: string | null
}

export type SupplierPayment = {
  id: string
  paymentNumber?: string | null
  paymentDate?: string | null
  amount: number | string
  paymentMethod: string
  bankAccountId?: string | null
  bankAccount?: { id: string; bankName: string; accountName: string; accountNumber: string; branchName: string; branchCode?: string | null } | null
  note?: string | null
}

export const partyLedgerApi = {
  getCustomerLedger: (id: string) =>
    request<{ entries: LedgerEntry[]; summary: CustomerLedgerSummary; customerId: string; customerNumber?: string | null }>(`/customers/${id}/ledger`),
  getSupplierLedger: (id: string) =>
    request<{ entries: LedgerEntry[]; summary: SupplierLedgerSummary; supplierId: string; supplierNumber?: string | null }>(`/inventory/suppliers/${id}/ledger`),
  getSupplierPayments: (id: string) =>
    request<{ payments: SupplierPayment[]; summary: SupplierLedgerSummary; supplierId: string; supplierNumber?: string | null }>(`/inventory/suppliers/${id}/payments`),
  getSupplierPayment: (supplierId: string, paymentId: string) =>
    request<SupplierPayment>(`/inventory/suppliers/${supplierId}/payments/${paymentId}`),
  createSupplierPayment: (id: string, body: { amount: number; paymentMethod: string; paymentDate?: string; note?: string; bankAccountId?: string }) =>
    request<SupplierPayment>(`/inventory/suppliers/${id}/payments`, { method: 'POST', body }),
  updateSupplierPayment: (supplierId: string, paymentId: string, body: { amount?: number; paymentMethod?: string; paymentDate?: string; note?: string; bankAccountId?: string }) =>
    request<SupplierPayment>(`/inventory/suppliers/${supplierId}/payments/${paymentId}`, { method: 'PATCH', body }),
  deleteSupplierPayment: (supplierId: string, paymentId: string) =>
    request<void>(`/inventory/suppliers/${supplierId}/payments/${paymentId}`, { method: 'DELETE' }),
}
