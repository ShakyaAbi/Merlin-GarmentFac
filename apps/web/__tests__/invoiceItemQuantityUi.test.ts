import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('invoice quantity field keeps enough width to display the value cleanly', () => {
  const source = fs.readFileSync(path.resolve('apps/web/components/sales/InvoiceItemTable.tsx'), 'utf8')

  assert.match(source, /<table className="w-full min-w-\[1040px\] text-left text-sm">/)
  assert.match(source, /<th className="w-28 px-4 py-3 font-semibold text-center">Qty<\/th>/)
  assert.match(source, /<th className="w-36 px-4 py-3 font-semibold text-center">Unit Price<\/th>/)
  assert.match(source, /<th className="w-32 px-4 py-3 font-semibold text-center">Discount<\/th>/)
  assert.match(source, /<th className="w-28 px-4 py-3 font-semibold text-center">VAT 13%<\/th>/)
  assert.match(source, /<th className="w-32 px-4 py-3 font-semibold text-right">Line Total<\/th>/)
  assert.match(source, /placeholder="1"/)
  assert.doesNotMatch(source, /Selected Product/)
  assert.match(source, /className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-medium tabular-nums text-slate-900"/)
  assert.match(source, /className="block text-right font-semibold tabular-nums text-slate-900"/)
})
