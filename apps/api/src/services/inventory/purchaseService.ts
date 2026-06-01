import * as repo from '../../repositories/inventory/purchaseRepository'

export const createPurchase = async (purchaseData: any, items: any[], userId?: number) => {
  return repo.createPurchaseTransactional(purchaseData, items, userId)
}
