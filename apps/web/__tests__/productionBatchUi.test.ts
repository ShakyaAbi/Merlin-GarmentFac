import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(
  path.resolve('apps/web/pages/inventory/ProductionOrdersPage.tsx'),
  'utf8',
)

test('production batch page exposes filtering and batch stats', () => {
  assert.match(source, /InventoryStatGrid/)
  assert.match(source, /statusFilter/)
  assert.match(source, /articleFilter/)
  assert.match(source, /Ready to issue/)
  assert.match(source, /Ready to complete/)
})

test('production batch actions are status aware', () => {
  assert.match(source, /nextActionForBatch/)
  assert.match(source, /Issue Materials/)
  assert.match(source, /if \(action === 'Complete Batch'\) return 'Complete'/)
  assert.match(source, /Completed/)
  assert.doesNotMatch(source, /<Button type="button" size="sm" variant="outline" onClick=\{\(\) => issueOrder\(order\.id\)\}>Issue<\/Button>/)
})

test('completion asks for produced quantity instead of always using planned quantity', () => {
  assert.match(source, /completionBatch/)
  assert.match(source, /quantityProduced/)
  assert.match(source, /Produced quantity/)
  assert.doesNotMatch(source, /completeOrder\(order\.id, Number\(order\.quantityPlanned \?\? 0\)\)/)
})

test('production register uses compact row layout instead of cluttered action stacks', () => {
  assert.match(source, /Batch & article/)
  assert.match(source, /Plan \/ done/)
  assert.match(source, /compactBatchActionLabel/)
  assert.match(source, /min-w-\[720px\]/)
  assert.doesNotMatch(source, /columns=\{\[\{ label: 'Batch' \}, \{ label: 'Article' \}, \{ label: 'Planned' \}, \{ label: 'Produced' \}, \{ label: 'Status' \}, \{ label: 'Created' \}, \{ label: 'Next action' \}\]\}/)
  assert.doesNotMatch(source, />\s*Issue Materials\s*</)
})
