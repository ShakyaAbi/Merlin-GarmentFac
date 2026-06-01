import * as repo from '../../repositories/inventory/materialRepository'

export const createMaterial = async (payload: any) => repo.createMaterial(payload)
export const getMaterial = async (id: string) => repo.getMaterial(id)
export const listMaterials = async (opts: any) => repo.listMaterials(opts)
export const updateMaterial = async (id: string, data: any) => repo.updateMaterial(id, data)
export const currentStock = async (id: string) => repo.computeCurrentStock(id)
