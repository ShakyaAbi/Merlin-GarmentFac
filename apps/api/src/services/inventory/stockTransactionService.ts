import { prisma } from '../../prisma'
import { recordAudit } from '../../utils/auditLog'
import { AppError } from '../../utils/errors'

export async function recordStockChange(params: {
  rawMaterialId: string
  change: number
  unit: string
  transactionType: string
  referenceId?: string
  unitCost?: number
  remarks?: string
  createdBy?: number
}) {
  return prisma.$transaction(async (tx) => {
    // Compute current balance
    const agg = await tx.stockTransaction.aggregate({
      _sum: { change: true },
      where: { rawMaterialId: params.rawMaterialId },
    })
    const currentBalance = (agg._sum.change || 0) + params.change
    if (currentBalance < 0) {
      throw new AppError(409, 'INSUFFICIENT_STOCK', 'Insufficient stock: transaction would cause negative balance')
    }

    // Create transaction
    const txRecord = await tx.stockTransaction.create({
      data: {
        rawMaterialId: params.rawMaterialId,
        change: params.change,
        unit: params.unit,
        transactionType: params.transactionType,
        referenceId: params.referenceId || null,
        balanceAfter: currentBalance,
        unitCost: params.unitCost || null,
        reason: params.remarks || params.transactionType,
        createdBy: params.createdBy,
      },
    })

    // If purchase, update average unit cost
    if (params.transactionType === 'PURCHASE_IN' && params.unitCost && params.change > 0) {
      const mat = await tx.rawMaterial.findUnique({ where: { id: params.rawMaterialId } })
      const prevAvg = Number(mat?.averageUnitCost || 0)
      const prevQty = currentBalance - params.change
      const newAvg = prevQty > 0
        ? ((prevAvg * prevQty) + (params.unitCost * params.change)) / (prevQty + params.change)
        : params.unitCost
      await tx.rawMaterial.update({
        where: { id: params.rawMaterialId },
        data: { averageUnitCost: newAvg },
      })
    }

    // Check low stock threshold
    const mat = await tx.rawMaterial.findUnique({ where: { id: params.rawMaterialId } })
    if (mat && mat.reorderLevel !== null && currentBalance <= mat.reorderLevel) {
      const existing = await tx.lowStockAlert.findFirst({
        where: { rawMaterialId: params.rawMaterialId, acknowledged: false },
      })
      if (!existing) {
        await tx.lowStockAlert.create({
          data: { rawMaterialId: params.rawMaterialId },
        })
      }
    }

    return txRecord
  })
}
