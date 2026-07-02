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

type CustomerLedgerMutationInput = CustomerLedgerInput & {
  referenceType: string
  referenceId: string
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

type SupplierLedgerMutationInput = SupplierLedgerInput & {
  referenceType: string
  referenceId: string
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

async function recalculateCustomerRunningBalances(tx: any, customerId: string) {
  const rows = await tx.customerLedgerEntry.findMany({
    where: { customerId },
    orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
  })

  let runningBalance = new Prisma.Decimal(0)
  for (const row of rows) {
    runningBalance = runningBalance.plus(decimal(row.debit)).minus(decimal(row.credit))
    await tx.customerLedgerEntry.update({
      where: { id: row.id },
      data: { runningBalance },
    })
  }
}

async function recalculateSupplierRunningBalances(tx: any, supplierId: string) {
  const rows = await tx.supplierLedgerEntry.findMany({
    where: { supplierId },
    orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
  })

  let runningBalance = new Prisma.Decimal(0)
  for (const row of rows) {
    runningBalance = runningBalance.plus(decimal(row.credit)).minus(decimal(row.debit))
    await tx.supplierLedgerEntry.update({
      where: { id: row.id },
      data: { runningBalance },
    })
  }
}

export async function replaceCustomerLedgerEntry(input: CustomerLedgerMutationInput) {
  const tx = input.tx || prisma
  const existing = await tx.customerLedgerEntry.findFirst({
    where: {
      customerId: input.customerId,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
    },
  })

  if (existing) {
    await tx.customerLedgerEntry.update({
      where: { id: existing.id },
      data: {
        entryType: input.entryType,
        entryDate: input.entryDate || existing.entryDate,
        documentNumber: input.documentNumber || null,
        description: input.description || null,
        debit: decimal(input.debit),
        credit: decimal(input.credit),
        createdBy: input.createdBy ?? null,
      },
    })
  } else {
    await appendCustomerLedgerEntry(input)
  }

  await recalculateCustomerRunningBalances(tx, input.customerId)
}

export async function removeCustomerLedgerEntry(input: {
  tx?: any
  customerId: string
  referenceType: string
  referenceId: string
}) {
  const tx = input.tx || prisma
  const existing = await tx.customerLedgerEntry.findFirst({
    where: {
      customerId: input.customerId,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
    },
  })
  if (!existing) return
  await tx.customerLedgerEntry.delete({ where: { id: existing.id } })
  await recalculateCustomerRunningBalances(tx, input.customerId)
}

export async function replaceSupplierLedgerEntry(input: SupplierLedgerMutationInput) {
  const tx = input.tx || prisma
  const existing = await tx.supplierLedgerEntry.findFirst({
    where: {
      supplierId: input.supplierId,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
    },
  })

  if (existing) {
    await tx.supplierLedgerEntry.update({
      where: { id: existing.id },
      data: {
        entryType: input.entryType,
        entryDate: input.entryDate || existing.entryDate,
        documentNumber: input.documentNumber || null,
        description: input.description || null,
        debit: decimal(input.debit),
        credit: decimal(input.credit),
        createdBy: input.createdBy ?? null,
      },
    })
  } else {
    await appendSupplierLedgerEntry(input)
  }

  await recalculateSupplierRunningBalances(tx, input.supplierId)
}

export async function removeSupplierLedgerEntry(input: {
  tx?: any
  supplierId: string
  referenceType: string
  referenceId: string
}) {
  const tx = input.tx || prisma
  const existing = await tx.supplierLedgerEntry.findFirst({
    where: {
      supplierId: input.supplierId,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
    },
  })
  if (!existing) return
  await tx.supplierLedgerEntry.delete({ where: { id: existing.id } })
  await recalculateSupplierRunningBalances(tx, input.supplierId)
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
