import * as repo from '../../repositories/inventory/finishedGoodsRepository'
import { prisma } from '../../prisma'
import { AppError } from '../../utils/errors'
import { allocateDocumentNumber, previewDocumentNumber } from '../sequenceService'

export async function createFinishedGood(data: any, userId?: number) {
  const articleNumber = await allocateDocumentNumber('article')
  return repo.createFinishedGood({
    ...data,
    sku: data.sku?.trim() || articleNumber,
    productCode: data.productCode?.trim() || articleNumber,
    createdBy: userId,
    updatedBy: userId,
  })
}

export async function previewNextArticleNumber() {
  return previewDocumentNumber('article')
}

export async function updateFinishedGood(id: string, data: any, userId?: number) {
  return repo.updateFinishedGood(id, {
    ...data,
    updatedBy: userId,
  })
}

export async function getFinishedGood(id: string) {
  const product = await repo.getFinishedGood(id)
  if (!product) return null
  return { ...product, currentStock: await repo.currentStock(id) }
}

export async function listFinishedGoods(opts: any = {}) {
  return repo.listFinishedGoods(opts)
}

export async function listTransactions(productId: string, opts: any = {}) {
  return repo.listTransactions(productId, opts)
}

export async function adjustFinishedGoodStock(params: {
  productId: string
  change: number
  unit: string
  reason: string
  referenceId?: string
  createdBy?: number
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.finishedGoodStockTransaction.aggregate({
      _sum: { change: true },
      where: { productId: params.productId },
    })
    const currentBalance = Number(current._sum.change || 0) + params.change
    if (currentBalance < 0) {
      throw new AppError(409, 'INSUFFICIENT_STOCK', 'Insufficient article stock: transaction would cause negative balance')
    }

    const record = await tx.finishedGoodStockTransaction.create({
      data: {
        productId: params.productId,
        change: params.change,
        unit: params.unit,
        transactionType: 'ADJUSTMENT' as any,
        balanceAfter: currentBalance,
        reason: params.reason,
        referenceId: params.referenceId || null,
        createdBy: params.createdBy,
      },
    })

    return record
  })
}

export async function currentStock(productId: string) {
  return repo.currentStock(productId)
}
