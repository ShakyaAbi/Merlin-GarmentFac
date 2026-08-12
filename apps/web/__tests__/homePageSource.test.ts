import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(
  path.resolve('apps/web/pages/HomePage.tsx'),
  'utf8',
)

test('home page loads operations summary data', () => {
  assert.match(source, /api\.get<SummaryPayload>\('\/operations\/summary\?period=month&granularity=month'\)/)
  assert.match(source, /loadHomeSummary/)
})

test('home page presents dashboard sections instead of a placeholder panel', () => {
  assert.match(source, /Current performance/)
  assert.match(source, /Recent activity/)
  assert.match(source, /Quick launch/)
  assert.match(source, /Inventory pressure/)
})

test('home page exposes direct navigation to core workflows', () => {
  assert.match(source, /\/reports/)
  assert.match(source, /\/sales-invoices/)
  assert.match(source, /\/inventory\/production/)
})
