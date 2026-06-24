import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('article material bill rows link to raw material detail pages', () => {
  const source = fs.readFileSync(
    path.resolve('apps/web/pages/inventory/FinishedGoodDetailPage.tsx'),
    'utf8',
  )

  assert.match(source, /import\s+\{[^}]*Link[^}]*\}\s+from 'react-router-dom'/)
  assert.match(source, /to=\{`\/inventory\/materials\/\$\{item\.rawMaterialId\}`\}/)
})
