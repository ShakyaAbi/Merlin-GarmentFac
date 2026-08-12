import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, '../../../..', relativePath), 'utf8')

describe('archived inventory history', () => {
  it('exposes soft-delete and deleted-only listing for articles and materials', () => {
    const routes = read('apps/api/src/routes/inventoryRoutes.ts')
    const articleController = read('apps/api/src/controllers/inventory/finishedGoodsController.ts')
    const articleRepository = read('apps/api/src/repositories/inventory/finishedGoodsRepository.ts')
    const materialRepository = read('apps/api/src/repositories/inventory/materialRepository.ts')
    const articlePage = read('apps/web/pages/inventory/FinishedGoodsPage.tsx')
    const materialPage = read('apps/web/pages/inventory/MaterialsPage.tsx')

    expect(routes).toContain("router.delete('/finished-goods/:id'")
    expect(articleController).toContain('export const remove')
    expect(articleRepository).toContain('data: { deletedAt: new Date(), active: false }')
    expect(materialRepository).toContain('deleted?: boolean')
    expect(articlePage).toContain('showDeleted')
    expect(materialPage).toContain('showDeleted')
  })
})
