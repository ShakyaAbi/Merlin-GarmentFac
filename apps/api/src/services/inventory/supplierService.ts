import * as repo from '../../repositories/inventory/supplierRepository'
import { appendSupplierLedgerEntry } from '../ledgerService'
import { allocateDocumentNumber, previewDocumentNumber } from '../sequenceService'
import { prisma } from '../../prisma'

function toNumber(value: unknown) {
  return Number(value ?? 0)
}

function buildSupplierSummary(supplier: any) {
  const purchases = Array.isArray(supplier?.purchases) ? supplier.purchases : []
  const supplierPayments = Array.isArray(supplier?.supplierPayments) ? supplier.supplierPayments : []
  const ledgerEntries = Array.isArray(supplier?.ledgerEntries) ? supplier.ledgerEntries : []
  const totalPurchases = purchases.reduce((sum: number, purchase: any) => sum + toNumber(purchase.totalAmount), 0)
  const totalPaid = supplierPayments.reduce((sum: number, payment: any) => sum + toNumber(payment.amount), 0)
  const outstandingPayable = ledgerEntries.length > 0 ? toNumber(ledgerEntries[0]?.runningBalance) : Math.max(totalPurchases - totalPaid, 0)
  return {
    currentBalance: outstandingPayable,
    totalPurchases,
    totalPaid,
    outstandingPayable,
    lastPurchaseDate: purchases[0]?.invoiceDate || null,
    lastPaymentDate: supplierPayments[0]?.paymentDate || null,
  }
}

// Creates a supplier
export const createSupplier = async (payload: any) => {
  const supplierNumber = await allocateDocumentNumber('supplier')
  return prisma.$transaction(async (tx) => {
    const created = await tx.supplier.create({ data: { ...payload, supplierNumber } })
    const openingBalance = Number(payload.openingBalance ?? 0)
    if (openingBalance > 0) {
      await appendSupplierLedgerEntry({
        tx,
        supplierId: created.id,
        entryType: 'OPENING_BALANCE',
        debit: 0,
        credit: openingBalance,
        description: 'Opening balance',
        documentNumber: supplierNumber,
        createdBy: payload.createdBy ?? null,
      })
    }
    return created
  })
}

// Lists suppliers
export const listSuppliers = async (opts: any) => {
  const rows = await repo.listSuppliers(opts)
  return rows.map((supplier: any) => ({ ...supplier, summary: buildSupplierSummary(supplier) }))
}
// Fetches one supplier
export const getSupplier = async (id: string) => {
  const supplier = await repo.getSupplier(id)
  return supplier ? { ...supplier, summary: buildSupplierSummary(supplier) } : null
}

export const getSupplierLedger = async (id: string) => {
  const supplier = await getSupplier(id)
  return supplier?.ledgerEntries || []
}

export const listSupplierPayments = async (id: string) => {
  const supplier = await getSupplier(id)
  return supplier?.supplierPayments || []
}
// Updates a supplier
export const updateSupplier = async (id: string, data: any) => repo.updateSupplier(id, data)
// Soft-deletes a supplier
export const softDeleteSupplier = async (id: string) => repo.softDeleteSupplier(id)

export const recordSupplierPayment = async (supplierId: string, payload: any, userId?: number) => {
  return prisma.$transaction(async (tx) => {
    const paymentNumber = await allocateDocumentNumber('payment', { fiscalYear: payload.fiscalYear || undefined, tx })
    const paymentDate = payload.paymentDate ? new Date(payload.paymentDate) : new Date()
    const created = await tx.supplierPayment.create({
      data: {
        supplierId,
        paymentNumber,
        paymentDate,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        note: payload.note || null,
        createdBy: userId ?? null,
      },
    })
    await appendSupplierLedgerEntry({
      tx,
      supplierId,
      entryType: 'PAYMENT_MADE',
      entryDate: paymentDate,
      referenceType: 'supplier_payment',
      referenceId: created.id,
      documentNumber: paymentNumber,
      description: `Supplier payment ${paymentNumber}`,
      debit: payload.amount,
      credit: 0,
      createdBy: userId ?? null,
    })
    return created
  })
}

export async function previewNextSupplierNumber() {
  return previewDocumentNumber('supplier')
}
