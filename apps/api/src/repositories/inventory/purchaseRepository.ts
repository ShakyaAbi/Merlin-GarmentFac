import { Prisma, PrismaClient } from '@prisma/client'
import { appendSupplierLedgerEntry } from '../../services/ledgerService'
import { allocateDocumentNumber } from '../../services/sequenceService'

const prisma = new PrismaClient()

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
    let total = 0

    for (const it of items) {
      const quantity = Number(it.quantity)
      const unitPrice = Number(it.unitPrice)
      const lineTotal = quantity * unitPrice
      total += lineTotal

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

    await tx.purchase.update({ where: { id: purchase.id }, data: { totalAmount: total } })
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
      credit: total,
      createdBy: userId ?? null,
    })
    return { purchaseId: purchase.id, total, items: createdItems }
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
    },
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
    currency: string
    totalAmount: Prisma.Decimal
    createdBy: number | null
    createdAt: Date
    status: string
    notes: string | null
    supplierName: string | null
  }>>(Prisma.sql`
    WITH purchases AS (
      SELECT DISTINCT ON (p.id)
        p.id,
        p."supplierId",
        p."invoiceNumber",
        p."invoiceDate",
        p.currency,
        p."totalAmount",
        p."createdBy",
        p."createdAt",
        p.status,
        p.notes,
        s.name AS "supplierName"
      FROM "Purchase" p
      INNER JOIN "PurchaseItem" pi ON pi."purchaseId" = p.id
      LEFT JOIN "Supplier" s ON s.id = p."supplierId"
      WHERE pi."rawMaterialId" = ${rawMaterialId}
      ORDER BY p.id, p."createdAt" DESC
    )
    SELECT *
    FROM purchases
    ORDER BY "createdAt" DESC
    OFFSET ${skip}
    LIMIT ${take}
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
      p.id AS "purchaseId",
      p."createdAt" AS date,
      pi."unitPrice",
      pi.quantity,
      p."supplierId",
      s.name AS "supplierName"
    FROM "Purchase" p
    INNER JOIN "PurchaseItem" pi ON pi."purchaseId" = p.id
    LEFT JOIN "Supplier" s ON s.id = p."supplierId"
    WHERE pi."rawMaterialId" = ${rawMaterialId}
    ORDER BY p."createdAt" DESC
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
