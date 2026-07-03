import * as repo from '../../repositories/inventory/supplierRepository'
import {
  appendSupplierLedgerEntry,
  removeSupplierLedgerEntry,
  replaceSupplierLedgerEntry,
} from '../ledgerService'
import { allocateDocumentNumber, previewDocumentNumber } from '../sequenceService'
import { prisma } from '../../prisma'
import { AppError } from '../../utils/errors'
import { calculatePurchaseGrandTotal } from './purchaseAccounting'

function toNumber(value: unknown) {
  return Number(value ?? 0)
}

function sortLedgerEntriesAscending<T extends { entryDate?: Date | string | null; createdAt?: Date | string | null }>(entries: T[] = []) {
  return [...entries].sort((a, b) => {
    const dateDiff = new Date(a.entryDate || 0).getTime() - new Date(b.entryDate || 0).getTime()
    if (dateDiff !== 0) return dateDiff
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  })
}

function buildSupplierLedgerEntries(supplier: any) {
  const purchases = Array.isArray(supplier?.purchases) ? supplier.purchases : []
  const payments = Array.isArray(supplier?.supplierPayments) ? supplier.supplierPayments : []
  const openingBalance = toNumber(supplier?.openingBalance)
  const entries: Array<any> = []

  if (openingBalance > 0) {
    entries.push({
      id: `${supplier.id}-opening-balance`,
      entryDate: supplier?.createdAt || new Date().toISOString(),
      entryType: 'OPENING_BALANCE',
      referenceType: null,
      referenceId: null,
      documentNumber: supplier?.supplierNumber || null,
      description: 'Opening balance',
      debit: 0,
      credit: openingBalance,
      sourceCreatedAt: supplier?.createdAt || new Date().toISOString(),
    })
  }

  for (const purchase of purchases) {
    const grandTotal = calculatePurchaseGrandTotal(purchase)
    entries.push({
      id: purchase.id,
      entryDate: purchase.invoiceDate || purchase.createdAt || new Date().toISOString(),
      entryType: 'PURCHASE_INVOICE',
      referenceType: 'purchase_invoice',
      referenceId: purchase.id,
      documentNumber: purchase.invoiceNumber || null,
      description: `Purchase invoice ${purchase.invoiceNumber || purchase.id}`,
      debit: 0,
      credit: grandTotal,
      sourceCreatedAt: purchase.createdAt || purchase.invoiceDate || new Date().toISOString(),
    })
  }

  for (const payment of payments) {
    entries.push({
      id: payment.id,
      entryDate: payment.paymentDate || payment.createdAt || new Date().toISOString(),
      entryType: 'PAYMENT_MADE',
      referenceType: 'supplier_payment',
      referenceId: payment.id,
      documentNumber: payment.paymentNumber || null,
      description: `Supplier payment ${payment.paymentNumber || payment.id}`,
      debit: toNumber(payment.amount),
      credit: 0,
      sourceCreatedAt: payment.createdAt || payment.paymentDate || new Date().toISOString(),
    })
  }

  entries.sort((a, b) => {
    const dateDiff = new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    if (dateDiff !== 0) return dateDiff
    return new Date(a.sourceCreatedAt).getTime() - new Date(b.sourceCreatedAt).getTime()
  })

  let runningBalance = openingBalance
  return entries.map((entry) => {
    runningBalance = runningBalance + toNumber(entry.credit) - toNumber(entry.debit)
    return {
      ...entry,
      runningBalance,
    }
  })
}

