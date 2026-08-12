import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath: string) => fs.readFileSync(path.resolve(relativePath), 'utf8')

test('finished goods pages expose CSV tools and low stock warnings', () => {
  const listPage = read('apps/web/pages/inventory/FinishedGoodsPage.tsx')
  const detailPage = read('apps/web/pages/inventory/FinishedGoodDetailPage.tsx')
  const csvActions = read('apps/web/components/inventory/FinishedGoodCsvActions.tsx')

  assert.match(listPage, /FinishedGoodCsvActions/)
  assert.match(listPage, /CSV Tools/)
  assert.match(listPage, /Open/)
  assert.match(detailPage, /Low Stock Warning/)
  assert.match(detailPage, /FinishedGoodCsvActions/)
  assert.match(csvActions, /article code/)
})
