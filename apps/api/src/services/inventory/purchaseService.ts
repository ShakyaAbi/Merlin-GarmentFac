import * as repo from '../../repositories/inventory/purchaseRepository'
import { AppError } from '../../utils/errors'
import { requireActiveOrganizationBankAccount } from '../organizationBankAccountService'

// Creates a purchase transaction
export const createPurchase = async (purchaseData: any, items: any[], userId?: number) => {
  return repo.createPurchaseTransactional(purchaseData, items, userId)
}

export const getPurchase = async (id: string) => {
  return repo.getPurchaseById(id)
}

export const listPurchases = (limit?: number) => repo.listPurchases(limit)

function toDate(value?: string | null) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function requireBankAccountForMethod(payload: any) {
  const method = String(payload.paymentMethod || '').toLowerCase()
  if (/bank|cheque|mobile/.test(method) && !payload.bankAccountId) throw new AppError(400, 'BANK_ACCOUNT_REQUIRED', 'Select the organization bank account used for this payment')
}

export const listPurchasePayments = (id: string) => repo.listPurchasePayments(id)

export async function recordPurchasePayment(id: string, payload: any, userId?: number, organizationId?: number) {
  requireBankAccountForMethod(payload)
  if (payload.bankAccountId && organizationId) await requireActiveOrganizationBankAccount(payload.bankAccountId, organizationId)
  return repo.recordPurchasePayment(id, { ...payload, paymentDate: toDate(payload.paymentDate) }, userId)
}

export async function updatePurchasePayment(id: string, paymentId: string, payload: any, userId?: number, organizationId?: number) {
  requireBankAccountForMethod(payload)
  if (payload.bankAccountId && organizationId) await requireActiveOrganizationBankAccount(payload.bankAccountId, organizationId)
  return repo.updatePurchasePayment(id, paymentId, { ...payload, paymentDate: toDate(payload.paymentDate) }, userId)
}

export const deletePurchasePayment = (id: string, paymentId: string) => repo.deletePurchasePayment(id, paymentId)
export const cancelPurchase = (id: string, reason: string, userId?: number) => repo.cancelPurchase(id, reason, userId)
