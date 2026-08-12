import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath: string) => fs.readFileSync(path.resolve(relativePath), 'utf8')

test('inventory API exposes PATCH helper for stock adjustment endpoints', () => {
  const source = read('apps/web/services/api.ts')

  assert.match(source, /patch:\s*async <T = any>\(path: string, body\?: any\): Promise<T> =>\s*request<T>\(path, \{ method: "PATCH", body \}\)/s)
})

test('raw material adjust stock uses PATCH', () => {
  const source = read('apps/web/services/rawMaterialApi.ts')

  assert.match(source, /adjustStock:\s*\(id: string, data: StockAdjustPayload\) =>\s*request<any>\(`\/inventory\/materials\/\$\{id\}\/adjust-stock`, \{ method: 'PATCH', body: data \}\)/s)
})

test('material detail routes adjust stock through the raw material api', () => {
  const source = read('apps/web/pages/inventory/MaterialDetail.tsx')

  assert.match(source, /const tx = await rawMaterialApi\.adjustStock\(material\.id, payload\)/)
  assert.doesNotMatch(source, /api\.post\(`\/inventory\/materials\/\$\{material\.id\}\/adjust-stock`/)
})
