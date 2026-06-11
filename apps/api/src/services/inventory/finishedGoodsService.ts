import * as repo from '../../repositories/inventory/finishedGoodsRepository'

export async function createFinishedGood(data: any, userId?: number) {
  return repo.createFinishedGood({
    ...data,
    createdBy: userId,
    updatedBy: userId,
  })
}

export async function updateFinishedGood(id: string, data: any, userId?: number) {
  return repo.updateFinishedGood(id, {
    ...data,
    updatedBy: userId,
  })
}

export async function getFinishedGood(id: string) {
  const product = await repo.getFinishedGood(id)
  if (!product) return null
  return { ...product, currentStock: await repo.currentStock(id) }
}

export async function listFinishedGoods(opts: any = {}) {
  return repo.listFinishedGoods(opts)
}

export async function listTransactions(productId: string, opts: any = {}) {
  return repo.listTransactions(productId, opts)
}

