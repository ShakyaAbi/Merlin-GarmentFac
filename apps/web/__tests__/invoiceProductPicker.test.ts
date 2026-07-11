import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const tableSource = fs.readFileSync(
  path.resolve('apps/web/components/sales/InvoiceItemTable.tsx'),
  'utf8',
)
const createSource = fs.readFileSync(
  path.resolve('apps/web/pages/sales/SalesInvoiceCreatePage.tsx'),
  'utf8',
)

test('invoice item table uses a product selector instead of manual product text fields', () => {
  assert.match(tableSource, /products\?: SalesInvoiceProduct\[\]/)
  assert.match(tableSource, /<select/)
  assert.match(tableSource, /Select article/)
  assert.match(tableSource, /applyProductToItem/)
  assert.match(tableSource, /readOnly/)
  assert.doesNotMatch(tableSource, /placeholder="FG-001"/)
  assert.doesNotMatch(tableSource, /placeholder="Product name"/)
})

test('sales invoice create page passes the loaded product catalog into invoice item rows', () => {
  assert.match(createSource, /saleableProducts/)
  assert.match(createSource, /<InvoiceItemTable[\s\S]*products=\{saleableProducts\}/)
})
