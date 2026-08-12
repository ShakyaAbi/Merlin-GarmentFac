import * as repo from '../../repositories/inventory/finishedGoodsRepository'
import * as articleCategories from './articleCategoryService'
import { prisma } from '../../prisma'
import { AppError } from '../../utils/errors'
import { allocateDocumentNumber, previewDocumentNumber } from '../sequenceService'

async function normalizeBomCosts(data: any) {
  const items = Array.isArray(data?.bomData?.items) ? data.bomData.items : []
  if (items.length === 0) {
    return {
      data,
      materialCost: data.costPrice === undefined ? undefined : Number(data.costPrice ?? 0),
    }
  }

  const materialIds = [...new Set(items.map((item: any) => item.rawMaterialId).filter(Boolean))]
  const materials = materialIds.length
    ? await prisma.rawMaterial.findMany({
        where: { id: { in: materialIds } },
        select: { id: true, name: true, defaultUnit: true, costPrice: true } as any,
      } as any)
    : []
  const materialById = new Map(materials.map((material: any) => [material.id, material]))

  const normalizedItems = items.map((item: any) => {
    const material: any = materialById.get(item.rawMaterialId)
    const materialCost = Number(material?.costPrice ?? 0)
    const consumption = Number(item.consumption ?? 0)
    return {
      ...item,
      rawMaterialName: material?.name || item.rawMaterialName,
      unit: item.unit || material?.defaultUnit || '',
      rate: materialCost,
      consumption,
    }
  })

  const materialCost = normalizedItems.reduce(
    (sum: number, item: any) => sum + Number(item.consumption ?? 0) * Number(item.rate ?? 0),
    0,
  )

  return {
    data: {
      ...data,
      costPrice: materialCost,
      bomData: {
        ...data.bomData,
        items: normalizedItems,
      },
    },
    materialCost,
  }
}

export async function createFinishedGood(data: any, userId?: number) {
  const articleNumber = await allocateDocumentNumber('article')
  const normalized = await normalizeBomCosts(data)
  const category = data.articleCategoryId ? await articleCategories.getCategory(data.articleCategoryId) : null
  return repo.createFinishedGood({
    ...normalized.data,
    costPrice: normalized.materialCost,
    category: category?.name || data.category?.trim() || undefined,
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
  const normalized = await normalizeBomCosts(data)
  const category = data.articleCategoryId ? await articleCategories.getCategory(data.articleCategoryId) : null
  return repo.updateFinishedGood(id, {
    ...normalized.data,
    costPrice: normalized.materialCost,
    category: category?.name || data.category?.trim() || undefined,
    updatedBy: userId,
  })
}

export async function deleteFinishedGood(id: string) {
  return repo.softDeleteFinishedGood(id)
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
