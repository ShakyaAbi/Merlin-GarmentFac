import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const detailSource = fs.readFileSync(
  path.resolve('apps/web/pages/inventory/FinishedGoodDetailPage.tsx'),
  'utf8',
)

test('article edit material bill does not expose manual rate entry', () => {
  assert.doesNotMatch(detailSource, /onChange=\{\(e\) => updateBomItem\(idx, \{ rate: e\.target\.value \}\)\}/)
  assert.match(detailSource, /Material cost/)
  assert.match(detailSource, /readOnly/)
})

test('article edit save computes article cost from material rows', () => {
  assert.match(detailSource, /const materialCost = bomItems\.reduce/)
  assert.match(detailSource, /costPrice: materialCost/)
})
