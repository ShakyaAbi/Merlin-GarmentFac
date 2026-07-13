import test from 'node:test'
import fs from 'fs'
import path from 'path'
import assert from 'assert'

const source = fs.readFileSync(path.resolve('apps/web/pages/sales/SalesInvoiceCreatePage.tsx'), 'utf8')

test('keeps line discount input editable while totals clamp the applied amount', () => {
  assert.match(source, /discountAmount: patch\.discountAmount/)
  assert.doesNotMatch(source, /const next = normalizeItem\(\{ \.\.\.item, \.\.\.patch \}\)/)
})
