import { PrismaClient } from '@prisma/client'
import { recordStockChange } from '../../services/inventory/stockTransactionService'
const prisma = new PrismaClient()

// Creates a stock transaction
export const createStockTransaction = async (data: any) => {
  return recordStockChange({
    rawMaterialId: data.rawMaterialId,
    change: data.change,
    unit: data.unit,
    transactionType: data.transactionType || 'ADJUSTMENT',
    referenceId: data.referenceId || null,
    unitCost: data.unitCost,
    remarks: data.reason || data.remarks,
    createdBy: data.createdBy,
  })
}
// Lists stock transactions
export const listStockTransactions = async (rawMaterialId: string, opts: any = {}) => prisma.stockTransaction.findMany({ where: { rawMaterialId }, orderBy: { createdAt: 'desc' }, take: opts.take || 50 })
