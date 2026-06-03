import { createCategorySchema, createMaterialSchema, adjustStockSchema } from '../validators/inventoryValidators'

describe('category validator', () => {
  it('rejects empty category name', () => {
    expect(() => createCategorySchema.parse({ categoryName: '' })).toThrow()
  })

  it('accepts valid category', () => {
    expect(createCategorySchema.parse({ categoryName: 'Fabric', description: 'All fabric types' })).toBeTruthy()
  })
})

describe('extended material validator', () => {
  it('accepts material with category', () => {
    expect(createMaterialSchema.parse({
      name: 'Cotton Fabric',
      defaultUnit: 'Meter',
      categoryId: 'cat_1',
      notes: 'Premium quality',
    })).toBeTruthy()
  })
})

describe('stock adjustment validator', () => {
  it('requires non-empty reason', () => {
    expect(() => adjustStockSchema.parse({ change: -5, unit: 'Meter', reason: '' })).toThrow()
  })
})