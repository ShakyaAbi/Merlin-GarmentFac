import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'

type CustomerLedgerInput = {
  customerId: string
  entryType: 'OPENING_BALANCE' | 'SALES_INVOICE' | 'PAYMENT_RECEIVED'
  entryDate?: Date
  referenceType?: string | null
  referenceId?: string | null
  documentNumber?: string | null
  description?: string | null
  debit?: number | string | Prisma.Decimal
  credit?: number | string | Prisma.Decimal
  createdBy?: number | null
  tx?: any
}

type SupplierLedgerInput = {
  supplierId: string
  entryType: 'OPENING_BALANCE' | 'PURCHASE_INVOICE' | 'PAYMENT_MADE'
  entryDate?: Date
  referenceType?: string | null
  referenceId?: string | null
  documentNumber?: string | null
  description?: string | null
  debit?: number | string | Prisma.Decimal
  credit?: number | string | Prisma.Decimal
  createdBy?: number | null
  tx?: any
}

function decimal(value: number | string | Prisma.Decimal | null | undefined) {
  return new Prisma.Decimal(value ?? 0)
}

async function getCustomerBaseBalance() {
  const lastEntry = await (prisma as any).customerLedgerEntry.findFirst({
    orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
  })
  return decimal(lastEntry?.runningBalance)
}

async function getSupplierBaseBalance() {
  const lastEntry = await (prisma as any).supplierLedgerEntry.findFirst({
    orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
  })
  return decimal(lastEntry?.runningBalance)
}

export async function appendCustomerLedgerEntry(input: CustomerLedgerInput) {
  const tx = input.tx || prisma
  const previousEntry = await (tx as any).customerLedgerEntry.findFirst({
    where: { customerId: input.customerId },
    orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
  })

  const openingBalance = previousEntry
    ? decimal(previousEntry.runningBalance)
    : decimal((await tx.customer.findUnique({ where: { id: input.customerId }, select: { openingBalance: true } }))?.openingBalance)
  const runningBalance = openingBalance.plus(decimal(input.debit)).minus(decimal(input.credit))

  return (tx as any).customerLedgerEntry.create({
    data: {
      customerId: input.customerId,
      entryType: input.entryType,
      entryDate: input.entryDate || new Date(),
      referenceType: input.referenceType || null,
      referenceId: input.referenceId || null,
      documentNumber: input.documentNumber || null,
      description: input.description || null,
      debit: decimal(input.debit),
      credit: decimal(input.credit),
      runningBalance,
      createdBy: input.createdBy ?? null,
    },
  })
}

export async function appendSupplierLedgerEntry(input: SupplierLedgerInput) {
  const tx = input.tx || prisma
  const previousEntry = await (tx as any).supplierLedgerEntry.findFirst({
    where: { supplierId: input.supplierId },
    orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
  })

  const openingBalance = previousEntry
    ? decimal(previousEntry.runningBalance)
    : decimal((await tx.supplier.findUnique({ where: { id: input.supplierId }, select: { openingBalance: true } }))?.openingBalance)
  const runningBalance = openingBalance.plus(decimal(input.credit)).minus(decimal(input.debit))

  return (tx as any).supplierLedgerEntry.create({
    data: {
      supplierId: input.supplierId,
      entryType: input.entryType,
      entryDate: input.entryDate || new Date(),
      referenceType: input.referenceType || null,
      referenceId: input.referenceId || null,
      documentNumber: input.documentNumber || null,
      description: input.description || null,
      debit: decimal(input.debit),
      credit: decimal(input.credit),
      runningBalance,
      createdBy: input.createdBy ?? null,
    },
  })
}

export async function getCustomerRunningBalance(customerId: string) {
  const lastEntry = await (prisma as any).customerLedgerEntry.findFirst({
    where: { customerId },
    orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
  })
  return decimal(lastEntry?.runningBalance)
}

export async function getSupplierRunningBalance(supplierId: string) {
  const lastEntry = await (prisma as any).supplierLedgerEntry.findFirst({
    where: { supplierId },
    orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
  })
  return decimal(lastEntry?.runningBalance)
}
