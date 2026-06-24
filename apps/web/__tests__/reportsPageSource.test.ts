import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(
  path.resolve('apps/web/pages/inventory/OperationsDashboardPage.tsx'),
  'utf8',
)

test('reports page defines production orders before rendering the production section', () => {
  assert.match(source, /const productionOrders = useMemo/)
})

test('reports page applies selected date filters to the refresh request immediately', () => {
  assert.match(source, /loadDashboard\('refresh', \{ from: fromDate, to: toDate \}\)/)
})
