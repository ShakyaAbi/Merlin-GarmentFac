import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(
  path.resolve('apps/web/pages/inventory/OperationsDashboardPage.tsx'),
  'utf8',
)

test('reports page defines production orders before rendering the production section', () => {
  assert.match(source, /const productionBatches = useMemo/)
})

test('reports page exposes selectable reporting periods and granularity', () => {
  assert.match(source, /periodOptions/)
  assert.match(source, /granularityOptions/)
  assert.match(source, /revenueTabs/)
  assert.match(source, /profitTabs/)
  assert.match(source, /Profit \/ Loss Over Time/)
})

test('reports page shows report context, comparison insights, and filtered totals', () => {
  assert.match(source, /Report insights/)
  assert.match(source, /Report context/)
  assert.match(source, /comparisonSummary/)
  assert.match(source, /Filtered total/)
})

test('reports page styles the graphs as reporting charts', () => {
  assert.match(source, /ChartTooltip/)
  assert.match(source, /ReferenceLine/)
  assert.match(source, /Prev\. Net Profit/)
  assert.match(source, /ComposedChart/)
  assert.match(source, /AnimatePresence/)
  assert.match(source, /motion\.div/)
  assert.match(source, /bg-white p-4 shadow/)
})

test('reports recent records expose edit-capable navigation', () => {
  assert.match(source, /to=\{`\/sales-invoices\/\$\{invoice\.id\}\/edit`\}/)
  assert.match(source, /to=\{`\/inventory\/purchases\/\$\{purchase\.id\}`\}/)
  assert.match(source, /to=\{`\/inventory\/production\/\$\{order\.id\}`\}/)
  assert.match(source, /Edit invoice →/)
  assert.match(source, /Edit batch →/)
})
