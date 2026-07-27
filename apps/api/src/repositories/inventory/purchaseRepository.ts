import { Prisma, PrismaClient, PurchasePaymentStatus } from '@prisma/client'
import { appendSupplierLedgerEntry, removeSupplierLedgerEntry, replaceSupplierLedgerEntry } from '../../services/ledgerService'
import { allocateDocumentNumber } from '../../services/sequenceService'
import { calculatePurchaseTotalsWithDiscount } from '../../services/inventory/purchaseTotals'
import { AppError } from '../../utils/errors'

const prisma = new PrismaClient()

const bankAccountSelect = { id: true, bankName: true, accountName: true, accountNumber: true, branchName: true, branchCode: true } as const

function mapPaymentStatus(paidAmount: Prisma.Decimal, totalAmount: Prisma.Decimal): PurchasePaymentStatus {
  if (paidAmount.greaterThanOrEqualTo(totalAmount)) return 'PAID'
  if (paidAmount.greaterThan(0)) return 'PARTIAL'
  return 'UNPAID'
}

async function refreshPurchasePaymentTotals(tx: Prisma.TransactionClient, purchaseId: string) {
  const purchase = await tx.purchase.findUnique({ where: { id: purchaseId }, select: { totalAmount: true } })
  if (!purchase) throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  const aggregate = await tx.purchasePayment.aggregate({ where: { purchaseId }, _sum: { amount: true } })
  const paidAmount = new Prisma.Decimal(aggregate._sum.amount || 0)
  const totalAmount = new Prisma.Decimal(purchase.totalAmount || 0)
  const dueAmount = totalAmount.minus(paidAmount)
  await tx.purchase.update({ where: { id: purchaseId }, data: { paidAmount, dueAmount, paymentStatus: mapPaymentStatus(paidAmount, totalAmount) } })
}

async function getPurchaseOrThrow(tx: Prisma.TransactionClient | PrismaClient, id: string) {
  const purchase = await tx.purchase.findUnique({ where: { id }, include: { items: true } })
  if (!purchase) throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  return purchase
}

async function computeStockBalance(tx: Prisma.TransactionClient, rawMaterialId: string) {
  const aggregate = await tx.stockTransaction.aggregate({ where: { rawMaterialId }, _sum: { change: true } })
  return Number(aggregate._sum.change || 0)
}

// Creates a purchase and its line items
export const createPurchaseTransactional = async (purchaseData: any, items: any[], userId?: number) => {
  return prisma.$transaction(async (tx) => {
    const invoiceNumber =
      purchaseData.invoiceNumber ||
      (await allocateDocumentNumber('purchase_invoice', {
        fiscalYear: purchaseData.fiscalYear || undefined,
        tx,
      }))
    const purchase = await tx.purchase.create({ data: { ...purchaseData, invoiceNumber, createdBy: userId } })
    const createdItems: any[] = []

    for (const it of items) {
      const quantity = Number(it.quantity)
      const unitPrice = Number(it.unitPrice)
      const lineTotal = quantity * unitPrice

      const created = await tx.purchaseItem.create({
        data: {
          ...it,
          purchaseId: purchase.id,
          quantity,
          unitPrice,
          lineTotal,
        },
      })

      createdItems.push(created)

      // create stock transaction per item
      await tx.stockTransaction.create({
        data: {
          rawMaterialId: it.rawMaterialId,
          change: quantity,
          unit: it.unit,
          reason: 'purchase',
          referenceId: purchase.id,
          createdBy: userId,
        },
      })

      // update material costPrice (last-price policy)
      await tx.rawMaterial.update({ where: { id: it.rawMaterialId }, data: { costPrice: unitPrice } })
    }

    const totals = calculatePurchaseTotalsWithDiscount(items.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })), Number(purchaseData.discountAmount ?? 0))

    await tx.purchase.update({
      where: { id: purchase.id },
      data: { totalAmount: totals.grandTotal, paidAmount: 0, dueAmount: totals.grandTotal, paymentStatus: 'UNPAID', discountAmount: totals.discountAmount } as any,
    })
    await appendSupplierLedgerEntry({
      tx,
      supplierId: purchase.supplierId,
      entryType: 'PURCHASE_INVOICE',
      entryDate: purchase.invoiceDate,
      referenceType: 'purchase_invoice',
      referenceId: purchase.id,
      documentNumber: invoiceNumber,
      description: `Purchase invoice ${invoiceNumber}`,
      debit: 0,
      credit: totals.grandTotal,
      createdBy: userId ?? null,
    })
    return { purchaseId: purchase.id, total: totals.grandTotal, items: createdItems }
  })
}

