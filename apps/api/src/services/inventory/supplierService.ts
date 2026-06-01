import * as repo from '../../repositories/inventory/supplierRepository'

export const createSupplier = async (payload: any) => {
  return repo.createSupplier(payload)
}

export const listSuppliers = async (opts: any) => repo.listSuppliers(opts)
export const getSupplier = async (id: string) => repo.getSupplier(id)
export const updateSupplier = async (id: string, data: any) => repo.updateSupplier(id, data)
