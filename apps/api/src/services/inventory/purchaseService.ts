import * as repo from '../../repositories/inventory/purchaseRepository'

// Creates a purchase transaction
export const createPurchase = async (purchaseData: any, items: any[], userId?: number) => {
  return repo.createPurchaseTransactional(purchaseData, items, userId)
}

export const getPurchase = async (id: string) => {
  return repo.getPurchaseById(id)
}
