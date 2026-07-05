const listBomUsagesForMaterial = jest.fn()
const softDeleteMaterial = jest.fn()
const purchaseItemCount = jest.fn()
const stockTransactionCount = jest.fn()
const productionIssueLineCount = jest.fn()
const lowStockAlertCount = jest.fn()

jest.mock('../../../src/repositories/inventory/materialRepository', () => ({
  listBomUsagesForMaterial: (...args: unknown[]) => listBomUsagesForMaterial(...args),
  softDeleteMaterial: (...args: unknown[]) => softDeleteMaterial(...args),
}))

jest.mock('../../../src/prisma', () => ({
  prisma: {
    purchaseItem: {
      count: (...args: unknown[]) => purchaseItemCount(...args),
    },
    stockTransaction: {
      count: (...args: unknown[]) => stockTransactionCount(...args),
    },
    productionIssueLine: {
      count: (...args: unknown[]) => productionIssueLineCount(...args),
    },
    lowStockAlert: {
      count: (...args: unknown[]) => lowStockAlertCount(...args),
    },
  },
}))

import { deleteMaterial } from '../../../src/services/inventory/materialService'

describe('materialService', () => {
  beforeEach(() => {
    listBomUsagesForMaterial.mockReset()
    softDeleteMaterial.mockReset()
    purchaseItemCount.mockReset()
    stockTransactionCount.mockReset()
    productionIssueLineCount.mockReset()
    lowStockAlertCount.mockReset()
  })

  test('deleteMaterial blocks deletion when the material is referenced by invoices or BOMs', async () => {
    purchaseItemCount.mockResolvedValue(1)
    stockTransactionCount.mockResolvedValue(0)
    productionIssueLineCount.mockResolvedValue(0)
    lowStockAlertCount.mockResolvedValue(0)
    listBomUsagesForMaterial.mockResolvedValue([
      {
        finishedGoodId: 'fg-1',
        articleName: 'BOM Shirt',
        sku: 'BOM-SHIRT',
      },
    ])

    await expect(deleteMaterial('mat-1')).rejects.toMatchObject({
      statusCode: 409,
      code: 'DELETE_BLOCKED',
    })

    expect(softDeleteMaterial).not.toHaveBeenCalled()
  })

  test('deleteMaterial soft-deletes the material when there are no references', async () => {
    purchaseItemCount.mockResolvedValue(0)
    stockTransactionCount.mockResolvedValue(0)
    productionIssueLineCount.mockResolvedValue(0)
    lowStockAlertCount.mockResolvedValue(0)
    listBomUsagesForMaterial.mockResolvedValue([])
    softDeleteMaterial.mockResolvedValue({ id: 'mat-1' })

    const result = await deleteMaterial('mat-1')

    expect(softDeleteMaterial).toHaveBeenCalledWith('mat-1')
    expect(result).toEqual({ id: 'mat-1' })
  })
})
