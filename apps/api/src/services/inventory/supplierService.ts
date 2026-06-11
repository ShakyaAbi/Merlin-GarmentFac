import * as repo from '../../repositories/inventory/supplierRepository'

// Creates a supplier
export const createSupplier = async (payload: any) => {
  return repo.createSupplier(payload)
}

// Lists suppliers
export const listSuppliers = async (opts: any) => repo.listSuppliers(opts)
// Fetches one supplier
export const getSupplier = async (id: string) => repo.getSupplier(id)
// Updates a supplier
export const updateSupplier = async (id: string, data: any) => repo.updateSupplier(id, data)
// Soft-deletes a supplier
export const softDeleteSupplier = async (id: string) => repo.softDeleteSupplier(id)
