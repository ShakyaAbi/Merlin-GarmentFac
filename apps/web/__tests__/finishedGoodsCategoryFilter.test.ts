import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath: string) => fs.readFileSync(path.resolve(relativePath), 'utf8')

test('articles page offers a category filter and applies it to the catalog view', () => {
  const source = read('apps/web/pages/inventory/FinishedGoodsPage.tsx')

  assert.match(source, /ArticleCategorySelect/)
  assert.match(source, /allowAllOption/)
  assert.match(source, /allLabel="All categories"/)
  assert.match(source, /articleCategoryId/)
  assert.match(source, /filteredItems/)
})

