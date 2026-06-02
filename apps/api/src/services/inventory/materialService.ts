import * as repo from '../../repositories/inventory/materialRepository'

export const createMaterial = async (payload: any) => repo.createMaterial(payload)
export const getMaterial = async (id: string) => repo.getMaterial(id)
export const listMaterials = async (opts: any) => {
  const materials = await repo.listMaterials(opts)
  return Promise.all(
    materials.map(async (material: any) => ({
      ...material,
      currentStock: await repo.computeCurrentStock(material.id),
    })),
  )
}
export const updateMaterial = async (id: string, data: any) => repo.updateMaterial(id, data)
export const currentStock = async (id: string) => repo.computeCurrentStock(id)

export const listTransactions = async (materialId: string, opts: any = {}) => repo.listStockTransactions(materialId, opts)
export const listPrices = async (materialId: string) => {
  const pr = await import('./purchaseRepository')
  return pr.listPriceHistory(materialId)
}
export const listPurchasesForMaterial = async (materialId: string, opts: any = {}) => {
  const pr = await import('./purchaseRepository')
  return pr.listPurchasesForMaterial(materialId, opts)
}
export const updateMaterialWithUser = async (id: string, data: any, userId?: number) => repo.updateMaterial(id, { ...data, updatedBy: userId })