export const getPurchaseById = async (id: string) => {
  return prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: {
        include: {
          rawMaterial: true,
        },
      },
      payments: { orderBy: { paymentDate: 'desc' }, include: { bankAccount: { select: bankAccountSelect } } },
    },
  })
}

export const listPurchases = async (limit = 500) => {
  return prisma.purchase.findMany({
    take: Math.min(Math.max(limit, 1), 1000),
    orderBy: { invoiceDate: 'desc' },
    include: {
      supplier: { select: { id: true, name: true } },
      payments: { orderBy: { paymentDate: 'desc' }, include: { bankAccount: { select: bankAccountSelect } } },
    },
  })
}

export const listPurchasePayments = async (id: string) => {
  const purchase = await prisma.purchase.findUnique({ where: { id }, select: { id: true } })
  if (!purchase) throw new AppError(404, 'NOT_FOUND', 'Purchase not found')
  return prisma.purchasePayment.findMany({ where: { purchaseId: id }, orderBy: { paymentDate: 'desc' }, include: { bankAccount: { select: bankAccountSelect } } })
}

export const recordPurchasePayment = async (id: string, payment: any, userId?: number) => {
  return prisma.$transaction(async (tx) => {
    const purchase = await getPurchaseOrThrow(tx, id)
    if (purchase.status === 'cancelled') throw new AppError(409, 'INVALID_STATUS', 'Cannot record a payment for a cancelled purchase')
    const amount = new Prisma.Decimal(payment.amount)
    const dueAmount = new Prisma.Decimal(purchase.totalAmount).minus(new Prisma.Decimal(purchase.paidAmount || 0))
    if (amount.greaterThan(dueAmount)) throw new AppError(400, 'PAYMENT_EXCEEDS_DUE', 'Payment amount exceeds the remaining due amount')
    const paymentNumber = await allocateDocumentNumber('payment', { fiscalYear: String(purchase.invoiceDate.getFullYear()), tx })
    const created = await tx.purchasePayment.create({ data: { paymentNumber, purchaseId: id, paymentDate: payment.paymentDate || new Date(), amount, paymentMethod: payment.paymentMethod, note: payment.note || null, createdBy: userId ?? null, bankAccountId: payment.bankAccountId || null } })
    await refreshPurchasePaymentTotals(tx, id)
    await appendSupplierLedgerEntry({ tx, supplierId: purchase.supplierId, entryType: 'PAYMENT_MADE', entryDate: created.paymentDate, referenceType: 'purchase_payment', referenceId: created.id, documentNumber: paymentNumber, description: `Payment made for ${purchase.invoiceNumber || purchase.id}`, debit: amount, credit: 0, createdBy: userId ?? null })
    return getPurchaseById(id)
  })
}

export const updatePurchasePayment = async (id: string, paymentId: string, payment: any, userId?: number) => {
  return prisma.$transaction(async (tx) => {
    const purchase = await getPurchaseOrThrow(tx, id)
    if (purchase.status === 'cancelled') throw new AppError(409, 'INVALID_STATUS', 'Cannot update a payment for a cancelled purchase')
    const existing = await tx.purchasePayment.findFirst({ where: { id: paymentId, purchaseId: id } })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Purchase payment not found')
    const otherPaid = new Prisma.Decimal(purchase.paidAmount || 0).minus(existing.amount)
    const amount = payment.amount === undefined ? existing.amount : new Prisma.Decimal(payment.amount)
    if (amount.greaterThan(new Prisma.Decimal(purchase.totalAmount).minus(otherPaid))) throw new AppError(400, 'PAYMENT_EXCEEDS_DUE', 'Payment amount exceeds the remaining due amount')
    const updated = await tx.purchasePayment.update({ where: { id: paymentId }, data: { amount, paymentMethod: payment.paymentMethod || existing.paymentMethod, paymentDate: payment.paymentDate || existing.paymentDate, note: payment.note === undefined ? existing.note : payment.note || null, createdBy: userId ?? existing.createdBy ?? null, bankAccountId: payment.bankAccountId === undefined ? existing.bankAccountId : payment.bankAccountId || null } })
    await refreshPurchasePaymentTotals(tx, id)
    await replaceSupplierLedgerEntry({ tx, supplierId: purchase.supplierId, entryType: 'PAYMENT_MADE', entryDate: updated.paymentDate, referenceType: 'purchase_payment', referenceId: updated.id, documentNumber: updated.paymentNumber, description: `Payment made for ${purchase.invoiceNumber || purchase.id}`, debit: updated.amount, credit: 0, createdBy: userId ?? existing.createdBy ?? null })
    return getPurchaseById(id)
  })
}

