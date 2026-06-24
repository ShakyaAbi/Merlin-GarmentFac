import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(relativePath), 'utf8')

const navSource = readSource('apps/web/components/layout/layoutNav.ts')
const productionSource = readSource('apps/web/pages/inventory/ProductionOrdersPage.tsx')
const productionDetailSource = readSource('apps/web/pages/inventory/ProductionOrderDetailPage.tsx')
const dashboardSource = readSource('apps/web/pages/inventory/OperationsDashboardPage.tsx')
const articleListSource = readSource('apps/web/pages/inventory/FinishedGoodsPage.tsx')
const articleDetailSource = readSource('apps/web/pages/inventory/FinishedGoodDetailPage.tsx')

test('daily sidebar hides sales orders and labels production as batches', () => {
  assert.doesNotMatch(navSource, /label: 'Sales Orders'/)
  assert.match(navSource, /label: 'Production Batches'/)
})

test('production screens describe stock batch production instead of customer orders', () => {
  assert.match(productionSource, /title="Production Batches"/)
  assert.match(productionSource, /Create Batch/)
  assert.match(productionSource, /Search production batches/)
  assert.doesNotMatch(productionSource, /Create Production Order/)

  assert.match(productionDetailSource, /Production Batch/)
  assert.match(productionDetailSource, /Complete Batch/)
  assert.doesNotMatch(productionDetailSource, /Complete Order/)
})

test('related article and dashboard links use batch wording', () => {
  assert.match(dashboardSource, /Recent Production Batches/)
  assert.match(articleListSource, /Production Batches/)
  assert.match(articleDetailSource, /Production Batches/)
})
