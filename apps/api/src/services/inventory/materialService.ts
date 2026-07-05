import * as repo from '../../repositories/inventory/materialRepository'
import { prisma } from '../../prisma'
import { AppError } from '../../utils/errors'

// Creates a material
export const createMaterial = async (payload: any) => repo.createMaterial(payload)
// Fetches one material
export const getMaterial = async (id: string) => repo.getMaterial(id)
// Lists materials with stock
export const listMaterials = async (opts: any = {}) => {
  const page = opts.page || 1
  const pageSize = opts.pageSize || 20
  const skip = (page - 1) * pageSize
  const [materials, total] = await Promise.all([
    repo.listMaterials({ ...opts, skip, take: pageSize }),
    repo.countMaterials(opts),
  ])
  const withStock = await Promise.all(
    materials.map(async (material: any) => ({
      ...material,
      currentStock: await repo.computeCurrentStock(material.id),
    })),
  )
  return { data: withStock, total, page, pageSize }
}
// Updates a material
export const updateMaterial = async (id: string, data: any) => repo.updateMaterial(id, data)
// Returns current stock for a material
export const currentStock = async (id: string) => repo.computeCurrentStock(id)

// Lists stock transactions
export const listTransactions = async (materialId: string, opts: any = {}) => repo.listStockTransactions(materialId, opts)
// Lists price history
export const listPrices = async (materialId: string) => {
  const pr = await import('../../repositories/inventory/purchaseRepository')
  return pr.listPriceHistory(materialId)
}
// Lists purchases for one material
export const listPurchasesForMaterial = async (materialId: string, opts: any = {}) => {
  const pr = await import('../../repositories/inventory/purchaseRepository')
  return pr.listPurchasesForMaterial(materialId, opts)
}
export const listBomUsagesForMaterial = async (materialId: string) => repo.listBomUsagesForMaterial(materialId)
// Updates a material with audit user
export const updateMaterialWithUser = async (id: string, data: any, userId?: number) => repo.updateMaterial(id, { ...data, updatedBy: userId })
export const toggleMaterialStatus = async (id: string, active: boolean, userId?: number) => {
  return repo.updateMaterial(id, { active, updatedBy: userId })
}
export const deleteMaterial = async (id: string) => {
  const [purchaseItemCount, stockTransactionCount, issueLineCount, lowStockAlertCount, bomUsages] = await Promise.all([
    prisma.purchaseItem.count({ where: { rawMaterialId: id } }),
    prisma.stockTransaction.count({ where: { rawMaterialId: id } }),
    prisma.productionIssueLine.count({ where: { rawMaterialId: id } }),
    prisma.lowStockAlert.count({ where: { rawMaterialId: id } }),
    repo.listBomUsagesForMaterial(id),
  ])

  const references: Array<{ label: string; count: number; examples?: string[] }> = []
  if (purchaseItemCount > 0) references.push({ label: 'purchase line', count: purchaseItemCount })
  if (stockTransactionCount > 0) references.push({ label: 'stock transaction', count: stockTransactionCount })
  if (issueLineCount > 0) references.push({ label: 'production issue', count: issueLineCount })
  if (lowStockAlertCount > 0) references.push({ label: 'low stock alert', count: lowStockAlertCount })
  if (bomUsages.length > 0) {
    references.push({
      label: 'article BOM',
      count: bomUsages.length,
      examples: bomUsages.slice(0, 5).map((usage: any) => usage.articleName || usage.sku || usage.productCode || usage.finishedGoodId),
    })
  }

  if (references.length > 0) {
    const summary = references.map((ref) => `${ref.count} ${ref.label}${ref.count === 1 ? '' : 's'}`).join(' and ')
    throw new AppError(409, 'DELETE_BLOCKED', `Cannot delete material because it is referenced by ${summary}.`, {
      references,
    })
  }

  return repo.softDeleteMaterial(id)
}