export const deletePurchasePayment = async (id: string, paymentId: string) => {
  return prisma.$transaction(async (tx) => {
    const purchase = await getPurchaseOrThrow(tx, id)
    if (purchase.status === 'cancelled') throw new AppError(409, 'INVALID_STATUS', 'Cannot delete a payment from a cancelled purchase')
    const existing = await tx.purchasePayment.findFirst({ where: { id: paymentId, purchaseId: id } })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Purchase payment not found')
    await tx.purchasePayment.delete({ where: { id: paymentId } })
    await refreshPurchasePaymentTotals(tx, id)
    await removeSupplierLedgerEntry({ tx, supplierId: purchase.supplierId, referenceType: 'purchase_payment', referenceId: paymentId })
    return getPurchaseById(id)
  })
}

export const cancelPurchase = async (id: string, reason: string, userId?: number) => {
  return prisma.$transaction(async (tx) => {
    const purchase = await getPurchaseOrThrow(tx, id)
    if (purchase.status === 'cancelled') throw new AppError(409, 'INVALID_STATUS', 'Purchase is already cancelled')
    for (const item of purchase.items) {
      const currentBalance = await computeStockBalance(tx, item.rawMaterialId)
      const nextBalance = currentBalance - Number(item.quantity)
      if (nextBalance < 0) throw new AppError(409, 'INSUFFICIENT_STOCK', 'Cannot cancel this purchase because some received material has already been used')
      await tx.stockTransaction.create({ data: { rawMaterialId: item.rawMaterialId, change: -Number(item.quantity), unit: item.unit, transactionType: 'PURCHASE_CANCEL', balanceAfter: nextBalance, unitCost: item.unitPrice, reason: 'purchase.cancel', referenceId: purchase.id, createdBy: userId ?? null } })
    }
    await tx.purchase.update({ where: { id }, data: { status: 'cancelled', cancelledBy: userId ?? null, cancelledAt: new Date(), cancellationReason: reason } })
    await removeSupplierLedgerEntry({ tx, supplierId: purchase.supplierId, referenceType: 'purchase_invoice', referenceId: purchase.id })
    return getPurchaseById(id)
  })
}

// Lists purchases for one material
export const listPurchasesForMaterial = async (rawMaterialId: string, opts: any = {}) => {
  const skip = ((opts.page || 1) - 1) * (opts.pageSize || 20)
  const take = opts.pageSize || 20
  const rows = await prisma.$queryRaw<Array<{
    id: string
    supplierId: string
    invoiceNumber: string | null
    invoiceDate: Date
    dueDate: Date | null
    currency: string
    discountAmount: Prisma.Decimal
    totalAmount: Prisma.Decimal
    createdBy: number | null
    createdAt: Date
    status: string
    notes: string | null
    supplierName: string | null
  }>>(Prisma.sql`
    WITH purchases AS (
      SELECT
        p.id,
        p.supplierId,
        p.invoiceNumber,
        p.invoiceDate,
        p.dueDate,
        p.currency,
        p.discountAmount,
        p.totalAmount,
        p.createdBy,
        p.createdAt,
        p.status,
        p.notes,
        s.name AS supplierName
      FROM Purchase p
      INNER JOIN (
        SELECT DISTINCT pi.purchaseId
        FROM PurchaseItem pi
        WHERE pi.rawMaterialId = ${rawMaterialId}
      ) material_purchases ON material_purchases.purchaseId = p.id
      LEFT JOIN Supplier s ON s.id = p.supplierId
    )
    SELECT *
    FROM purchases
    ORDER BY createdAt DESC
    LIMIT ${take} OFFSET ${skip}
  `)

  return rows.map((row) => ({
    ...row,
    supplier: row.supplierName ? { id: row.supplierId, name: row.supplierName } : null,
  }))
}

// Builds purchase price history
export const listPriceHistory = async (rawMaterialId: string) => {
  const rows = await prisma.$queryRaw<Array<{
    purchaseId: string
    date: Date
    unitPrice: Prisma.Decimal
    quantity: number
    supplierId: string
    supplierName: string | null
  }>>(Prisma.sql`
    SELECT
      p.id AS purchaseId,
      p.createdAt AS date,
      pi.unitPrice,
      pi.quantity,
      p.supplierId,
      s.name AS supplierName
    FROM Purchase p
    INNER JOIN PurchaseItem pi ON pi.purchaseId = p.id
    LEFT JOIN Supplier s ON s.id = p.supplierId
    WHERE pi.rawMaterialId = ${rawMaterialId}
    ORDER BY p.createdAt DESC
    LIMIT 50
  `)

  return rows.map((row) => ({
    purchaseId: row.purchaseId,
    supplier: row.supplierName ? { id: row.supplierId, name: row.supplierName } : null,
    unitPrice: row.unitPrice,
    quantity: row.quantity,
    date: row.date,
  }))
}
