import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const registerSource = fs.readFileSync(path.resolve('apps/web/pages/finance/PaymentsPage.tsx'), 'utf8')
const detailSource = fs.readFileSync(path.resolve('apps/web/pages/sales/SalesInvoiceDetailPage.tsx'), 'utf8')

test('sales payment register exposes create, edit, and delete actions', () => {
  assert.match(registerSource, /Record Payment/)
  assert.match(registerSource, /updatePayment/)
  assert.match(registerSource, /deletePayment/)
  assert.match(registerSource, /Edit Sales Payment/)
})

test('sales invoice detail exposes payment edit and delete actions', () => {
  assert.match(detailSource, /updatePayment/)
  assert.match(detailSource, /deletePayment/)
  assert.match(detailSource, /Edit Payment/)
})
