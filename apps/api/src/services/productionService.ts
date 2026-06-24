import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'
import { AppError } from '../utils/errors'
import { allocateDocumentNumber } from './sequenceService'

function toNumber(value: any) {
  return Number(value ?? 0)
}

async function loadFinishedGood(tx: any, finishedGoodId: string) {
  const fg = await tx.finishedGoodProduct.findUnique({ where: { id: finishedGoodId } } as any)
  if (!fg) throw new AppError(404, 'NOT_FOUND', 'Finished good not found')
  return fg as any
}

async function loadProductionOrder(tx: any, id: string) {
  return tx.productionOrder.findUnique({
    where: { id },
    include: {
      finishedGood: true,
      issueLines: { include: { rawMaterial: true } },
      completionLines: { include: { finishedGood: true } },
    } as any,
  } as any)
}

export async function listProductionOrders(opts: { search?: string } = {}) {
  const where: any = {}
  if (opts.search) {
    where.OR = [
      { orderNumber: { contains: opts.search, mode: 'insensitive' } },
      { finishedGoodName: { contains: opts.search, mode: 'insensitive' } },
      { notes: { contains: opts.search, mode: 'insensitive' } },
    ]
  }
  return (prisma as any).productionOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      finishedGood: true,
      issueLines: { include: { rawMaterial: true } },
      completionLines: { include: { finishedGood: true } },
    } as any,
  } as any)
}

export async function getProductionOrder(id: string) {
  return loadProductionOrder(prisma as any, id)
}

export async function createProductionOrder(payload: { finishedGoodId: string; quantityPlanned: number; notes?: string }, userId?: number) {
  return prisma.$transaction(async (tx) => {
    const fg = await loadFinishedGood(tx as any, payload.finishedGoodId)
    const orderNumber = await allocateDocumentNumber('production_order', { tx })

    const created = await (tx as any).productionOrder.create({
      data: {
        orderNumber,
        finishedGoodId: fg.id,
        finishedGoodName: fg.name,
        quantityPlanned: payload.quantityPlanned,
        notes: payload.notes || null,
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
        status: 'DRAFT',
      },
    })

    return loadProductionOrder(tx as any, created.id)
  })
}

export async function updateProductionOrder(id: string, payload: { finishedGoodId: string; quantityPlanned: number; notes?: string }, userId?: number) {
  return prisma.$transaction(async (tx) => {
    const order = await loadProductionOrder(tx as any, id)
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Production order not found')
    if (order.status !== 'DRAFT') {
      throw new AppError(409, 'INVALID_STATUS', 'Only draft production batches can be edited')
    }

    const fg = await loadFinishedGood(tx as any, payload.finishedGoodId)
    await (tx as any).productionOrder.update({
      where: { id },
      data: {
        finishedGoodId: fg.id,
        finishedGoodName: fg.name,
        quantityPlanned: payload.quantityPlanned,
        notes: payload.notes || null,
        updatedBy: userId ?? null,
      },
    })

    return loadProductionOrder(tx as any, id)
  })
}

export async function deleteProductionOrder(id: string) {
  return prisma.$transaction(async (tx) => {
    const order = await loadProductionOrder(tx as any, id)
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Production order not found')
    if (order.status !== 'DRAFT') {
      throw new AppError(409, 'INVALID_STATUS', 'Only draft production batches can be deleted')
    }

    await (tx as any).productionOrder.delete({ where: { id } })
    return order
  })
}

export async function issueProductionOrder(id: string, userId?: number, issueReason?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await loadProductionOrder(tx as any, id)
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Production order not found')
    if (order.status !== 'DRAFT') {
      throw new AppError(409, 'INVALID_STATUS', 'Only draft production orders can be issued')
    }

    const bomItems = Array.isArray(order.finishedGood?.bomData?.items) ? order.finishedGood.bomData.items : []
    for (const item of bomItems as any[]) {
      const requiredQty = toNumber(item.consumption) * toNumber(order.quantityPlanned)
      const rawMaterial = await (tx as any).rawMaterial.findUnique({ where: { id: item.rawMaterialId } })
      const unit = item.unit || rawMaterial?.defaultUnit
      const currentStock = await (tx as any).stockTransaction.aggregate({
        _sum: { change: true },
        where: { rawMaterialId: item.rawMaterialId },
      })
      const balance = Number(currentStock._sum.change || 0)
      if (balance < requiredQty) {
        throw new AppError(409, 'INSUFFICIENT_STOCK', `Insufficient stock for ${rawMaterial?.name || item.rawMaterialId}`)
      }
      const nextBalance = balance - requiredQty
      await (tx as any).stockTransaction.create({
        data: {
          rawMaterialId: item.rawMaterialId,
          change: -requiredQty,
          unit,
          transactionType: 'PRODUCTION_ISSUE',
          referenceId: order.id,
          balanceAfter: nextBalance,
          reason: issueReason || `production.issue:${order.id}`,
          createdBy: userId ?? null,
        },
      })
      await (tx as any).productionIssueLine.create({
        data: {
          productionOrderId: order.id,
          rawMaterialId: item.rawMaterialId,
          quantity: requiredQty,
          unit,
          bomConsumption: toNumber(item.consumption),
        },
      })
    }

    await (tx as any).productionOrder.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        issuedAt: new Date(),
        startedAt: new Date(),
        updatedBy: userId ?? null,
      },
    })

    return loadProductionOrder(tx as any, id)
  })
}

export async function completeProductionOrder(id: string, payload: { quantityProduced: number; completionNote?: string }, userId?: number) {
  return prisma.$transaction(async (tx) => {
    const order = await loadProductionOrder(tx as any, id)
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Production order not found')
    if (order.status !== 'IN_PROGRESS' && order.status !== 'MATERIAL_ISSUED') {
      throw new AppError(409, 'INVALID_STATUS', 'Production order must be issued before completion')
    }
    if (payload.quantityProduced > Number(order.quantityPlanned || 0)) {
      throw new AppError(400, 'INVALID_QUANTITY', 'Produced quantity cannot exceed the planned quantity')
    }

    const fg = order.finishedGood
    const currentStock = await (tx as any).finishedGoodStockTransaction.aggregate({
      _sum: { change: true },
      where: { productId: fg.id },
    })
    const balance = Number(currentStock._sum.change || 0)
    const nextBalance = balance + payload.quantityProduced
    await (tx as any).productionCompletionLine.create({
      data: {
        productionOrderId: order.id,
        finishedGoodId: fg.id,
        quantity: payload.quantityProduced,
        unit: fg.unit,
      },
    })

    await (tx as any).finishedGoodStockTransaction.create({
      data: {
        productId: fg.id,
        change: payload.quantityProduced,
        unit: fg.unit,
        transactionType: 'PRODUCTION_RECEIPT' as any,
        balanceAfter: nextBalance,
        unitCost: new Prisma.Decimal(fg.costPrice || 0),
        reason: payload.completionNote || `production.complete:${order.id}`,
        referenceId: order.id,
        createdBy: userId ?? null,
      },
    })

    await (tx as any).productionOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        quantityProduced: payload.quantityProduced,
        completedAt: new Date(),
        updatedBy: userId ?? null,
      },
    })

    return loadProductionOrder(tx as any, id)
  })
}
