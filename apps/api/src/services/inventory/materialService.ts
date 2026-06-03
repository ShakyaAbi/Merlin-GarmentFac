import * as repo from '../../repositories/inventory/materialRepository'

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
// Updates a material with audit user
export const updateMaterialWithUser = async (id: string, data: any, userId?: number) => repo.updateMaterial(id, { ...data, updatedBy: userId })
export const toggleMaterialStatus = async (id: string, active: boolean, userId?: number) => {
  return repo.updateMaterial(id, { active, updatedBy: userId })
}
export const deleteMaterial = async (id: string) => {
  return repo.softDeleteMaterial(id)
}
