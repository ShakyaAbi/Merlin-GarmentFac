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
  assert.match(source, /Profit \/ Loss Over Time/)
})
