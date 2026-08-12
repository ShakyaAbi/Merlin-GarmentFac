import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath: string) => fs.readFileSync(path.resolve(relativePath), 'utf8')

test('material create flow requires and labels exim code', () => {
  const createPage = read('apps/web/pages/inventory/CreateMaterialPage.tsx')
  const detailPage = read('apps/web/pages/inventory/MaterialDetail.tsx')
  const card = read('apps/web/components/inventory/MaterialCard.tsx')
  const csvActions = read('apps/web/components/inventory/MaterialCsvActions.tsx')

  assert.match(createPage, /EXIM CODE/)
  assert.match(createPage, /Name, exim code, and default unit are required/)
  assert.match(detailPage, /EXIM CODE/)
  assert.match(card, /EXIM CODE/)
  assert.match(csvActions, /including exim code/)
})

test('purchase invoice paper document shows exim code in the line header', () => {
  const invoiceDoc = read('apps/web/components/invoices/InvoicePaperDocument.tsx')
  const helpers = read('apps/web/components/invoices/invoicePaperDocumentHelpers.ts')
  const purchaseDetail = read('apps/web/pages/inventory/PurchaseDetailPage.tsx')

  assert.match(invoiceDoc, /EXIM CODE/)
  assert.match(helpers, /item\.rawMaterial\?\.sku \|\| item\.rawMaterialId/)
  assert.match(purchaseDetail, /EXIM CODE: /)
})
