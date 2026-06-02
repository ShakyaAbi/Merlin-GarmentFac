import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export const createPurchaseTransactional = async (purchaseData: any, items: any[], userId?: number) => {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({ data: { ...purchaseData, createdBy: userId } })
    const createdItems: any[] = []
    let total = 0
    for (const it of items) {
      const lineTotal = Number(it.quantity) * Number(it.unitPrice)
      total += lineTotal
      const created = await tx.purchaseItem.create({ data: { ...it, purchaseId: purchase.id, lineTotal } })
      createdItems.push(created)
      // create stock transaction per item
      await tx.stockTransaction.create({ data: { rawMaterialId: it.rawMaterialId, change: Number(it.quantity), unit: it.unit, reason: 'purchase', referenceId: purchase.id, createdBy: userId } })
      // update material costPrice (last-price policy)
      await tx.rawMaterial.update({ where: { id: it.rawMaterialId }, data: { costPrice: it.unitPrice } })
    }
    await tx.purchase.update({ where: { id: purchase.id }, data: { totalAmount: total } })
    return { purchaseId: purchase.id, total }
  })
}

export const listPurchasesForMaterial = async (rawMaterialId: string, opts: any = {}) => {
  const skip = ((opts.page || 1) - 1) * (opts.pageSize || 20)
  const take = opts.pageSize || 20
  return prisma.purchase.findMany({
    where: { items: { some: { rawMaterialId } } } as any,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    include: { items: true, supplier: true }
  })
}

export const listPriceHistory = async (rawMaterialId: string) => {
  // Return recent purchases for this material as price history
  const purchases = await prisma.purchase.findMany({
    where: { items: { some: { rawMaterialId } } } as any,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { items: true, supplier: true }
  })
  // flatten per-item with purchase meta
  const history: any[] = []
  for (const p of purchases) {
    for (const it of p.items) {
      if (it.rawMaterialId === rawMaterialId) {
        history.push({ purchaseId: p.id, supplier: p.supplier, unitPrice: it.unitPrice, quantity: it.quantity, date: p.createdAt })
      }
    }
  }
  return history
}
