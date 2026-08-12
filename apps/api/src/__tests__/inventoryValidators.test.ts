import { createCategorySchema, createMaterialSchema, adjustStockSchema, createPurchaseSchema } from '../validators/inventoryValidators'

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
      sku: 'MAT-001',
      defaultUnit: 'Meter',
      categoryId: 'cat_1',
      notes: 'Premium quality',
    })).toBeTruthy()
  })

  it('rejects material without exim code', () => {
    expect(() => createMaterialSchema.parse({
      name: 'Cotton Fabric',
      defaultUnit: 'Meter',
    })).toThrow()
  })
})

describe('stock adjustment validator', () => {
  it('requires non-empty reason', () => {
    expect(() => adjustStockSchema.parse({ change: -5, unit: 'Meter', reason: '' })).toThrow()
  })
})

describe('purchase validator', () => {
  const basePayload = {
    supplierId: 'sup_1',
    invoiceNumber: 'PINV-001',
    invoiceDate: '2026-06-29',
    items: [{ rawMaterialId: 'mat_1', quantity: 1, unit: 'pcs', unitPrice: '100' }],
  }

  it('accepts purchase invoices without a due date', () => {
    expect(createPurchaseSchema.parse(basePayload)).toBeTruthy()
  })

  it('accepts purchase invoices with an optional due date', () => {
    expect(createPurchaseSchema.parse({ ...basePayload, dueDate: '2026-07-15' })).toBeTruthy()
  })

  it('accepts purchase invoices with a discount amount', () => {
    expect(createPurchaseSchema.parse({ ...basePayload, discountAmount: 25 })).toBeTruthy()
  })
})
