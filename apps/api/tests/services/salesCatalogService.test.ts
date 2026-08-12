import { isSalesCatalogProduct } from '../../src/services/salesCatalogService'

describe('sales catalog product eligibility', () => {
  test('keeps created articles with BOM data in the sales catalog', () => {
    expect(
      isSalesCatalogProduct({
        productCode: 'ART-00042',
        sku: 'ART-00042',
        active: true,
        bomData: { items: [{ rawMaterialId: 'material-1', consumption: 1 }] },
      }),
    ).toBe(true)
  })

  test('excludes placeholder BOM products and inactive products', () => {
    expect(isSalesCatalogProduct({ productCode: 'BOM-1783616625280', active: true })).toBe(false)
    expect(isSalesCatalogProduct({ productCode: 'ART-00043', active: false })).toBe(false)
  })
})