function buildSupplierSummary(supplier: any) {
  const purchases = Array.isArray(supplier?.purchases) ? supplier.purchases : []
  const supplierPayments = Array.isArray(supplier?.supplierPayments) ? supplier.supplierPayments : []
  const totalPurchases = purchases.reduce((sum: number, purchase: any) => sum + calculatePurchaseGrandTotal(purchase), 0)
  const totalPaid = supplierPayments.reduce((sum: number, payment: any) => sum + toNumber(payment.amount), 0)
  const outstandingPayable = Math.max(totalPurchases - totalPaid, 0)
  const ledgerEntries = Array.isArray(supplier?.ledgerEntries) && supplier.ledgerEntries.length > 0
    ? sortLedgerEntriesAscending(supplier.ledgerEntries)
    : buildSupplierLedgerEntries(supplier)
  return {
    currentBalance: ledgerEntries.length > 0 ? toNumber(ledgerEntries[ledgerEntries.length - 1]?.runningBalance) : outstandingPayable,
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
  return rows.map((supplier: any) => ({ ...supplier, ledgerEntries: sortLedgerEntriesAscending(supplier.ledgerEntries || []), summary: buildSupplierSummary(supplier) }))
}
// Fetches one supplier
export const getSupplier = async (id: string) => {
  const supplier = await repo.getSupplier(id)
  return supplier ? { ...supplier, ledgerEntries: sortLedgerEntriesAscending(supplier.ledgerEntries || []), summary: buildSupplierSummary(supplier) } : null
}

export const getSupplierLedger = async (id: string) => {
  const supplier = await getSupplier(id)
  return supplier?.ledgerEntries || []
}

export const listSupplierPayments = async (id: string) => {
  const supplier = await getSupplier(id)
  return supplier?.supplierPayments || []
}

export const getSupplierPayment = async (supplierId: string, paymentId: string) => {
  return prisma.supplierPayment.findFirst({
    where: { id: paymentId, supplierId },
  })
}
// Updates a supplier
export const updateSupplier = async (id: string, data: any) => repo.updateSupplier(id, data)
export const softDeleteSupplier = async (id: string) => {
  const [purchaseCount, paymentCount] = await Promise.all([
    prisma.purchase.count({ where: { supplierId: id } }),
    prisma.supplierPayment.count({ where: { supplierId: id } }),
  ])

  const references: Array<{ label: string; count: number }> = []
  if (purchaseCount > 0) references.push({ label: 'purchase invoice', count: purchaseCount })
  if (paymentCount > 0) references.push({ label: 'supplier payment', count: paymentCount })

  if (references.length > 0) {
    const summary = references.map((ref) => `${ref.count} ${ref.label}${ref.count === 1 ? '' : 's'}`).join(' and ')
    throw new AppError(409, 'DELETE_BLOCKED', `Cannot delete supplier because it is referenced by ${summary}.`, {
      references,
    })
  }

  return repo.softDeleteSupplier(id)
}

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

export const updateSupplierPayment = async (
  supplierId: string,
  paymentId: string,
  payload: any,
  userId?: number,
) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.supplierPayment.findFirst({ where: { id: paymentId, supplierId } })
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Supplier payment not found')
    }

    const updated = await tx.supplierPayment.update({
      where: { id: paymentId },
      data: {
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : existing.paymentDate,
        note: payload.note === undefined ? existing.note : payload.note || null,
        createdBy: userId ?? existing.createdBy ?? null,
      },
    })
    await replaceSupplierLedgerEntry({
      tx,
      supplierId,
      entryType: 'PAYMENT_MADE',
      entryDate: updated.paymentDate,
      referenceType: 'supplier_payment',
      referenceId: updated.id,
      documentNumber: updated.paymentNumber,
      description: `Supplier payment ${updated.paymentNumber || updated.id}`,
      debit: updated.amount,
      credit: 0,
      createdBy: userId ?? updated.createdBy ?? null,
    })
    return updated
  })
}

export const deleteSupplierPayment = async (supplierId: string, paymentId: string) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.supplierPayment.findFirst({ where: { id: paymentId, supplierId } })
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Supplier payment not found')
    }
    await tx.supplierPayment.delete({ where: { id: paymentId } })
    await removeSupplierLedgerEntry({
      tx,
      supplierId,
      referenceType: 'supplier_payment',
      referenceId: paymentId,
    })
    return existing
  })
}
