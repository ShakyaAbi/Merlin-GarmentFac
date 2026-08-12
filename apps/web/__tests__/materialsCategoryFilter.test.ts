import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath: string) => fs.readFileSync(path.resolve(relativePath), 'utf8')

test('materials page offers a category filter and applies it to the catalog view', () => {
  const source = read('apps/web/pages/inventory/MaterialsPage.tsx')

  assert.match(source, /RawMaterialCategorySelect/)
  assert.match(source, /allowAllOption/)
  assert.match(source, /allLabel="All categories"/)
  assert.match(source, /categoryId/)
  assert.match(source, /filteredMaterials/)
  assert.match(source, /filters=\{\{ search, categoryId \}\}/)
})
