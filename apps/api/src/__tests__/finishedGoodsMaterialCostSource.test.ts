import fs from 'node:fs'
import path from 'node:path'

describe('finished goods material cost source', () => {
  const source = fs.readFileSync(
    path.resolve('src/services/inventory/finishedGoodsService.ts'),
    'utf8',
  )

  test('normalizes BOM rates from raw material cost before save', () => {
    expect(source).toContain('normalizeBomCosts')
    expect(source).toContain('rawMaterial.findMany')
    expect(source).toContain('material?.costPrice')
    expect(source).toContain('rate: materialCost')
  })

  test('overwrites article cost price from the material bill total', () => {
    expect(source).toContain('costPrice: normalized.materialCost')
  })
})
