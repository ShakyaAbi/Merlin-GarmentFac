import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const apiSource = readFileSync(join(root, 'services/salesOrderApi.ts'), 'utf8')
const pageSource = readFileSync(join(root, 'pages/sales/SalesOrdersPage.tsx'), 'utf8')

test('sales order product type exposes BOM material requirements', () => {
  assert.match(apiSource, /materialRequirements/)
  assert.match(apiSource, /quantityPerUnit/)
  assert.match(apiSource, /materialName/)
})

test('sales order form renders multiplied required materials for selected finished goods', () => {
  assert.match(pageSource, /Required materials/)
  assert.match(pageSource, /quantityPerUnit/)
  assert.match(pageSource, /lineRequiredMaterials/)
})
