const listCategories = jest.fn()
const createCategory = jest.fn()
const getCategory = jest.fn()

jest.mock('../../../src/repositories/inventory/categoryRepository', () => ({
  listCategories: (...args: unknown[]) => listCategories(...args),
  createCategory: (...args: unknown[]) => createCategory(...args),
  getCategory: (...args: unknown[]) => getCategory(...args),
}))

import { createCategory as createCategoryService } from '../../../src/services/inventory/categoryService'

describe('categoryService', () => {
  beforeEach(() => {
    listCategories.mockReset()
    createCategory.mockReset()
    getCategory.mockReset()
  })

  test('createCategory delegates to the repository without reshaping data', async () => {
    createCategory.mockResolvedValue({ id: 'cat-1', categoryName: 'Fabric' })

    const result = await createCategoryService({
      categoryName: '  Fabric  ',
      description: '  All fabrics  ',
    }) as any

    expect(createCategory).toHaveBeenCalledWith({
      categoryName: '  Fabric  ',
      description: '  All fabrics  ',
    })
    expect(result).toEqual({ id: 'cat-1', categoryName: 'Fabric' })
  })
})
