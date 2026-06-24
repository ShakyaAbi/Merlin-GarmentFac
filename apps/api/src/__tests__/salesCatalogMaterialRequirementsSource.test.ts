import { readFileSync } from 'fs'
import { join } from 'path'

const source = readFileSync(join(__dirname, '../services/salesCatalogService.ts'), 'utf8')

describe('sales catalog material requirement payload', () => {
  test('returns normalized material requirements instead of only BOM counts', () => {
    expect(source).toContain('materialRequirements')
    expect(source).toContain('quantityPerUnit')
    expect(source).toContain('materialName')
    expect(source).toContain('consumption')
  })

  test('keeps the compact BOM count for list badges', () => {
    expect(source).toContain('bomItemCount')
  })
})
