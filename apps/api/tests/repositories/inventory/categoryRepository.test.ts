const categoryCreate = jest.fn()

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    rawMaterialCategory: {
      create: (...args: unknown[]) => categoryCreate(...args),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  })),
}))

import { createCategory } from '../../../src/repositories/inventory/categoryRepository'

describe('categoryRepository', () => {
  beforeEach(() => {
    categoryCreate.mockReset()
  })

  test('createCategory trims names and maps duplicate categoryName to DUPLICATE_CATEGORY', async () => {
    categoryCreate.mockRejectedValueOnce(Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      meta: { target: ['categoryName'] },
    }))

    await expect(createCategory({
      categoryName: '  Fabric  ',
      description: '  All fabrics  ',
    })).rejects.toMatchObject({
      statusCode: 409,
      code: 'DUPLICATE_CATEGORY',
    })

    expect(categoryCreate).toHaveBeenCalledWith({
      data: {
        categoryName: 'Fabric',
        description: 'All fabrics',
      },
    })
  })
})
