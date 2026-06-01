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
